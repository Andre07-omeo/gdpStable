'use client';

// src/app/dashboard/admin/system/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  Activity, Server, Cpu, HardDrive, Database, Wifi,
  Users, AlertTriangle, CheckCircle2, XCircle,
  Zap, TrendingUp, TrendingDown, RefreshCw, Loader2,
  ShieldCheck, Gauge, MemoryStick, Network,
  GitBranch, Rocket, Clock, Terminal, CircleDot, Radio,
  Play, Square, RotateCw, Lock, Unlock,
  Mail, Key, Link2, ExternalLink, Copy,
  Boxes, History, CheckCheck, XOctagon, Timer, Package,
  PackageCheck, Globe,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface SystemMetrics {
  cpu: { usage: number; cores: number; loadAvg: number[]; temperature: number; model: string };
  memory: { used: number; total: number; percentage: number; free: number; cached: number };
  disk: { used: number; total: number; percentage: number; free: number; readSpeed: number; writeSpeed: number; filesystem: string };
  network: { inSpeed: number; outSpeed: number; latency: number; packetLoss: number; activeConnections: number; totalBytesIn: number; totalBytesOut: number };
  database: { status: 'online' | 'degraded' | 'offline'; connections: number; maxConnections: number; queryPerSecond: number; slowQueries: number; size: number; responseTime: number; totalQueries: number; tables: number; uptime: number };
  server: { uptime: number; status: 'online' | 'degraded' | 'offline'; version: string; environment: string; nodeVersion: string; platform: string; pid: number; hostname: string; arch: string; endianness: string; cpuCount: number; totalMemory: number; freeMemory: number };
  api: { totalRequests: number; avgResponseTime: number; errorRate: number; successRate: number; activeEndpoints: number };
  users: { total: number; online: number; sessions: number; newToday: number; byRole: Record<string, number> };
  deployment: { branch: string; commit: string; commitMessage: string; lastDeploy: string; status: string; buildId: string };
  processes: Array<{ pid: number; name: string; cpu: number; memory: number; status: 'running' | 'sleeping' | 'zombie'; user: string }>;
  alerts: Array<{ id: string; type: 'error' | 'warning' | 'info' | 'success'; message: string; timestamp: string; source: string }>;
  cpuHistory: number[];
  memoryHistory: number[];
  diskHistory: number[];
  networkInHistory: number[];
  networkOutHistory: number[];
  requestsHistory: number[];
}

interface Deployment {
  id: number;
  version: string;
  build_number: number;
  branch: string;
  commit_hash: string;
  commit_message: string;
  commit_author: string;
  environment: 'development' | 'staging' | 'production';
  status: 'pending' | 'approved' | 'deploying' | 'deployed' | 'failed' | 'rolled_back';
  approved_by: string | null;
  approved_at: string | null;
  deployed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

interface HostedApp {
  id: number;
  name: string;
  slug: string;
  description: string;
  domain: string;
  port: number;
  framework: string;
  language: string;
  status: 'running' | 'stopped' | 'building' | 'crashed' | 'maintenance';
  current_version: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  uptime_seconds: number;
  last_deploy: string;
  git_repo: string;
  git_branch: string;
  ssl_enabled: boolean;
  auto_deploy: boolean;
  coolify_app_id: string;
  isAlive?: boolean;
  realStatus?: string;
}

interface ServerAccess {
  id: number;
  service_type: 'ssh' | 'coolify' | 'hosting_panel' | 'database' | 'cdn' | 'dns';
  service_name: string;
  url: string;
  host: string;
  port: number;
  username: string;
  email: string;
  provider: string;
  notes: string;
  admin_email: string;
}

// ============================================
// HELPERS
// ============================================
const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatUptime = (seconds: number): string => {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (days > 0) return `${days}j ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getStatusColor = (percentage: number) => {
  if (percentage >= 90) return { stroke: '#ef4444', text: 'text-red-500', bg: 'bg-red-500' };
  if (percentage >= 75) return { stroke: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-500' };
  if (percentage >= 50) return { stroke: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-500' };
  return { stroke: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500' };
};

// ============================================
// COMPOSANTS VISUELS
// ============================================

function CircleGauge({
  value, max = 100, size = 160, strokeWidth = 14,
  label, sublabel, unit = '%', icon, accentColor,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  unit?: string;
  icon?: React.ReactNode;
  accentColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;
  const status = getStatusColor(percentage);
  const color = accentColor || status.stroke;

  return (
    <div className="group flex flex-col items-center justify-center">
      <div className="relative transition-transform duration-500 group-hover:scale-105" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90" style={{ filter: `drop-shadow(0 0 12px ${color}60)` }}>
          <defs>
            <linearGradient id={`grad-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`${color}15`} strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={`url(#grad-${label.replace(/\s/g, '')})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="mb-1.5 transition-transform duration-500 group-hover:scale-110" style={{ color }}>{icon}</div>}
          <span className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color }}>
            {value.toFixed(0)}
            <span className="text-base sm:text-lg font-bold">{unit}</span>
          </span>
          {sublabel && <span className="text-[10px] text-gray-500 mt-1 font-medium text-center max-w-[90%] truncate">{sublabel}</span>}
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function Sparkline({
  data, color = '#3b82f6', height = 70, width = 300, showArea = true,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  showArea?: boolean;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-[10px] text-gray-400 italic">Collecte en cours...</span>
      </div>
    );
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const id = `spark-${color.replace('#', '')}`;

  const points = data.map((val, i) => `${i * step},${height - ((val - min) / range) * (height - 8) - 4}`).join(' ');
  const areaPath = `M0,${height} L${points.split(' ').join(' L')} L${width},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={areaPath} fill={`url(#${id})`} />}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={(data.length - 1) * step}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 8) - 4}
        r="4"
        fill={color}
        className="animate-pulse"
      />
    </svg>
  );
}

