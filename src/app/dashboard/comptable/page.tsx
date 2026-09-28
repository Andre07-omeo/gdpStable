// src/app/dashboard/comptable/page.tsx

'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText, Clock, CheckCircle, XCircle, CreditCard, DollarSign,
  TrendingUp, RefreshCw, Eye, Building2, User, BarChart3,
  Wallet, Calendar, AlertCircle, ChevronRight, Banknote, Coins,
  Percent,
} from 'lucide-react';
import { AdaptiveStatCard } from './components/AdaptiveStatCard';

// ─── TYPES ──────────────────────────────────────────
interface Facture {
  id_facture: number;
  numero_facture: string;
  client_nom: string;
  commercial_nom: string;
  commercial_prenom: string;
  statut: string;
  total_ttc: number;
  total_ht: number;
  montant_paye: number;
  created_at: string;
  date_creation: string;
  date_echeance: string;
  motif_rejet?: string;
}

// ─── BADGE DE STATUT ────────────────────────────────
function StatusBadge({ statut }: { statut: string }) {
  const n = (statut || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const s: Record<string, { c: string; l: string; d: string }> = {
    EN_ATTENTE: { c: 'bg-amber-50 text-amber-700 border-amber-200', l: 'En attente', d: 'bg-amber-500' },
    VALIDE: { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', l: 'Validée', d: 'bg-emerald-500' },
    REJETEE: { c: 'bg-red-50 text-red-700 border-red-200', l: 'Rejetée', d: 'bg-red-500' },
    PAYEE: { c: 'bg-blue-50 text-blue-700 border-blue-200', l: 'Payée', d: 'bg-blue-500' },
  };
  const st = s[n] || { c: 'bg-gray-50 text-gray-700 border-gray-200', l: statut || 'Inconnu', d: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap ${st.c}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.d}`} />
      {st.l}
    </span>
  );
}

// ─── LIGNE DE FACTURE ───────────────────────────────
function FactureRow({ facture, onView, formatPrice, formatDate }: any) {
  const paye = facture.montant_paye || 0;
  const total = facture.total_ttc || facture.total_ht || 0;
  const reste = Math.max(0, total - paye);
  const prog = total > 0 ? Math.round((paye / total) * 100) : 0;

  return (
    <div className="p-3 sm:p-4 hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-0">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-xs sm:text-sm text-gray-800 truncate">
              {facture.numero_facture}
            </span>
            <StatusBadge statut={facture.statut} />
          </div>
          <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap">
            {formatDate(facture.created_at || facture.date_creation)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-gray-600">
          <span className="flex items-center gap-1 min-w-0">
            <Building2 size={12} className="text-gray-400 flex-shrink-0" />
            <span className="truncate font-medium">
              {facture.client_nom || 'Client N/A'}
            </span>
          </span>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <span className="flex items-center gap-1 min-w-0">
            <User size={12} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">
              {facture.commercial_prenom || facture.commercial_nom || 'Commercial N/A'}
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-blue-600">
                {formatPrice(total)}
              </span>
              {paye > 0 && (
                <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">
                  Payé: {formatPrice(paye)}
                </span>
              )}
              {reste > 0 && (
                <span className="text-[10px] sm:text-xs text-orange-500 font-medium">
                  Reste: {formatPrice(reste)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 max-w-[120px] sm:max-w-[180px] bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    prog >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(prog, 100)}%` }}
                />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-500">
                {prog}%
              </span>
            </div>
          </div>

          <button
            onClick={() => onView(facture)}
            className="p-2 sm:p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg sm:rounded-xl transition-all flex-shrink-0 hover:scale-105"
            title="Voir détails"
          >
            <Eye size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ────────────────────────────────
export default function ComptableDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<any>({
    global: {
      total_factures: 0, en_attente: 0, validees: 0, rejetees: 0, payees: 0,
      total_ttc: 0, total_paye: 0, total_restant: 0,
    },
    mois: {
      total_factures: 0, payees: 0, validees: 0, en_attente: 0, rejetees: 0,
      total_ttc: 0, total_paye: 0, total_restant: 0,
    },
    devise: { total_fc: 0, total_usd: 0 },
  });
  const [dernieresFactures, setDernieresFactures] = useState<Facture[]>([]);

  // ─── FETCH DATA ─────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/comptable/stats', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();

      if (data.success) {
        setStats({
          global: data.data.global,
          mois: data.data.mois,
          devise: data.data.devise,
        });
        setDernieresFactures(data.data.dernieresFactures || []);
      }
    } catch (e) {
      console.error('❌ Erreur fetch dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const h = () => fetchData(true);
    window.addEventListener('comptable-refresh', h);
    return () => window.removeEventListener('comptable-refresh', h);
  }, [fetchData]);

  // ─── FORMATTERS ─────────────────────────────────────
  const formatPrice = (p: number, c = 'FC') =>
    (!p || isNaN(p)) ? `0 ${c}` : `${p.toLocaleString('fr-FR')} ${c}`;

  const formatNumber = (n: number) => (n || 0).toLocaleString('fr-FR');

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  // ─── LOADING ────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <Wallet className="absolute inset-0 m-auto text-blue-600" size={24} />
        </div>
        <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium text-center">
          Chargement du tableau de bord...
        </p>
      </div>
    );
  }

  const g = stats.global;
  const m = stats.mois;
  const dv = stats.devise;
  const taux = g.total_ttc > 0 ? Math.round((g.total_paye / g.total_ttc) * 100) : 0;

  // ─── RENDER ─────────────────────────────────────────
  return (
    <div className="w-full space-y-5 sm:space-y-6 animate-fadeIn">

      {/* ═══════════════════════════════════════════════════
          TITRE + RAFRAÎCHIR
          ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">
            Tableau de bord
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Vue d'ensemble de la comptabilité
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════
          STATISTIQUES GLOBALES (6 KPIs)
          ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <BarChart3 size={16} className="text-blue-600" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-800">
            Statistiques globales
          </h2>
          <span className="text-[10px] sm:text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Toutes périodes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
          <AdaptiveStatCard
            label="Total factures"
            value={formatNumber(g.total_factures)}
            icon={<FileText size={20} className="text-slate-600" />}
            color="text-slate-700"
            bgColor="bg-white"
            borderColor="border-slate-200"
            accentBar="bg-slate-400"
          />
          <AdaptiveStatCard
            label="En attente"
            value={formatNumber(g.en_attente)}
            icon={<Clock size={20} className="text-amber-600" />}
            color="text-amber-600"
            bgColor="bg-amber-50/60"
            borderColor="border-amber-200"
            accentBar="bg-amber-500"
          />
          <AdaptiveStatCard
            label="Validées"
            value={formatNumber(g.validees)}
            icon={<CheckCircle size={20} className="text-emerald-600" />}
            color="text-emerald-600"
            bgColor="bg-emerald-50/60"
            borderColor="border-emerald-200"
            accentBar="bg-emerald-500"
          />
          <AdaptiveStatCard
            label="Rejetées"
            value={formatNumber(g.rejetees)}
            icon={<XCircle size={20} className="text-red-600" />}
            color="text-red-600"
            bgColor="bg-red-50/60"
            borderColor="border-red-200"
            accentBar="bg-red-500"
          />
          <AdaptiveStatCard
            label="Payées"
            value={formatNumber(g.payees)}
            icon={<CreditCard size={20} className="text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50/60"
            borderColor="border-blue-200"
            accentBar="bg-blue-500"
          />
          <AdaptiveStatCard
            label="Total TTC"
            value={formatPrice(g.total_ttc)}
            icon={<DollarSign size={20} className="text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50/60"
            borderColor="border-purple-200"
            accentBar="bg-purple-500"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          RÉPARTITION PAR DEVISE (FC / USD)
          ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <Coins size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-800">
            Répartition par devise
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* FC */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
                <Banknote size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs sm:text-sm font-bold text-emerald-800">
                    Francs Congolais
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">
                    CDF
                  </span>
                  <span className="ml-auto text-xl sm:text-2xl">🇨🇩</span>
                </div>
                <p
                  className="font-black text-emerald-700 leading-tight break-all tabular-nums"
                  style={{
                    fontSize: `clamp(0.9rem, ${Math.max(
                      1.2,
                      3.2 - String(formatPrice(dv.total_fc, 'FC')).length * 0.12
                    )}vw, 2rem)`,
                    overflowWrap: 'anywhere',
                  }}
                  title={formatPrice(dv.total_fc, 'FC')}
                >
                  {formatPrice(dv.total_fc, 'FC')}
                </p>
                <p className="text-[10px] sm:text-xs text-emerald-600 mt-1">
                  Total encaissé en francs congolais
                </p>
              </div>
            </div>
          </div>

          {/* USD */}
          <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 via-blue-50/80 to-white shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
            <div className="flex items-center gap-4 p-4 sm:p-5">
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                <DollarSign size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs sm:text-sm font-bold text-blue-800">
                    Dollars US
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold">
                    USD
                  </span>
                  <span className="ml-auto text-xl sm:text-2xl">🇺🇸</span>
                </div>
                <p
                  className="font-black text-blue-700 leading-tight break-all tabular-nums"
                  style={{
                    fontSize: `clamp(0.9rem, ${Math.max(
                      1.2,
                      3.2 - String(formatPrice(dv.total_usd, '$')).length * 0.12
                    )}vw, 2rem)`,
                    overflowWrap: 'anywhere',
                  }}
                  title={formatPrice(dv.total_usd, '$')}
                >
                  {formatPrice(dv.total_usd, '$')}
                </p>
                <p className="text-[10px] sm:text-xs text-blue-600 mt-1">
                  Total encaissé en dollars américains
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOIS EN COURS (4 KPIs)
          ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Calendar size={16} className="text-purple-600" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-800">
            Mois en cours
          </h2>
          <span className="text-[10px] sm:text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <AdaptiveStatCard
            label="Factures créées"
            value={formatNumber(m.total_factures)}
            icon={<FileText size={20} className="text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50/60"
            borderColor="border-purple-200"
            accentBar="bg-purple-500"
          />
          <AdaptiveStatCard
            label="Total TTC mois"
            value={formatPrice(m.total_ttc)}
            icon={<TrendingUp size={20} className="text-indigo-600" />}
            color="text-indigo-600"
            bgColor="bg-indigo-50/60"
            borderColor="border-indigo-200"
            accentBar="bg-indigo-500"
          />
          <AdaptiveStatCard
            label="Validées mois"
            value={formatNumber(m.validees)}
            icon={<CheckCircle size={20} className="text-emerald-600" />}
            color="text-emerald-600"
            bgColor="bg-emerald-50/60"
            borderColor="border-emerald-200"
            accentBar="bg-emerald-500"
          />
          <AdaptiveStatCard
            label="Payées mois"
            value={formatNumber(m.payees)}
            icon={<CreditCard size={20} className="text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50/60"
            borderColor="border-blue-200"
            accentBar="bg-blue-500"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          SYNTHÈSE FINANCIÈRE (4 KPIs + barre de progression)
          ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <Wallet size={16} className="text-orange-600" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-gray-800">
            Synthèse financière
          </h2>
          <span className="text-[10px] sm:text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            4 indicateurs clés
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <AdaptiveStatCard
            label="Total TTC global"
            value={formatPrice(g.total_ttc)}
            icon={<DollarSign size={20} className="text-purple-600" />}
            color="text-purple-600"
            bgColor="bg-purple-50/60"
            borderColor="border-purple-200"
            accentBar="bg-purple-500"
          />
          <AdaptiveStatCard
            label="Total encaissé"
            value={formatPrice(g.total_paye)}
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            color="text-emerald-600"
            bgColor="bg-emerald-50/60"
            borderColor="border-emerald-200"
            accentBar="bg-emerald-500"
          />
          <AdaptiveStatCard
            label="Reste à encaisser"
            value={formatPrice(g.total_restant)}
            icon={<AlertCircle size={20} className="text-orange-600" />}
            color="text-orange-600"
            bgColor="bg-orange-50/60"
            borderColor="border-orange-200"
            accentBar="bg-orange-500"
          />
          <AdaptiveStatCard
            label="Taux d'encaissement"
            value={`${taux}%`}
            icon={<Percent size={20} className="text-blue-600" />}
            color="text-blue-600"
            bgColor="bg-blue-50/60"
            borderColor="border-blue-200"
            accentBar="bg-blue-500"
          />
        </div>

        {/* Barre de progression */}
        <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-gray-600 font-semibold">
              Progression de l'encaissement
            </span>
            <span className="text-sm sm:text-base font-bold text-blue-600 tabular-nums">
              {taux}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, taux)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] sm:text-xs text-gray-400">
            <span>
              Encaissé :{' '}
              <span className="font-bold text-emerald-600">
                {formatPrice(g.total_paye)}
              </span>
            </span>
            <span>
              Objectif :{' '}
              <span className="font-bold text-purple-600">
                {formatPrice(g.total_ttc)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DERNIÈRES FACTURES (5 plus récentes)
          ═══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Clock size={16} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                Dernières factures
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-400">
                Les 5 factures les plus récentes
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/comptable/factures')}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors self-end sm:self-auto"
          >
            Voir tout <ChevronRight size={14} />
          </button>
        </div>

        <div>
          {dernieresFactures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
                <FileText size={28} />
              </div>
              <p className="text-sm sm:text-base text-gray-500 text-center font-medium">
                Aucune facture récente
              </p>
            </div>
          ) : (
            dernieresFactures.map((facture) => (
              <FactureRow
                key={facture.id_facture}
                facture={facture}
                onView={() => router.push('/dashboard/comptable/factures')}
                formatPrice={formatPrice}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          STYLES
          ═══════════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}