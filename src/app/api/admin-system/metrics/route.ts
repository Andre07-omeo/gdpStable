// src/app/api/admin-system/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '@/lib/db';
import { checkAdminAccess } from '@/lib/auth/checkAdminAccess';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================
// CACHE EN MÉMOIRE POUR LES HISTORIQUES
// ============================================
interface HistoryPoint {
  timestamp: number;
  value: number;
}

const history = {
  cpu: [] as HistoryPoint[],
  memory: [] as HistoryPoint[],
  disk: [] as HistoryPoint[],
  networkIn: [] as HistoryPoint[],
  networkOut: [] as HistoryPoint[],
  requests: [] as HistoryPoint[],
  responseTime: [] as HistoryPoint[],
};

let prevCounters: {
  timestamp: number;
  queries: number;
  bytesIn: number;
  bytesOut: number;
  netIn: number;
  netOut: number;
  connections: number;
} | null = null;

const MAX_HISTORY = 60;

function pushHistory(arr: HistoryPoint[], value: number) {
  arr.push({ timestamp: Date.now(), value });
  if (arr.length > MAX_HISTORY) arr.shift();
}

// ============================================
// LECTURE CPU
// ============================================
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  });

  const usage = 100 - ~~((100 * totalIdle) / totalTick);
  return {
    usage: Math.max(0, Math.min(100, usage)),
    cores: cpus.length,
    model: cpus[0]?.model || 'Unknown',
    loadAvg: os.loadavg().map((n) => Number(n.toFixed(2))),
  };
}

// ============================================
// LECTURE DISQUE
// ============================================
async function getDiskUsage() {
  try {
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
        const lines = stdout.trim().split('\n').slice(1);
        let total = 0;
        let free = 0;
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            free += parseInt(parts[1] || '0', 10);
            total += parseInt(parts[2] || '0', 10);
          }
        }
        const used = total - free;
        return {
          used, total, free,
          percentage: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
          filesystem: 'NTFS',
        };
      } catch {}
    } else {
      const { stdout } = await execAsync("df -k / | tail -1 | awk '{print $2, $3, $4}'");
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 3) {
        const total = parseInt(parts[0], 10) * 1024;
        const used = parseInt(parts[1], 10) * 1024;
        const free = parseInt(parts[2], 10) * 1024;
        return {
          used, total, free,
          percentage: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
          filesystem: process.platform === 'darwin' ? 'APFS' : 'ext4',
        };
      }
    }

    if (fs.statfsSync) {
      const stats = fs.statfsSync('/');
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      return {
        used, total, free,
        percentage: total > 0 ? Number(((used / total) * 100).toFixed(1)) : 0,
        filesystem: 'unknown',
      };
    }
  } catch (err) {
    console.error('Erreur disk:', err);
  }
  return { used: 0, total: 0, free: 0, percentage: 0, filesystem: 'unknown' };
}

// ============================================
// RÉSEAU
// ============================================
function readProcNetDev() {
  try {
    if (process.platform !== 'linux') return { bytesIn: 0, bytesOut: 0 };
    const content = fs.readFileSync('/proc/net/dev', 'utf-8');
    const lines = content.split('\n').slice(2);
    let bytesIn = 0;
    let bytesOut = 0;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 10 && parts[0] !== 'lo:') {
        bytesIn += parseInt(parts[1] || '0', 10);
        bytesOut += parseInt(parts[9] || '0', 10);
      }
    }
    return { bytesIn, bytesOut };
  } catch {
    return { bytesIn: 0, bytesOut: 0 };
  }
}

