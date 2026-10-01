'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/profile/StatsModal.tsximport { useEffect, useState } from 'react';
import { X, TrendingUp, FileCheck, Calendar, User } from 'lucide-react';

interface Stats {
  // Factures (mois en cours)
  mesFacturesValidees: number;
  totalFacturesValidees: number;
  pourcentageFactures: number;

  // Réservations (mois en cours)
  totalReservations: number;
  mesReservations: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsModal({ isOpen, onClose }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetch('/api/commercials/stats', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json();
        console.log('📊 Stats API status:', r.status, 'data:', data);
        if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
        return data;
      })
      .then((data) => setStats(data))
      .catch((e) => {
        console.error('❌ Stats fetch:', e);
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <TrendingUp size={20} />
            Mes statistiques
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              ❌ {error}
            </div>
          )}

          {stats && !loading && !error && (
            <div className="space-y-8">
              {/* ══════════════════════════════════════ */}
              {/* 1. GRAND CERCLE FACTURES                */}
              {/* ══════════════════════════════════════ */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center flex items-center justify-center gap-2">
                  <FileCheck size={14} />
                  Factures validées — ce mois
                </h3>

                <BigCircular
                  value={stats.mesFacturesValidees}
                  total={stats.totalFacturesValidees}
                  percentage={stats.pourcentageFactures}
                />

                <p className="text-center text-xs text-gray-400 mt-4">
                  <strong className="text-gray-700">{stats.mesFacturesValidees}</strong> sur {stats.totalFacturesValidees} factures validées dans l'entreprise
                </p>
              </div>

              {/* ══════════════════════════════════════ */}
              {/* 2. RÉSERVATIONS — 2 CHIFFRES SIMPLES    */}
              {/* ══════════════════════════════════════ */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 text-center flex items-center justify-center gap-2">
                  <Calendar size={14} />
                  Réservations — ce mois
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Total BD */}
                  <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Total entreprise
                    </p>
                    <p className="text-4xl font-bold text-slate-800 leading-none">
                      {stats.totalReservations}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Toutes réservations
                    </p>
                  </div>

                  {/* Mes réservations */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2 flex items-center justify-center gap-1">
                      <User size={10} />
                      Mes réservations
                    </p>
                    <p className="text-4xl font-bold text-blue-700 leading-none">
                      {stats.mesReservations}
                    </p>
                    <p className="text-[10px] text-blue-500 mt-2">
                      Réalisées par moi
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// GRAND CERCLE À DEUX COULEURS
// ============================================

function BigCircular({
  value,
  total,
  percentage,
}: {
  value: number;
  total: number;
  percentage: number;
}) {
  const pct = Math.max(0, Math.min(100, percentage));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="text-center">
      <div className="relative inline-block">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          {/* Cercle de fond (gris) = 100% du total */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="18"
          />
          {/* Cercle de progression (dégradé bleu→violet) = ma part */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="url(#bigGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s ease' }}
          />
          <defs>
            <linearGradient id="bigGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Texte au centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gray-900 leading-none">
            {pct}%
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-2">
            Ma part
          </span>
          <span className="text-xs text-gray-700 font-bold mt-1">
            {value} / {total}
          </span>
        </div>
      </div>

      {/* Légende */}
      <div className="flex justify-center gap-5 mt-5 text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}
          />
          <span className="text-gray-700 font-semibold">
            Mes validées ({value})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-gray-700 font-semibold">
            Autres ({total - value})
          </span>
        </div>
      </div>
    </div>
  );
}