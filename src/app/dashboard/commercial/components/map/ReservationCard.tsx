'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/map/ReservationCard.tsximport React from 'react';
import {
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Check,
} from 'lucide-react';
import { FaceMap } from './types';

interface ReservationCardProps {
  face: FaceMap;
  type: 'encours' | 'future' | 'libre';
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onReserve: (face: FaceMap) => void;
  onAddToCart: (face: FaceMap) => void;
  isInCart: boolean;
}

export function ReservationCard({
  face,
  type,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onReserve,
  onAddToCart,
  isInCart,
}: ReservationCardProps) {
  // Première réservation associée à la face (si elle existe)
  const reservation = face.reservations?.[0];

  const getBorderColor = () => {
    if (face.a_probleme) return 'border-red-300 bg-red-50';
    if (type === 'encours') return 'border-green-400 bg-green-50';
    if (type === 'future') return 'border-blue-400 bg-blue-50';
    return 'border-emerald-300 bg-emerald-50';
  };

  const getTypeLabel = () => {
    if (face.a_probleme) return '⚠️ Problème';
    if (type === 'encours') return '🟢 En cours';
    if (type === 'future') return '🔵 Future';
    return '🟢 Disponible';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={`border-2 rounded-xl p-3 transition-all ${getBorderColor()} ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onToggleSelect}
            disabled={!!face.a_probleme}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
              face.a_probleme
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                : isSelected
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && <Check size={12} className="text-white" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-800">
                Face {face.orientation || 'N/A'}
              </span>
              <span className="text-xs text-gray-500">
                {face.type_face || 'Standard'}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50">
                {getTypeLabel()}
              </span>
              {isInCart && (
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  🛒 Panier
                </span>
              )}
            </div>

            {reservation && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {reservation.client_nom || 'Client N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(reservation.date_debut)} →{' '}
                  {formatDate(reservation.date_fin)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!face.a_probleme && (
            <>
              <button
                onClick={() => onAddToCart(face)}
                className={`p-1.5 rounded-lg transition ${
                  isInCart
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 hover:bg-amber-100 text-gray-600 hover:text-amber-600'
                }`}
                title={isInCart ? 'Dans le panier' : 'Ajouter au panier'}
              >
                <ShoppingCart size={14} />
              </button>
              <button
                onClick={() => onReserve(face)}
                className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition"
                title="Réserver"
              >
                <Calendar size={14} />
              </button>
            </>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Détails expandés */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">ID Face</p>
              <p className="font-medium">{face.id_face}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Statut</p>
              <p className="font-medium">{face.status || 'Disponible'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="font-medium">{face.type_face || 'Standard'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Orientation</p>
              <p className="font-medium">{face.orientation || 'N/A'}</p>
            </div>
          </div>

          {reservation && (
            <div className="bg-white/50 rounded-lg p-2">
              <p className="text-xs font-bold text-gray-700">
                Détails de la réservation
              </p>
              <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                <div>
                  <span className="text-gray-500">Commande:</span>
                  <span className="font-medium ml-1">
                    {reservation.numero_commande || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Statut:</span>
                  <span className="font-medium ml-1">
                    {reservation.statut || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onReserve(face)}
              disabled={!!face.a_probleme}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                face.a_probleme
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {face.a_probleme ? '❌ Indisponible' : '📅 Réserver'}
            </button>
            <button
              onClick={() => onAddToCart(face)}
              disabled={!!face.a_probleme}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                face.a_probleme
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isInCart
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
              }`}
            >
              <ShoppingCart size={12} />
              {isInCart ? 'Dans le panier' : 'Panier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}