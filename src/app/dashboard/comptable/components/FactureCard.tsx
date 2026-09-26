'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/FactureCard.tsximport React from 'react';
import { Eye, Check, X, Trash2, Building2, User, Calendar, AlertCircle, CreditCard } from 'lucide-react';

interface FactureCardProps {
  facture: any;
  onViewDetail: (facture: any) => void;
  onValidate?: (facture: any) => void;
  onReject?: (facture: any) => void;
  onDelete?: (id: number, numero: string) => void;
  onPayment?: (facture: any) => void;
  actionLoading?: boolean;
  getStatusBadge: (statut: string) => React.ReactNode;
  formatDate: (date: string | null) => string;
  formatPrice: (price: number) => string;
  isComptable?: boolean;
}

export function FactureCard({ 
  facture, 
  onViewDetail, 
  onValidate, 
  onReject, 
  onDelete,
  onPayment,
  actionLoading = false,
  getStatusBadge,
  formatDate,
  formatPrice,
  isComptable = true
}: FactureCardProps) {
  const getBorderColor = () => {
    if (facture.statut === 'EN_ATTENTE') return 'border-amber-200 hover:border-amber-400';
    if (facture.statut === 'VALIDE') return 'border-green-200 hover:border-green-400';
    if (facture.statut === 'REJETEE') return 'border-red-200 hover:border-red-400';
    if (facture.statut === 'PAYEE') return 'border-blue-200 hover:border-blue-400';
    return 'border-gray-200 hover:border-gray-400';
  };

  const montantPaye = facture.montant_paye || 0;
  const montantTotal = facture.total_ttc || facture.total_ht || 0;
  const montantRestant = montantTotal - montantPaye;

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all ${getBorderColor()} shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-lg text-gray-800">
              {facture.numero_facture}
            </h3>
            {getStatusBadge(facture.statut)}
            <span className="text-xs text-gray-400">
              {formatDate(facture.created_at)}
            </span>
          </div>
          
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Building2 size={14} className="text-gray-400 flex-shrink-0" />
              <span className="font-medium">Client:</span>
              <span className="truncate">{facture.client_nom || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <User size={14} className="text-gray-400 flex-shrink-0" />
              <span className="font-medium">Commercial:</span>
              <span className="truncate">
                {facture.commercial_prenom || facture.commercial_nom || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span className="font-medium">Échéance:</span>
              <span>{formatDate(facture.date_echeance)}</span>
            </div>
          </div>

          {/* Informations financières */}
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="font-bold text-blue-600">{formatPrice(montantTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payé</p>
              <p className="font-bold text-green-600">{formatPrice(montantPaye)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reste</p>
              <p className={`font-bold ${montantRestant > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                {formatPrice(montantRestant)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Progression</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${montantTotal > 0 ? (montantPaye / montantTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {facture.motif_rejet && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle size={14} className="inline mr-1" />
              Motif de rejet: {facture.motif_rejet}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onViewDetail(facture)}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-bold transition flex items-center gap-1"
          >
            <Eye size={14} />
            Détails
          </button>
          
          {facture.statut === 'EN_ATTENTE' && isComptable && onValidate && (
            <>
              <button
                onClick={() => onValidate(facture)}
                disabled={actionLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-1 disabled:opacity-50"
              >
                <Check size={14} />
                Valider
              </button>
              {onReject && (
                <button
                  onClick={() => onReject(facture)}
                  disabled={actionLoading}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-1 disabled:opacity-50"
                >
                  <X size={14} />
                  Rejeter
                </button>
              )}
            </>
          )}

          {(facture.statut === 'VALIDE' || facture.statut === 'EN_ATTENTE') && montantRestant > 0 && isComptable && onPayment && (
            <button
              onClick={() => onPayment(facture)}
              disabled={actionLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-1 disabled:opacity-50"
            >
              <CreditCard size={14} />
              Encaisser
            </button>
          )}

          {facture.statut === 'EN_ATTENTE' && isComptable && onDelete && (
            <button
              onClick={() => onDelete(facture.id_facture, facture.numero_facture)}
              disabled={actionLoading}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-1 disabled:opacity-50"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}