'use client';

// src/app/dashboard/admin/system/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  Activity, Server, Cpu, HardDrive, Database, Wifi,
  Users, AlertTriangle, CheckCircle2, XCircle, Clock,
  Zap, TrendingUp, TrendingDown, RefreshCw, Loader2,
  Globe, ShieldCheck, Gauge, MemoryStick, Network,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAvg: [number, number, number];
    temperature: number;
    model: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    free: number;
    cached: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    free: number;
    readSpeed: number;
    writeSpeed: number;
  };
  network: {
    inSpeed: number;
    outSpeed: number;
    latency: number;
    packetLoss: number;
    activeConnections: number;
  };
  database: {
    status: 'online' | 'degraded' | 'offline';
    connections: number;
    maxConnections: number;
    queryPerSecond: number;
    slowQueries: number;
    size: number;
    responseTime: number;
  };
  server: {
    uptime: number;
    status: 'online' | 'degraded' | 'offline';
    version: string;
    environment: string;
    nodeVersion: string;
    platform: string;
    pid: number;
  };
  api: {
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    successRate: number;
    activeEndpoints: number;
  };
  users: {
    total: number;
    online: number;
    sessions: number;
    newToday: number;
  };
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    timestamp: string;
    source: string;
  }>;
  processes: Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    status: 'running' | 'sleeping' | 'zombie';
  }>;
  cpuHistory: number[];
  memoryHistory: number[];
  networkHistory: Array<{ in: number; out: number }>;
  requestsHistory: number[];
}

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