// ============================================
// PROCESSUS
// ============================================
async function getProcesses() {
  try {
    const cmd = process.platform === 'win32'
      ? 'tasklist /FO CSV /NH'
      : 'ps aux --sort=-%cpu | head -20';

    const { stdout } = await execAsync(cmd);
    const lines = stdout.trim().split('\n');

    if (process.platform === 'win32') {
      return lines.slice(0, 15).map((line) => {
        const parts = line.replace(/"/g, '').split(',');
        return {
          pid: parseInt(parts[1] || '0', 10),
          name: parts[0] || 'unknown',
          cpu: 0,
          memory: parseInt(parts[4]?.replace(/[^\d]/g, '') || '0', 10) * 1024,
          status: 'running' as const,
          user: 'system',
        };
      });
    }

    return lines
      .slice(1, 15)
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) return null;
        return {
          pid: parseInt(parts[1] || '0', 10),
          user: parts[0] || 'unknown',
          cpu: parseFloat(parts[2] || '0'),
          memory: parseInt(parts[5] || '0', 10) * 1024,
          name: parts.slice(10).join(' ').split('/').pop()?.slice(0, 30) || 'unknown',
          status: parts[7]?.includes('R')
            ? ('running' as const)
            : parts[7]?.includes('Z')
            ? ('zombie' as const)
            : ('sleeping' as const),
        };
      })
      .filter((p) => p !== null) as Array<{
      pid: number; name: string; cpu: number; memory: number;
      status: 'running' | 'sleeping' | 'zombie'; user: string;
    }>;
  } catch (err) {
    console.error('Erreur processus:', err);
    return [];
  }
}

// ============================================
// DÉPLOIEMENT INFO
// ============================================
async function getDeploymentInfo() {
  const info = {
    branch: 'unknown',
    commit: 'unknown',
    commitMessage: 'unknown',
    lastDeploy: 'unknown',
    nodeEnv: process.env.NODE_ENV || 'development',
    buildId: process.env.BUILD_ID || 'dev',
    appVersion: process.env.APP_VERSION || '1.0.0',
    deployStatus: 'stable' as 'stable' | 'deploying' | 'failed',
  };

  try {
    if (fs.existsSync(path.join(process.cwd(), '.git'))) {
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
      const { stdout: commit } = await execAsync('git rev-parse --short HEAD');
      const { stdout: msg } = await execAsync('git log -1 --pretty=%B');
      const { stdout: date } = await execAsync('git log -1 --format=%cd --date=relative');

      info.branch = branch.trim();
      info.commit = commit.trim();
      info.commitMessage = msg.trim().split('\n')[0];
      info.lastDeploy = date.trim();
    }
  } catch {}

  return info;
}

// ============================================
// TEMPÉRATURE CPU
// ============================================
function getCpuTemperature(): number {
  try {
    if (process.platform !== 'linux') return 0;
    const paths = [
      '/sys/class/thermal/thermal_zone0/temp',
      '/sys/class/hwmon/hwmon0/temp1_input',
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const temp = parseInt(fs.readFileSync(p, 'utf-8').trim(), 10);
        return temp > 1000 ? temp / 1000 : temp;
      }
    }
  } catch {}
  return 0;
}