function ProgressBar({
  value, max = 100, color = 'bg-blue-500', height = 'h-2.5',
}: {
  value: number;
  max?: number;
  color?: string;
  height?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${height} shadow-inner`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  );
}

function StatusCard({
  icon, label, value, sublabel, color = 'blue', status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan' | 'indigo';
  status?: 'online' | 'degraded' | 'offline';
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    green: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
    red: 'from-red-500 to-red-700 shadow-red-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    purple: 'from-purple-500 to-purple-700 shadow-purple-500/30',
    cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-500/30',
    indigo: 'from-indigo-500 to-indigo-700 shadow-indigo-500/30',
  };

  const statusDot = status && {
    online: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    offline: 'bg-red-400',
  }[status];

  return (
    <div className="group bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colorMap[color]} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        {statusDot && (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-500 uppercase">{status}</span>
          </div>
        )}
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{label}</p>
      <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{value}</p>
      {sublabel && <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function DeploymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Clock size={11} />, label: 'En attente' },
    approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCheck size={11} />, label: 'Approuvé' },
    deploying: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: <Loader2 size={11} className="animate-spin" />, label: 'Déploiement' },
    deployed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircle2 size={11} />, label: 'Déployé' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={11} />, label: 'Échoué' },
    rolled_back: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <RotateCw size={11} />, label: 'Rollback' },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function AccessCard({ access }: { access: ServerAccess }) {
  const icons: Record<string, React.ReactNode> = {
    ssh: <Terminal size={20} />,
    coolify: <Rocket size={20} />,
    hosting_panel: <Server size={20} />,
    database: <Database size={20} />,
    cdn: <Globe size={20} />,
    dns: <Link2 size={20} />,
  };
  const colors: Record<string, string> = {
    ssh: 'from-slate-600 to-slate-800',
    coolify: 'from-purple-500 to-purple-700',
    hosting_panel: 'from-blue-500 to-blue-700',
    database: 'from-emerald-500 to-emerald-700',
    cdn: 'from-orange-500 to-orange-700',
    dns: 'from-cyan-500 to-cyan-700',
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors[access.service_type]} text-white shadow-lg`}>
          {icons[access.service_type]}
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold uppercase">
          {access.service_type}
        </span>
      </div>
      <h4 className="text-sm font-bold text-gray-800 mb-2">{access.service_name}</h4>

      <div className="space-y-1.5 text-xs">
        {access.url && (
          <div className="flex items-center gap-1.5">
            <ExternalLink size={11} className="text-gray-400 flex-shrink-0" />
            <a href={access.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
              {access.url}
            </a>
          </div>
        )}
        {access.host && (
          <div className="flex items-center gap-1.5">
            <Server size={11} className="text-gray-400 flex-shrink-0" />
            <code className="text-gray-700 font-mono truncate">{access.host}:{access.port}</code>
            <button onClick={() => copyToClipboard(`${access.host}:${access.port}`)} className="ml-auto p-1 hover:bg-gray-100 rounded" title="Copier">
              <Copy size={10} className="text-gray-400" />
            </button>
          </div>
        )}
        {access.username && (
          <div className="flex items-center gap-1.5">
            <Users size={11} className="text-gray-400 flex-shrink-0" />
            <code className="text-gray-700 font-mono">{access.username}</code>
          </div>
        )}
        {access.email && (
          <div className="flex items-center gap-1.5">
            <Mail size={11} className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-600 truncate">{access.email}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
          <ShieldCheck size={11} className="text-emerald-500 flex-shrink-0" />
          <span className="text-[10px] text-gray-500">Admin: </span>
          <span className="text-[10px] font-bold text-gray-700 truncate">{access.admin_email}</span>
        </div>
      </div>

      {access.notes && (
        <p className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-500 italic">{access.notes}</p>
      )}
    </div>
  );
}

// ============================================
// PAGE PRINCIPALE
// ============================================
export default function AdminSystemPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deployStats, setDeployStats] = useState<any>(null);
  const [apps, setApps] = useState<HostedApp[]>([]);
  const [appsStats, setAppsStats] = useState<any>(null);
  const [serverAccess, setServerAccess] = useState<ServerAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'deployments' | 'applications' | 'infrastructure'>('monitoring');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  const SUPER_ADMIN_EMAIL = 'omeongaandre2@gmail.com';

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUserEmail(data.email || '');
          setIsSuperAdmin(data.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
        }
      })
      .catch(() => {});
  }, []);

  const loadAll = async () => {
    try {
      const headers = { 'x-user-email': userEmail || SUPER_ADMIN_EMAIL };
      const [metricsRes, deployRes, appsRes, accessRes] = await Promise.all([
        fetch('/api/admin-system/metrics', { cache: 'no-store', headers }),
        fetch('/api/admin-system/deployments', { cache: 'no-store', headers }),
        fetch('/api/admin-system/applications', { cache: 'no-store', headers }),
        fetch('/api/admin-system/server-access', { cache: 'no-store', headers }),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (deployRes.ok) {
        const d = await deployRes.json();
        setDeployments(d.deployments || []);
        setDeployStats(d.stats || null);
      }
      if (appsRes.ok) {
        const a = await appsRes.json();
        setApps(a.applications || []);
        setAppsStats(a.stats || null);
      }
      if (accessRes.ok) {
        const s = await accessRes.json();
        setServerAccess(s.access || []);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [userEmail]);

  useEffect(() => {
    if (!autoRefresh) return;
    const i = setInterval(loadAll, 5000);
    return () => clearInterval(i);
  }, [autoRefresh, userEmail]);

  const handleDeployAction = async (id: number, action: string, reason?: string) => {
    try {
      const res = await fetch('/api/admin-system/deployments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail || SUPER_ADMIN_EMAIL },
        body: JSON.stringify({ id, action, reason }),
      });
      if (res.ok) await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppAction = async (id: number, action: string) => {
    try {
      const res = await fetch('/api/admin-system/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-email': userEmail || SUPER_ADMIN_EMAIL },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) await loadAll();
    } catch (err) {
      console.error(err);
    }
  };

  // ============ LOADING ============
  if (loading && !metrics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Initialisation du monitoring...</p>
        </div>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="space-y-4 sm:space-y-5">

      {/* EN-TÊTE + ONGLETS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/40">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
                Console Système
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                  ● LIVE
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-cyan-200/80 mt-1">
                {isSuperAdmin
                  ? <>Connecté en tant que <span className="font-bold text-amber-300">SUPER ADMIN</span> · {userEmail}</>
                  : <>Utilisateur : {userEmail || 'chargement...'}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                autoRefresh ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto' : 'Pause'}</span>
            </button>
            <button onClick={loadAll} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* ONGLETS */}
        <div className="relative flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'monitoring', label: 'Monitoring', icon: Activity },
            { id: 'deployments', label: 'Déploiements', icon: Rocket, badge: deployStats?.pending || 0 },
            { id: 'applications', label: 'Applications', icon: Boxes, badge: appsStats?.total || 0 },
            { id: 'infrastructure', label: 'Infrastructure', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap relative ${
                  active ? 'bg-white text-blue-900 shadow-xl' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-amber-500 text-white' : 'bg-amber-500/30 text-amber-200'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ ONGLET MONITORING ============ */}
      {activeTab === 'monitoring' && metrics && (
        <>
          {/* 4 cercles */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-5">
              <Gauge className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-800">Utilisation en temps réel</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <CircleGauge value={metrics.cpu.usage} label="Processeur" sublabel={`${metrics.cpu.cores} cœurs · ${metrics.cpu.temperature}°C`} icon={<Cpu size={22} />} accentColor="#3b82f6" />
              <CircleGauge value={metrics.memory.percentage} label="Mémoire RAM" sublabel={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`} icon={<MemoryStick size={22} />} accentColor="#8b5cf6" />
              <CircleGauge value={metrics.disk.percentage} label="Disque" sublabel={`${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)}`} icon={<HardDrive size={22} />} accentColor="#10b981" />
              <CircleGauge value={metrics.memory.total > 0 ? (metrics.memory.free / metrics.memory.total) * 100 : 0} label="Mémoire libre" sublabel={`${formatBytes(metrics.memory.free)} libres`} icon={<Zap size={22} />} accentColor="#06b6d4" />
            </div>
          </div>

          {/* Status cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatusCard icon={<Server size={20} />} label="Serveur" value={metrics.server.status === 'online' ? 'Opérationnel' : metrics.server.status} sublabel={`Uptime: ${formatUptime(metrics.server.uptime)}`} color="green" status={metrics.server.status} />
            <StatusCard icon={<Database size={20} />} label="Base de données" value={`${metrics.database.connections} / ${metrics.database.maxConnections}`} sublabel={`${metrics.database.tables} tables · ${formatBytes(metrics.database.size)}`} color={metrics.database.status === 'online' ? 'blue' : 'amber'} status={metrics.database.status} />
            <StatusCard icon={<Users size={20} />} label="Utilisateurs en ligne" value={metrics.users.online} sublabel={`${metrics.users.sessions} sessions · ${metrics.users.total} total`} color="purple" />
            <StatusCard icon={<AlertTriangle size={20} />} label="Alertes" value={metrics.alerts.filter((a) => a.type === 'error').length} sublabel={`${metrics.alerts.filter((a) => a.type === 'warning').length} avertissements`} color={metrics.alerts.filter((a) => a.type === 'error').length > 0 ? 'red' : 'green'} />
          </div>

          {/* Historiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-100"><Cpu className="w-4 h-4 text-blue-600" /></div>
                  <div><h3 className="text-sm font-bold text-gray-800">Processeur</h3><p className="text-[10px] text-gray-400">Load: {metrics.cpu.loadAvg?.join(' / ') || '0'}</p></div>
                </div>
                <p className="text-2xl font-black text-blue-600">{metrics.cpu.usage.toFixed(0)}%</p>
              </div>
              <Sparkline data={metrics.cpuHistory} color="#3b82f6" height={80} width={400} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-purple-100"><MemoryStick className="w-4 h-4 text-purple-600" /></div>
                  <div><h3 className="text-sm font-bold text-gray-800">Mémoire</h3><p className="text-[10px] text-gray-400">RAM utilisée</p></div>
                </div>
                <p className="text-2xl font-black text-purple-600">{metrics.memory.percentage.toFixed(0)}%</p>
              </div>
              <Sparkline data={metrics.memoryHistory} color="#8b5cf6" height={80} width={400} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-100"><Wifi className="w-4 h-4 text-cyan-600" /></div>
                  <div><h3 className="text-sm font-bold text-gray-800">Trafic réseau</h3><p className="text-[10px] text-gray-400">{metrics.network.activeConnections} connexions</p></div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">↓ {metrics.network.inSpeed.toFixed(2)} KB/s</p>
                  <p className="text-xs font-bold text-blue-600">↑ {metrics.network.outSpeed.toFixed(2)} KB/s</p>
                </div>
              </div>
              <Sparkline data={metrics.networkInHistory} color="#10b981" height={80} width={400} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-100"><Database className="w-4 h-4 text-indigo-600" /></div>
                  <div><h3 className="text-sm font-bold text-gray-800">Base de données</h3><p className="text-[10px] text-gray-400">{metrics.database.totalQueries?.toLocaleString() || 0} requêtes</p></div>
                </div>
                <p className="text-2xl font-black text-indigo-600">{metrics.database.queryPerSecond}</p>
              </div>
              <Sparkline data={metrics.requestsHistory} color="#6366f1" height={80} width={400} />
            </div>
          </div>

          {/* Processus */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-800">Processus actifs</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">{metrics.processes.length}</span>
            </div>
            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-gray-100">
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">PID</th>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">Nom</th>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">User</th>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">CPU</th>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">Mémoire</th>
                    <th className="text-left py-2.5 px-3 text-[10px] uppercase text-gray-400 font-bold">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.processes.map((proc) => (
                    <tr key={proc.pid} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="py-2.5 px-3 text-xs font-mono text-gray-500">{proc.pid}</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-gray-800 truncate max-w-[200px]">{proc.name}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">{proc.user}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16"><ProgressBar value={Math.min(proc.cpu, 100)} color={proc.cpu > 50 ? 'bg-red-500' : proc.cpu > 20 ? 'bg-amber-500' : 'bg-blue-500'} height="h-1.5" /></div>
                          <span className="text-xs font-bold text-gray-700">{proc.cpu.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold text-gray-700">{formatBytes(proc.memory)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          proc.status === 'running' ? 'bg-emerald-100 text-emerald-700' : proc.status === 'sleeping' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>{proc.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============ ONGLET DÉPLOIEMENTS ============ */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatusCard icon={<Package size={20} />} label="Build actuel" value={`v1.0.${deployStats?.latest_build || 0}`} sublabel={`${deployStats?.total || 0} déploiements`} color="blue" />
            <StatusCard icon={<PackageCheck size={20} />} label="En production" value={deployStats?.production || 0} sublabel="Versions stables" color="green" />
            <StatusCard icon={<Clock size={20} />} label="En attente" value={deployStats?.pending || 0} sublabel="À approuver" color="amber" />
            <StatusCard icon={<XOctagon size={20} />} label="Échoués" value={deployStats?.failed || 0} sublabel="À investiguer" color="red" />
            <StatusCard icon={<CheckCheck size={20} />} label="Déployés" value={deployStats?.deployed || 0} sublabel="Historique" color="purple" />
          </div>

          {isSuperAdmin && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">Actions Super Admin activées</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">{userEmail}</span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-800">Historique des déploiements</h3>
              </div>
              <span className="text-[11px] text-gray-500 font-bold">{deployments.length} version(s)</span>
            </div>

            <div className="divide-y divide-gray-50">
              {deployments.length === 0 ? (
                <div className="text-center py-12">
                  <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucun déploiement enregistré</p>
                  <p className="text-xs text-gray-400 mt-1">Les déploiements apparaîtront ici automatiquement</p>
                </div>
              ) : (
                deployments.map((d) => (
                  <div key={d.id} className="p-4 hover:bg-gray-50/50 transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg ${
                          d.environment === 'production' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : d.environment === 'staging' ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'
                        }`}>#{d.build_number}</div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-black text-gray-800">{d.version}</p>
                            <DeploymentStatusBadge status={d.status} />
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{d.commit_message || 'Pas de message'}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono flex-shrink-0">{new Date(d.created_at).toLocaleString('fr-FR')}</p>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><GitBranch size={10} /> {d.branch || 'main'}</span>
                      <span className="font-mono">{d.commit_hash?.slice(0, 7) || 'n/a'}</span>
                      {d.duration_seconds && <span className="flex items-center gap-1"><Timer size={10} /> {d.duration_seconds}s</span>}
                    </div>

                    {isSuperAdmin && (
                      <div className="flex flex-wrap gap-2">
                        {d.status === 'pending' && (
                          <>
                            <button onClick={() => handleDeployAction(d.id, 'approve')} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> Approuver
                            </button>
                            <button onClick={() => handleDeployAction(d.id, 'reject', 'Rejeté')} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition flex items-center gap-1.5">
                              <XCircle size={12} /> Rejeter
                            </button>
                          </>
                        )}
                        {d.status === 'approved' && (
                          <button onClick={() => handleDeployAction(d.id, 'deploy')} className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold transition flex items-center gap-1.5">
                            <Rocket size={12} /> Déployer
                          </button>
                        )}
                        {d.status === 'deployed' && (
                          <button onClick={() => handleDeployAction(d.id, 'rollback', 'Rollback')} className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-[11px] font-bold transition flex items-center gap-1.5">
                            <RotateCw size={12} /> Rollback
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ ONGLET APPLICATIONS ============ */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatusCard icon={<Boxes size={20} />} label="Total apps" value={appsStats?.total || 0} sublabel="Hébergées" color="blue" />
            <StatusCard icon={<CheckCircle2 size={20} />} label="En cours" value={appsStats?.running || 0} sublabel="Actives" color="green" />
            <StatusCard icon={<Square size={20} />} label="Arrêtées" value={appsStats?.stopped || 0} sublabel="Inactives" color="amber" />
            <StatusCard icon={<XCircle size={20} />} label="Plantées" value={appsStats?.crashed || 0} sublabel="À corriger" color="red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {apps.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100">
                <Boxes className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-gray-700 mb-1">Aucune application enregistrée</h3>
                <p className="text-sm text-gray-500">Ajoute des apps dans la table hosted_applications</p>
              </div>
            ) : (
              apps.map((app) => (
                <div key={app.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg ${
                        app.realStatus === 'running' ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : app.realStatus === 'stopped' ? 'bg-gradient-to-br from-gray-500 to-gray-700' : 'bg-gradient-to-br from-amber-500 to-amber-700'
                      }`}><Boxes size={18} /></div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{app.name}</h4>
                        <p className="text-[10px] text-gray-500 font-mono">{app.domain}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      app.realStatus === 'running' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>{app.realStatus}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="p-1.5 rounded bg-gray-50"><p className="text-[9px] text-gray-500 uppercase font-bold">Port</p><p className="text-xs font-mono font-bold">{app.port}</p></div>
                    <div className="p-1.5 rounded bg-gray-50"><p className="text-[9px] text-gray-500 uppercase font-bold">CPU</p><p className="text-xs font-bold">{app.cpu_usage.toFixed(1)}%</p></div>
                    <div className="p-1.5 rounded bg-gray-50"><p className="text-[9px] text-gray-500 uppercase font-bold">RAM</p><p className="text-xs font-bold">{(app.memory_usage / 1024 / 1024).toFixed(0)}MB</p></div>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      {app.realStatus === 'running' ? (
                        <button onClick={() => handleAppAction(app.id, 'stop')} className="flex-1 px-2 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold transition flex items-center justify-center gap-1">
                          <Square size={11} /> Arrêter
                        </button>
                      ) : (
                        <button onClick={() => handleAppAction(app.id, 'start')} className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-[11px] font-bold transition flex items-center justify-center gap-1">
                          <Play size={11} /> Démarrer
                        </button>
                      )}
                      <button onClick={() => handleAppAction(app.id, 'restart')} className="flex-1 px-2 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-bold transition flex items-center justify-center gap-1">
                        <RotateCw size={11} /> Redémarrer
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============ ONGLET INFRASTRUCTURE ============ */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-4">
          {!isSuperAdmin ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
              <Lock className="w-16 h-16 text-red-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-red-800 mb-1">Accès restreint</h3>
              <p className="text-sm text-red-600">Cette section est réservée au Super Admin ({SUPER_ADMIN_EMAIL}).</p>
              <p className="text-xs text-red-500 mt-2">Votre email : {userEmail || 'non connecté'}</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-2xl p-4 text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur"><Unlock size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold">Accès Super Admin déverrouillé</h3>
                    <p className="text-[11px] text-white/80">Connecté en tant que <strong>{userEmail}</strong></p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-gray-800">Accès & Identifiants Serveur</h3>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{serverAccess.length} service(s)</span>
                </div>
                {serverAccess.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucun accès serveur enregistré</p>
                    <p className="text-xs text-gray-400 mt-1">Ajoute des entrées dans la table server_access</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {serverAccess.map((access) => (
                      <AccessCard key={access.id} access={access} />
                    ))}
                  </div>
                )}
              </div>

              {metrics && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Globe className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-bold text-gray-800">Informations serveur physique</h3>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Hostname</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 font-mono truncate">{metrics.server.hostname}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">OS</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{metrics.server.platform}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Architecture</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{metrics.server.arch}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">CPU</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{metrics.cpu.cores} cœurs</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">RAM totale</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{formatBytes(metrics.server.totalMemory)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Node.js</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 font-mono">v{metrics.server.nodeVersion}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">PID</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5 font-mono">{metrics.server.pid}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Uptime</p>
                      <p className="text-xs font-bold text-gray-800 mt-0.5">{formatUptime(metrics.server.uptime)}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}