/** Cercle de progression SVG */
function CircleGauge({
  value,
  max = 100,
  size = 140,
  strokeWidth = 12,
  color = '#3b82f6',
  bgColor = 'rgba(59, 130, 246, 0.1)',
  label,
  sublabel,
  unit = '%',
  icon,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label: string;
  sublabel?: string;
  unit?: string;
  icon?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;

  // Couleur dynamique selon le pourcentage
  const getDynamicColor = () => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 75) return '#f59e0b';
    if (percentage >= 50) return '#eab308';
    return color;
  };

  const finalColor = getDynamicColor();

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: `drop-shadow(0 0 8px ${finalColor}40)` }}
        >
          {/* Cercle de fond */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Cercle de progression */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={finalColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Contenu central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="mb-1" style={{ color: finalColor }}>{icon}</div>}
          <span
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: finalColor }}
          >
            {value.toFixed(0)}
            <span className="text-sm sm:text-base">{unit}</span>
          </span>
          {sublabel && (
            <span className="text-[10px] text-gray-400 mt-0.5">{sublabel}</span>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

/** Sparkline (mini graphique) */
function Sparkline({
  data,
  color = '#3b82f6',
  height = 50,
  width = 200,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = `M0,${height} L${points
    .split(' ')
    .join(' L')} L${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barre de progression horizontale */
function ProgressBar({
  value,
  max = 100,
  color = 'bg-blue-500',
  height = 'h-2',
  showLabel = false,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${color} ${height} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-[10px] text-gray-500 mt-1">
          {value.toFixed(1)} / {max}
        </p>
      )}
    </div>
  );
}

/** Carte de statut */
function StatusCard({
  icon,
  label,
  value,
  sublabel,
  color = 'blue',
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  status?: 'online' | 'degraded' | 'offline';
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/20',
    green: 'from-emerald-500 to-emerald-700 shadow-emerald-500/20',
    red: 'from-red-500 to-red-700 shadow-red-500/20',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/20',
    purple: 'from-purple-500 to-purple-700 shadow-purple-500/20',
    cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-500/20',
  };

  const statusDot = status && {
    online: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    offline: 'bg-red-400',
  }[status];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} text-white shadow-lg`}>
          {icon}
        </div>
        {statusDot && (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              {status}
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
        {label}
      </p>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
        {value}
      </p>
      {sublabel && (
        <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
      )}
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function AdminSystemPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ✅ Charger les métriques
  const loadMetrics = async () => {
    try {
      const res = await fetch('/api/admin-system/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Erreur chargement métriques:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Chargement initial + auto-refresh
  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadMetrics, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // ✅ Loading
  if (loading && !metrics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            Chargement des métriques système...
          </p>
        </div>
      </div>
    );
  }

  // ✅ Fallback si pas de données
  if (!metrics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Impossible de charger les métriques
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Vérifiez que l'API <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/api/admin-system/metrics</code> est bien disponible.
          </p>
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}j ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ============================================
          EN-TÊTE DU DASHBOARD
          ============================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
              Monitoring Système
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                ● LIVE
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-cyan-200/80 mt-0.5">
              Supervision en temps réel — {metrics.server.environment} · Node {metrics.server.nodeVersion}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dernière mise à jour */}
          <div className="hidden sm:block text-right">
            <p className="text-[10px] text-cyan-300/60 uppercase tracking-wider font-bold">
              Dernière MAJ
            </p>
            <p className="text-xs text-white font-mono">
              {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          </div>

          {/* Toggle auto-refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              autoRefresh
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-white/5 text-white/60 border border-white/10'
            }`}
          >
            <RefreshCw size={12} className={autoRefresh ? 'animate-spin-slow' : ''} />
            <span className="hidden sm:inline">{autoRefresh ? 'Auto' : 'Manuel'}</span>
          </button>

          {/* Refresh manuel */}
          <button
            onClick={loadMetrics}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
            title="Actualiser maintenant"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ============================================
          ROW 1 : CERCLES DE MONITORING PRINCIPAUX
          ============================================ */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-5 h-5 text-blue-600" />
          <h2 className="text-base sm:text-lg font-bold text-gray-800">
            Utilisation globale du système
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <CircleGauge
            value={metrics.cpu.usage}
            label="Processeur"
            sublabel={`${metrics.cpu.cores} cœurs`}
            color="#3b82f6"
            icon={<Cpu size={20} />}
          />
          <CircleGauge
            value={metrics.memory.percentage}
            label="Mémoire RAM"
            sublabel={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
            color="#8b5cf6"
            icon={<MemoryStick size={20} />}
          />
          <CircleGauge
            value={metrics.disk.percentage}
            label="Disque"
            sublabel={`${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)}`}
            color="#10b981"
            icon={<HardDrive size={20} />}
          />
          <CircleGauge
            value={metrics.api.successRate}
            label="Taux de succès API"
            sublabel={`${metrics.api.totalRequests.toLocaleString()} requêtes`}
            color="#06b6d4"
            icon={<Network size={20} />}
          />
        </div>
      </div>

      {/* ============================================
          ROW 2 : STATUS CARDS
          ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatusCard
          icon={<Server size={20} />}
          label="Serveur"
          value={metrics.server.status === 'online' ? 'En ligne' : metrics.server.status}
          sublabel={`Uptime: ${formatUptime(metrics.server.uptime)}`}
          color="green"
          status={metrics.server.status}
        />
        <StatusCard
          icon={<Database size={20} />}
          label="Base de données"
          value={`${metrics.database.connections} / ${metrics.database.maxConnections}`}
          sublabel={`${metrics.database.queryPerSecond} req/s · ${metrics.database.responseTime}ms`}
          color={metrics.database.status === 'online' ? 'blue' : 'amber'}
          status={metrics.database.status}
        />
        <StatusCard
          icon={<Users size={20} />}
          label="Utilisateurs actifs"
          value={metrics.users.online}
          sublabel={`${metrics.users.sessions} sessions · ${metrics.users.total} total`}
          color="purple"
        />
        <StatusCard
          icon={<AlertTriangle size={20} />}
          label="Alertes actives"
          value={metrics.alerts.filter((a) => a.type === 'error').length}
          sublabel={`${metrics.alerts.filter((a) => a.type === 'warning').length} avertissements`}
          color={
            metrics.alerts.filter((a) => a.type === 'error').length > 0 ? 'red' : 'green'
          }
        />
      </div>

      {/* ============================================
          ROW 3 : DIAGRAMMES DE PROPAGATION (HISTORIQUES)
          ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* CPU History */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Cpu className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Processeur</h3>
                <p className="text-[10px] text-gray-400">
                  Charge moyenne: {metrics.cpu.loadAvg.join(' / ')}
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {metrics.cpu.usage.toFixed(0)}%
            </span>
          </div>
          <Sparkline
            data={metrics.cpuHistory}
            color="#3b82f6"
            height={60}
            width={300}
          />
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
            <span>Température: {metrics.cpu.temperature}°C</span>
            <span className="truncate max-w-[150px]">{metrics.cpu.model}</span>
          </div>
        </div>

        {/* Memory History */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-100">
                <MemoryStick className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Mémoire</h3>
                <p className="text-[10px] text-gray-400">
                  Libre: {formatBytes(metrics.memory.free)}
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-purple-600">
              {metrics.memory.percentage.toFixed(0)}%
            </span>
          </div>
          <Sparkline
            data={metrics.memoryHistory}
            color="#8b5cf6"
            height={60}
            width={300}
          />
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
            <span>Cache: {formatBytes(metrics.memory.cached)}</span>
            <span>Utilisé: {formatBytes(metrics.memory.used)}</span>
          </div>
        </div>

        {/* Network Traffic */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-100">
                <Wifi className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">Réseau</h3>
                <p className="text-[10px] text-gray-400">
                  Latence: {metrics.network.latency}ms
                </p>
              </div>
            </div>
            <span className="text-lg font-bold text-cyan-600">
              {metrics.network.activeConnections}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 flex items-center gap-1">
                <TrendingDown size={10} className="text-emerald-500" />
                Entrant
              </span>
              <span className="font-bold text-emerald-600">
                {metrics.network.inSpeed.toFixed(1)} KB/s
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 flex items-center gap-1">
                <TrendingUp size={10} className="text-blue-500" />
                Sortant
              </span>
              <span className="font-bold text-blue-600">
                {metrics.network.outSpeed.toFixed(1)} KB/s
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500">Perte de paquets</span>
              <span className={`font-bold ${metrics.network.packetLoss > 1 ? 'text-red-600' : 'text-gray-700'}`}>
                {metrics.network.packetLoss}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          ROW 4 : DÉTAILS + ALERTES
          ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Détails serveur */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-gray-800">Informations serveur</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Version</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {metrics.server.version}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Environnement</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">
                {metrics.server.environment}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Node.js</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                v{metrics.server.nodeVersion}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Plateforme</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {metrics.server.platform}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Uptime</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {formatUptime(metrics.server.uptime)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] text-gray-500 uppercase font-bold">PID</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 font-mono">
                {metrics.server.pid}
              </p>
            </div>
          </div>

          {/* Barres détaillées */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-gray-700">CPU</span>
                <span className="text-gray-500">{metrics.cpu.usage.toFixed(1)}%</span>
              </div>
              <ProgressBar
                value={metrics.cpu.usage}
                color={
                  metrics.cpu.usage > 85
                    ? 'bg-red-500'
                    : metrics.cpu.usage > 65
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-gray-700">RAM</span>
                <span className="text-gray-500">{metrics.memory.percentage.toFixed(1)}%</span>
              </div>
              <ProgressBar
                value={metrics.memory.percentage}
                color={
                  metrics.memory.percentage > 85
                    ? 'bg-red-500'
                    : metrics.memory.percentage > 65
                    ? 'bg-amber-500'
                    : 'bg-purple-500'
                }
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-gray-700">Disque</span>
                <span className="text-gray-500">{metrics.disk.percentage.toFixed(1)}%</span>
              </div>
              <ProgressBar
                value={metrics.disk.percentage}
                color={
                  metrics.disk.percentage > 85
                    ? 'bg-red-500'
                    : metrics.disk.percentage > 65
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }
              />
            </div>
          </div>
        </div>

        {/* Alertes récentes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-800">
                Alertes récentes
              </h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
              {metrics.alerts.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {metrics.alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  Aucune alerte active
                </p>
              </div>
            ) : (
              metrics.alerts.map((alert) => {
                const config = {
                  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <XCircle size={16} className="text-red-500" /> },
                  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <AlertTriangle size={16} className="text-amber-500" /> },
                  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: <Activity size={16} className="text-blue-500" /> },
                  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
                }[alert.type];

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl ${config.bg} border ${config.border} flex items-start gap-2.5`}
                  >
                    <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${config.text}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {alert.timestamp}
                        </span>
                        <span className="text-[10px] text-gray-400">•</span>
                        <span className="text-[10px] text-gray-500 font-bold">
                          {alert.source}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ============================================
          ROW 5 : PROCESSUS ACTIFS
          ============================================ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="text-base font-bold text-gray-800">
            Processus actifs
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
            {metrics.processes.length}
          </span>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-bold">PID</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-bold">Nom</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-bold">CPU</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-bold">Mémoire</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-gray-400 font-bold">Statut</th>
              </tr>
            </thead>
            <tbody>
              {metrics.processes.map((proc) => (
                <tr key={proc.pid} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="py-2.5 px-3 text-xs font-mono text-gray-500">
                    {proc.pid}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-semibold text-gray-800">
                    {proc.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16">
                        <ProgressBar
                          value={proc.cpu}
                          color={proc.cpu > 50 ? 'bg-red-500' : 'bg-blue-500'}
                          height="h-1.5"
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">
                        {proc.cpu.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-700">
                    {formatBytes(proc.memory)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        proc.status === 'running'
                          ? 'bg-emerald-100 text-emerald-700'
                          : proc.status === 'sleeping'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {proc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}