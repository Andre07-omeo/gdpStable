// src/app/dashboard/comptable/stats/page.tsx

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, Loader2, RefreshCw,
  FileText, CheckCircle, CreditCard, Users, Calendar,
  AlertCircle, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ZAxis,
} from 'recharts';

// ─── PALETTE ──────────────────────────────────────────
const COLORS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  orange: '#f97316',
  slate: '#64748b',
};

const STATUT_COLORS: Record<string, string> = {
  EN_ATTENTE: COLORS.amber,
  VALIDE: COLORS.emerald,
  REJETEE: COLORS.red,
  PAYEE: COLORS.blue,
};

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  VALIDE: 'Validée',
  REJETEE: 'Rejetée',
  PAYEE: 'Payée',
};

// ─── FORMATTERS ───────────────────────────────────────
const formatPrice = (p: number, c = 'FC') =>
  !p || isNaN(p) ? `0 ${c}` : `${p.toLocaleString('fr-FR')} ${c}`;

const formatShort = (n: number) => {
  if (!n || isNaN(n)) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

// ─── TOOLTIP PERSONNALISÉ ─────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-bold text-gray-800 mb-1.5">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-bold text-gray-800">
            {typeof entry.value === 'number' && entry.value > 1000
              ? entry.value.toLocaleString('fr-FR')
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── CARTE DE GRAPHIQUE ───────────────────────────────
function ChartCard({
  title, subtitle, icon, children, className = '',
}: {
  title: string; subtitle?: string; icon: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="p-3 sm:p-4 border-b border-gray-100 flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-xs sm:text-sm font-bold text-gray-800 truncate">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════
export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/comptable/stats', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success) setStats(data.data);
      else setError(data.error || 'Erreur lors du chargement');
    } catch (err: any) {
      console.error('❌ Erreur:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const handler = () => fetchData(true);
    window.addEventListener('comptable-refresh', handler);
    return () => window.removeEventListener('comptable-refresh', handler);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium">
          Chargement des statistiques...
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <p className="text-base sm:text-lg font-bold text-gray-800 mb-1">
          Impossible de charger les statistiques
        </p>
        <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 max-w-md">
          {error || 'Données indisponibles'}
        </p>
        <button onClick={() => fetchData()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
          <RefreshCw size={16} />Réessayer
        </button>
      </div>
    );
  }

  const evolution = stats.evolutionMensuelle || [];
  const repartition = stats.repartitionStatut || [];
  const nuage = stats.nuagePoints || [];
  const topClients = stats.topClients || [];
  const echeances = stats.echeancesAVenir || [];

  // Préparation des données du camembert
  const pieData = repartition.map((r: any) => ({
    name: STATUT_LABELS[r.statut] || r.statut,
    value: Number(r.nombre),
    montant: Number(r.montant),
    color: STATUT_COLORS[r.statut] || COLORS.slate,
  }));

  return (
    <div className="w-full space-y-4 sm:space-y-5 lg:space-y-6 animate-fadeIn">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
            Statistiques & Analyses
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Graphiques, tendances et comparaisons de rendement
          </p>
        </div>
        <button onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-md">
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          GRAPHIQUE 1 : ÉVOLUTION MENSUELLE (Courbe)
          ═══════════════════════════════════════════════════════ */}
      <ChartCard
        title="Évolution mensuelle du chiffre d'affaires"
        subtitle="12 derniers mois — Total TTC vs Encaissé vs Restant"
        icon={<TrendingUp size={16} className="text-blue-600" />}
      >
        <div className="w-full h-[260px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="mois_label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={formatShort}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="total_ttc"
                name="Total TTC"
                stroke={COLORS.blue}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.blue }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="total_paye"
                name="Encaissé"
                stroke={COLORS.emerald}
                strokeWidth={2.5}
                dot={{ r: 4, fill: COLORS.emerald }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="total_restant"
                name="Restant"
                stroke={COLORS.orange}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: COLORS.orange }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ═══════════════════════════════════════════════════════
          GRILLE : 2 graphiques côte à côte
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">

        {/* GRAPHIQUE 2 : Répartition par statut (Camembert) */}
        <ChartCard
          title="Répartition des factures par statut"
          subtitle="Proportion de chaque statut"
          icon={<Activity size={16} className="text-purple-600" />}
        >
          <div className="w-full h-[260px] sm:h-[300px]">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* GRAPHIQUE 3 : Nombre de factures par mois (Barres) */}
        <ChartCard
          title="Volume de factures par mois"
          subtitle="Nombre et statut des factures créées"
          icon={<BarChart3 size={16} className="text-indigo-600" />}
        >
          <div className="w-full h-[260px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="mois_label"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="nb_payees" name="Payées" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="nb_validees" name="Validées" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                <Bar dataKey="nb_en_attente" name="En attente" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                <Bar dataKey="nb_rejetees" name="Rejetées" fill={COLORS.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ═══════════════════════════════════════════════════════
          GRAPHIQUE 4 : Nuage de points (Montant vs Délai)
          ═══════════════════════════════════════════════════════ */}
      <ChartCard
        title="Analyse de corrélation : Montant vs Délai de paiement"
        subtitle="Chaque point = une facture (x = délai en jours, y = montant en FC, taille = montant)"
        icon={<Activity size={16} className="text-cyan-600" />}
      >
        <div className="w-full h-[280px] sm:h-[340px]">
          {nuage.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Aucune donnée disponible
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="delai_jours"
                  name="Délai"
                  unit=" j"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  type="number"
                  dataKey="total_ttc"
                  name="Montant"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={formatShort}
                />
                <ZAxis type="number" dataKey="total_ttc" range={[40, 400]} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-bold text-gray-800 mb-1">{p.numero_facture}</p>
                        <p className="text-gray-600">{p.client_nom}</p>
                        <p className="mt-1">
                          <span className="text-gray-500">Montant: </span>
                          <span className="font-bold text-blue-600">{formatPrice(p.total_ttc)}</span>
                        </p>
                        <p>
                          <span className="text-gray-500">Délai: </span>
                          <span className="font-bold text-orange-600">{p.delai_jours} jours</span>
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">Statut: {p.statut}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={nuage} fill={COLORS.cyan} fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </ChartCard>

      {/* ═══════════════════════════════════════════════════════
          GRILLE : Top Clients + Échéances
          ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">

        {/* GRAPHIQUE 5 : Top 5 Clients */}
        <ChartCard
          title="Top 5 clients par chiffre d'affaires"
          subtitle="Classement par montant total facturé"
          icon={<Users size={16} className="text-amber-600" />}
        >
          <div className="w-full h-[260px] sm:h-[300px]">
            {topClients.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topClients}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={formatShort}
                  />
                  <YAxis
                    type="category"
                    dataKey="client"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="total_ttc" name="Total TTC" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total_paye" name="Encaissé" fill={COLORS.emerald} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        {/* GRAPHIQUE 6 : Échéances à venir */}
        <ChartCard
          title="Échéances à venir"
          subtitle="Répartition des factures non payées par tranche"
          icon={<Calendar size={16} className="text-red-600" />}
        >
          <div className="w-full h-[260px] sm:h-[300px]">
            {echeances.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Aucune échéance en cours
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={echeances.map((e: any) => ({
                      name: e.tranche,
                      value: Number(e.montant),
                      nombre: Number(e.nombre),
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {echeances.map((_: any, i: number) => (
                      <Cell
                        key={i}
                        fill={[COLORS.red, COLORS.amber, COLORS.orange, COLORS.cyan, COLORS.slate][i % 5]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .recharts-text { font-family: inherit; }
      `}</style>
    </div>
  );
}