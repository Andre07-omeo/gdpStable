'use client';

// src/app/dashboard/admin/components/AdminDashboardStats.tsx
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, MapPin, Users, Calendar, Layers, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, RefreshCw, Loader2,
  DollarSign, PieChart as PieIcon, Building2,
} from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';

interface DashboardStats {
  totalPanneaux: number;
  totalFaces: number;
  facesLibres: number;
  facesOccupees: number;
  facesReservees: number;
  totalUsers: number;
  totalClients: number;
  totalReservations: number;
  reservationsEnCours: number;
  reservationsFutures: number;
  reservationsPassees: number;
  totalRevenue: number;
  tauxOccupation: number;
}

interface AdminDashboardStatsProps {
  stats?: DashboardStats;
  loading?: boolean;
}

const EMPTY_STATS: DashboardStats = {
  totalPanneaux: 0,
  totalFaces: 0,
  facesLibres: 0,
  facesOccupees: 0,
  facesReservees: 0,
  totalUsers: 0,
  totalClients: 0,
  totalReservations: 0,
  reservationsEnCours: 0,
  reservationsFutures: 0,
  reservationsPassees: 0,
  totalRevenue: 0,
  tauxOccupation: 0,
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n || 0);

export function AdminDashboardStats({
  stats: propStats,
  loading = false,
}: AdminDashboardStatsProps) {
  const [stats, setStats] = useState<DashboardStats>(propStats ?? EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(!propStats);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setStats({ ...EMPTY_STATS, ...data });
      setLastUpdate(new Date());
    } catch (e: any) {
      console.error('❌ Erreur stats:', e);
      setError(e.message || 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (propStats) {
      setStats({ ...EMPTY_STATS, ...propStats });
      setIsLoading(false);
      setLastUpdate(new Date());
      return;
    }
    loadStats();
  }, [propStats, loadStats]);

  /* ── Erreur ── */
  if (error && !isLoading) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-red-800">Impossible de charger les statistiques</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Réessayer
        </button>
      </div>
    );
  }

  /* ── Skeleton ── */
  if (isLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-7 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  /* ── KPIs ── */
  const cards = [
    {
      label: 'Panneaux',
      value: stats.totalPanneaux,
      icon: <LayoutDashboard size={20} />,
      color: 'blue' as const,
      subtitle: `${stats.totalFaces} faces au total`,
    },
    {
      label: 'Faces libres',
      value: stats.facesLibres,
      icon: <CheckCircle2 size={20} />,
      color: 'emerald' as const,
      subtitle: `${pct(stats.facesLibres, stats.totalFaces)}% du parc`,
    },
    {
      label: 'Faces occupées',
      value: stats.facesOccupees,
      icon: <Users size={20} />,
      color: 'indigo' as const,
      subtitle: `${pct(stats.facesOccupees, stats.totalFaces)}% du parc`,
    },
    {
      label: 'Faces réservées',
      value: stats.facesReservees,
      icon: <Calendar size={20} />,
      color: 'amber' as const,
      subtitle: `${pct(stats.facesReservees, stats.totalFaces)}% du parc`,
    },
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      icon: <Users size={20} />,
      color: 'purple' as const,
      subtitle: `${stats.totalClients} clients`,
    },
    {
      label: 'Réservations',
      value: stats.totalReservations,
      icon: <Calendar size={20} />,
      color: 'cyan' as const,
      subtitle: `${stats.reservationsEnCours} en cours`,
    },
    {
      label: "Taux d'occupation",
      value: `${stats.tauxOccupation}%`,
      icon: <TrendingUp size={20} />,
      color: 'emerald' as const,
      subtitle: 'Sur le parc total',
    },
    {
      label: 'Revenus',
      value: formatMoney(stats.totalRevenue),
      icon: <DollarSign size={20} />,
      color: 'blue' as const,
      subtitle: 'Cumulés',
    },
  ];

  const totalFaces = stats.totalFaces || 1;

  return (
    <div className="space-y-6">
      {/* Header avec refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Vue d’ensemble</h2>
          <p className="text-xs text-gray-500">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition"
        >
          <RefreshCw size={14} /> Rafraîchir
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="flex flex-col">
            <StatCard
              label={card.label}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
            {card.subtitle && (
              <p className="text-[11px] text-gray-500 mt-1.5 text-center">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Répartition + Réservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition des faces */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-blue-600" />
              Répartition des faces
            </h3>
            <span className="text-xs text-gray-400">
              Total : <b className="text-gray-700">{stats.totalFaces}</b>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut */}
            <Donut
              segments={[
                { value: stats.facesLibres, color: '#10b981' },
                { value: stats.facesOccupees, color: '#3b82f6' },
                { value: stats.facesReservees, color: '#f59e0b' },
              ]}
              size={130}
              strokeWidth={16}
            />
            {/* Légende */}
            <div className="flex-1 space-y-3 w-full">
              <ProgressRow label="Libres" value={stats.facesLibres} total={totalFaces} color="emerald" />
              <ProgressRow label="Occupées" value={stats.facesOccupees} total={totalFaces} color="blue" />
              <ProgressRow label="Réservées" value={stats.facesReservees} total={totalFaces} color="amber" />
            </div>
          </div>
        </div>

        {/* Réservations */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Réservations
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Tile value={stats.reservationsEnCours} label="En cours" tone="blue" />
            <Tile value={stats.reservationsFutures} label="Futures" tone="amber" />
            <Tile value={stats.reservationsPassees} label="Passées" tone="gray" />
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">Total cumulé</span>
            <span className="text-lg font-bold text-gray-800">
              {stats.totalReservations}
            </span>
          </div>
        </div>
      </div>

      {/* Extras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Activité globale
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Tile value={stats.totalPanneaux} label="Panneaux actifs" tone="indigo" />
            <Tile value={stats.totalClients} label="Clients enregistrés" tone="emerald" />
            <Tile value={stats.totalUsers} label="Utilisateurs" tone="purple" />
            <Tile value={`${stats.tauxOccupation}%`} label="Occupation" tone="blue" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Performance financière
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Revenus totaux</p>
                <p className="text-2xl font-black text-emerald-800 mt-1">
                  {formatMoney(stats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Revenu / réservation</span>
              <span className="font-bold text-gray-800">
                {formatMoney(
                  stats.totalReservations > 0
                    ? stats.totalRevenue / stats.totalReservations
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers UI ── */

function pct(v: number, total: number) {
  if (!total) return 0;
  return Math.round((v / total) * 100);
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: 'emerald' | 'blue' | 'amber';
}) {
  const percentage = pct(value, total);
  const colorMap = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
  };
  const textMap = {
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-bold ${textMap[color]}`}>
          {value} <span className="text-xs text-gray-400">({percentage}%)</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Tile({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: 'blue' | 'amber' | 'gray' | 'emerald' | 'purple' | 'indigo';
}) {
  const tones = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };
  return (
    <div className={`text-center p-3.5 rounded-xl border ${tones[tone]}`}>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-[11px] font-medium opacity-80 mt-1.5">{label}</p>
    </div>
  );
}

function Donut({
  segments,
  size = 120,
  strokeWidth = 14,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={strokeWidth}
      />
      {total > 0 &&
        segments.map((seg, i) => {
          const fraction = seg.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
    </svg>
  );
}