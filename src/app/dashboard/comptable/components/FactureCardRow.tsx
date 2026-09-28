// src/app/dashboard/comptable/components/FactureCardRow.tsx

'use client';

import React from 'react';
import {
  Eye, Check, CreditCard, Building2, User, Calendar,
  AlertCircle, Hash, FileText,
} from 'lucide-react';
import { AdaptiveValue } from './AdaptiveValue';

interface FactureCardRowProps {
  facture: any;
  onViewDetail: (f: any) => void;
  onValidate?: (f: any) => void;
  onPayment?: (f: any) => void;
  getStatusBadge: (s: string) => React.ReactNode;
  formatDate: (d: string | null) => string;
  formatPrice: (p: number) => string;
}

export function FactureCardRow({
  facture,
  onViewDetail,
  onValidate,
  onPayment,
  getStatusBadge,
  formatDate,
  formatPrice,
}: FactureCardRowProps) {
  const paye = Number(facture.montant_paye || 0);
  const total = Number(facture.total_ttc || facture.total_ht || 0);
  const reste = Math.max(0, total - paye);
  const progression = total > 0 ? Math.round((paye / total) * 100) : 0;
  const nomComplet =
    `${facture.commercial_prenom || ''} ${facture.commercial_nom || ''}`.trim() || 'N/A';

  // Couleur de bordure selon le statut
  const borderAccent =
    facture.statut === 'EN_ATTENTE' ? 'border-l-amber-400' :
    facture.statut === 'VALIDE' ? 'border-l-emerald-400' :
    facture.statut === 'REJETEE' ? 'border-l-red-400' :
    facture.statut === 'PAYEE' ? 'border-l-blue-400' : 'border-l-gray-300';

  const statutBg =
    facture.statut === 'EN_ATTENTE' ? 'bg-amber-50/40' :
    facture.statut === 'VALIDE' ? 'bg-emerald-50/40' :
    facture.statut === 'REJETEE' ? 'bg-red-50/40' :
    facture.statut === 'PAYEE' ? 'bg-blue-50/40' : 'bg-white';

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border border-gray-200 border-l-4 ${borderAccent} ${statutBg}
        shadow-sm hover:shadow-md transition-all duration-300
        p-3 sm:p-4 lg:p-5
      `}
    >
      <div className="flex flex-col xl:flex-row xl:items-center gap-4">

        {/* ═══════════ BLOC GAUCHE : Infos facture ═══════════ */}
        <div className="flex-1 min-w-0">
          {/* Ligne 1 : Numéro + Statut + Date */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Hash size={14} className="text-gray-400 flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base text-gray-800 truncate">
                {facture.numero_facture}
              </span>
            </div>
            {getStatusBadge(facture.statut)}
            <span className="text-[10px] sm:text-xs text-gray-400 ml-auto xl:ml-0">
              {formatDate(facture.created_at)}
            </span>
          </div>

          {/* Ligne 2 : Client + Commercial + Échéance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 flex-shrink-0">Client:</span>
              <span className="font-semibold text-gray-800 truncate">
                {facture.client_nom || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <User size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 flex-shrink-0">Commercial:</span>
              <span className="font-semibold text-gray-800 truncate">{nomComplet}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-500 flex-shrink-0">Échéance:</span>
              <span className="font-semibold text-gray-800 truncate">
                {formatDate(facture.date_echeance)}
              </span>
            </div>
          </div>

          {/* Motif rejet */}
          {facture.motif_rejet && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] sm:text-xs text-red-600 flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              <span className="min-w-0 break-words">
                <strong>Motif :</strong> {facture.motif_rejet}
              </span>
            </div>
          )}
        </div>

        {/* ═══════════ BLOC MONTANTS ═══════════ */}
        <div className="flex-shrink-0 w-full xl:w-[340px]">
          <div className="bg-white/80 border border-gray-200 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Total */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">
                  Total
                </p>
                <AdaptiveValue
                  value={formatPrice(total)}
                  maxSize={1}
                  minSize={0.6}
                  color="text-blue-600"
                />
              </div>
              {/* Payé */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">
                  Payé
                </p>
                <AdaptiveValue
                  value={formatPrice(paye)}
                  maxSize={1}
                  minSize={0.6}
                  color="text-emerald-600"
                />
              </div>
              {/* Reste */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-semibold tracking-wide mb-0.5">
                  Reste
                </p>
                <AdaptiveValue
                  value={formatPrice(reste)}
                  maxSize={1}
                  minSize={0.6}
                  color={reste > 0 ? 'text-orange-600' : 'text-gray-500'}
                />
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    progression >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(progression, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                {progression}%
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════ BLOC ACTIONS ═══════════ */}
        <div className="flex-shrink-0 w-full xl:w-auto">
          <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap xl:justify-end">
            {/* Détails */}
            <button
              onClick={() => onViewDetail(facture)}
              className="flex-1 xl:flex-none px-3 py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-600 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-95"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Détails</span>
            </button>

            {/* Valider */}
            {facture.statut === 'EN_ATTENTE' && onValidate && (
              <button
                onClick={() => onValidate(facture)}
                className="flex-1 xl:flex-none px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95"
              >
                <Check size={14} />
                <span className="hidden sm:inline">Valider</span>
              </button>
            )}

            {/* Encaisser */}
            {(facture.statut === 'VALIDE' || facture.statut === 'EN_ATTENTE') &&
              reste > 0 && onPayment && (
                <button
                  onClick={() => onPayment(facture)}
                  className="flex-1 xl:flex-none px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-95"
                >
                  <CreditCard size={14} />
                  <span className="hidden sm:inline">Encaisser</span>
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}