// ============================================
// ROUTE GET
// ============================================
export async function GET(request: NextRequest) {
  // ✅ AJOUT : vérification accès ADMIN ou SUPER_ADMIN
  const auth = checkAdminAccess(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  try {
    const now = Date.now();

    const cpu = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryPercentage = (usedMem / totalMem) * 100;
    const uptime = os.uptime();
    const temperature = getCpuTemperature();

    const disk = await getDiskUsage();

    const netStats = readProcNetDev();
    let networkInSpeed = 0;
    let networkOutSpeed = 0;

    if (prevCounters && prevCounters.netIn > 0) {
      const deltaTime = (now - prevCounters.timestamp) / 1000;
      if (deltaTime > 0) {
        networkInSpeed = Math.max(0, (netStats.bytesIn - prevCounters.netIn) / deltaTime / 1024);
        networkOutSpeed = Math.max(0, (netStats.bytesOut - prevCounters.netOut) / deltaTime / 1024);
      }
    }

    let dbStatus: 'online' | 'degraded' | 'offline' = 'online';
    let dbConnections = 0;
    let dbMaxConnections = 100;
    let dbQueryPerSecond = 0;
    let dbSlowQueries = 0;
    let dbSize = 0;
    let dbResponseTime = 0;
    let dbTotalQueries = 0;
    let dbTables = 0;
    let dbUptime = 0;

    try {
      const start = Date.now();
      const [connRows]: any = await db.query('SHOW STATUS LIKE "Threads_connected"');
      dbConnections = parseInt(connRows?.[0]?.Value || '0', 10);

      const [maxRows]: any = await db.query('SHOW VARIABLES LIKE "max_connections"');
      dbMaxConnections = parseInt(maxRows?.[0]?.Value || '100', 10);

      const [qRows]: any = await db.query('SHOW STATUS LIKE "Queries"');
      dbTotalQueries = parseInt(qRows?.[0]?.Value || '0', 10);

      const [slowRows]: any = await db.query('SHOW STATUS LIKE "Slow_queries"');
      dbSlowQueries = parseInt(slowRows?.[0]?.Value || '0', 10);

      const [upRows]: any = await db.query('SHOW STATUS LIKE "Uptime"');
      dbUptime = parseInt(upRows?.[0]?.Value || '0', 10);

      const [tableRows]: any = await db.query(`
        SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE table_schema = DATABASE()
      `);
      dbTables = parseInt(tableRows?.[0]?.count || '0', 10);

      const [sizeRows]: any = await db.query(`
        SELECT SUM(data_length + index_length) AS size FROM information_schema.TABLES WHERE table_schema = DATABASE()
      `);
      dbSize = parseInt(sizeRows?.[0]?.size || '0', 10);

      dbResponseTime = Date.now() - start;

      if (prevCounters && prevCounters.queries > 0) {
        const deltaTime = (now - prevCounters.timestamp) / 1000;
        const deltaQueries = dbTotalQueries - prevCounters.queries;
        if (deltaTime > 0) {
          dbQueryPerSecond = Math.max(0, Math.round(deltaQueries / deltaTime));
        }
      }

      if (dbConnections > dbMaxConnections * 0.8) dbStatus = 'degraded';
    } catch (err) {
      dbStatus = 'offline';
    }

    let totalUsers = 0;
    let onlineUsers = 0;
    let onlineSessions = 0;
    let newToday = 0;
    const usersByRole: Record<string, number> = {};

    try {
      const [userRows]: any = await db.query('SELECT COUNT(*) AS total FROM user');
      totalUsers = parseInt(userRows?.[0]?.total || '0', 10);

      try {
        const [onlineRows]: any = await db.query(`
          SELECT COUNT(DISTINCT user_id) AS online 
          FROM user_login_history 
          WHERE login_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
        `);
        onlineUsers = parseInt(onlineRows?.[0]?.online || '0', 10);
      } catch { onlineUsers = 0; }

      try {
        const [sessRows]: any = await db.query(`
          SELECT COUNT(*) AS sessions 
          FROM user_login_history 
          WHERE login_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE) AND logout_at IS NULL
        `);
        onlineSessions = parseInt(sessRows?.[0]?.sessions || '0', 10);
      } catch {}

      try {
        const [newRows]: any = await db.query(`
          SELECT COUNT(*) AS total FROM user WHERE DATE(created_at) = CURDATE()
        `);
        newToday = parseInt(newRows?.[0]?.total || '0', 10);
      } catch {}

      try {
        const [roleRows]: any = await db.query(`
          SELECT p.code as profil, COUNT(*) AS count 
          FROM user u 
          LEFT JOIN profil p ON u.id_profil = p.id_profil 
          GROUP BY p.code
        `);
        roleRows.forEach((r: any) => {
          usersByRole[r.profil || 'INCONNU'] = parseInt(r.count, 10);
        });
      } catch {}
    } catch (err) {
      console.error('Erreur users:', err);
    }

    const processes = await getProcesses();
    const deployment = await getDeploymentInfo();

    pushHistory(history.cpu, cpu.usage);
    pushHistory(history.memory, memoryPercentage);
    pushHistory(history.disk, disk.percentage);
    pushHistory(history.networkIn, networkInSpeed);
    pushHistory(history.networkOut, networkOutSpeed);
    pushHistory(history.requests, dbQueryPerSecond);

    prevCounters = {
      timestamp: now,
      queries: dbTotalQueries,
      bytesIn: netStats.bytesIn,
      bytesOut: netStats.bytesOut,
      netIn: netStats.bytesIn,
      netOut: netStats.bytesOut,
      connections: dbConnections,
    };

    const alerts: Array<{
      id: string; type: 'error' | 'warning' | 'info' | 'success';
      message: string; timestamp: string; source: string;
    }> = [];

    if (cpu.usage > 85) {
      alerts.push({
        id: 'cpu-high', type: 'warning',
        message: `Utilisation CPU élevée : ${cpu.usage.toFixed(1)}%`,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'CPUMonitor',
      });
    }
    if (memoryPercentage > 85) {
      alerts.push({
        id: 'mem-high', type: 'warning',
        message: `Mémoire élevée : ${memoryPercentage.toFixed(1)}%`,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'MemoryMonitor',
      });
    }
    if (disk.percentage > 85) {
      alerts.push({
        id: 'disk-high', type: 'error',
        message: `Espace disque critique : ${disk.percentage.toFixed(1)}%`,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'DiskMonitor',
      });
    }
    if (dbStatus === 'offline') {
      alerts.push({
        id: 'db-offline', type: 'error',
        message: 'Base de données inaccessible',
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'DatabaseService',
      });
    }
    if (dbStatus === 'degraded') {
      alerts.push({
        id: 'db-degraded', type: 'warning',
        message: `Connexions DB élevées : ${dbConnections}/${dbMaxConnections}`,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'DatabaseService',
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        id: 'all-ok', type: 'success',
        message: 'Tous les services sont opérationnels',
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        source: 'SystemMonitor',
      });
    }

    return NextResponse.json({
      cpu: {
        usage: Number(cpu.usage.toFixed(1)),
        cores: cpu.cores,
        loadAvg: cpu.loadAvg,
        temperature: Number(temperature.toFixed(1)),
        model: cpu.model,
      },
      memory: {
        used: usedMem, total: totalMem,
        percentage: Number(memoryPercentage.toFixed(1)),
        free: freeMem, cached: Math.floor(usedMem * 0.3),
      },
      disk: {
        used: disk.used, total: disk.total,
        percentage: disk.percentage, free: disk.free,
        readSpeed: 0, writeSpeed: 0, filesystem: disk.filesystem,
      },
      network: {
        inSpeed: Number(networkInSpeed.toFixed(2)),
        outSpeed: Number(networkOutSpeed.toFixed(2)),
        latency: 0, packetLoss: 0,
        activeConnections: dbConnections,
        totalBytesIn: netStats.bytesIn,
        totalBytesOut: netStats.bytesOut,
      },
      database: {
        status: dbStatus, connections: dbConnections,
        maxConnections: dbMaxConnections,
        queryPerSecond: dbQueryPerSecond,
        slowQueries: dbSlowQueries, size: dbSize,
        responseTime: dbResponseTime, totalQueries: dbTotalQueries,
        tables: dbTables, uptime: dbUptime,
      },
      server: {
        uptime,
        status: cpu.usage > 90 || memoryPercentage > 90 || disk.percentage > 95
          ? 'degraded' : 'online',
        version: deployment.appVersion,
        environment: deployment.nodeEnv,
        nodeVersion: process.version.replace('v', ''),
        platform: `${os.platform()} ${os.arch()}`,
        pid: process.pid, hostname: os.hostname(),
        arch: os.arch(), endianness: os.endianness(),
        cpuCount: cpu.cores, totalMemory: totalMem, freeMemory: freeMem,
      },
      api: {
        totalRequests: dbTotalQueries,
        avgResponseTime: dbResponseTime,
        errorRate: 0, successRate: 100, activeEndpoints: 0,
      },
      users: {
        total: totalUsers, online: onlineUsers,
        sessions: onlineSessions, newToday,
        byRole: usersByRole,
      },
      deployment: {
        branch: deployment.branch, commit: deployment.commit,
        commitMessage: deployment.commitMessage,
        lastDeploy: deployment.lastDeploy,
        status: deployment.deployStatus, buildId: deployment.buildId,
      },
      processes, alerts,
      cpuHistory: history.cpu.map((p) => p.value),
      memoryHistory: history.memory.map((p) => p.value),
      diskHistory: history.disk.map((p) => p.value),
      networkInHistory: history.networkIn.map((p) => p.value),
      networkOutHistory: history.networkOut.map((p) => p.value),
      requestsHistory: history.requests.map((p) => p.value),
    });
  } catch (error) {
    console.error('❌ Erreur metrics:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des métriques', details: String(error) },
      { status: 500 }
    );
  }
}