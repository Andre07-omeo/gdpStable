'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/map/PanneauPopup.tsximport { PanneauMap } from './types';

interface PanneauPopupProps {
  panneau: PanneauMap;
  onViewDetails: () => void;
}

export function PanneauPopup({ panneau, onViewDetails }: PanneauPopupProps) {
  const faces = panneau.faces || [];
  const totalFaces = faces.length;

  const today = new Date();

  const facesOccupees =
    faces.filter((f) => {
      if (f.reservations && f.reservations.length > 0) {
        return f.reservations.some((r: any) => {
          const debut = new Date(r.date_debut);
          const fin = new Date(r.date_fin);
          return today >= debut && today <= fin;
        });
      }
      if (f.date_debut && f.date_fin) {
        const debut = new Date(f.date_debut);
        const fin = new Date(f.date_fin);
        return today >= debut && today <= fin;
      }
      return false;
    }).length || 0;

  const isProblem =
    panneau.a_probleme || panneau.etat === 'EnMaintenance';

  const statusLabel = isProblem
    ? '⚠️ Problème'
    : facesOccupees === totalFaces && totalFaces > 0
    ? '🟡 Complet'
    : facesOccupees > 0
    ? '🟢 Partiel'
    : '🟢 Libre';

  const statusColor = isProblem
    ? 'text-red-600 bg-red-50 border-red-200'
    : facesOccupees === totalFaces && totalFaces > 0
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : facesOccupees > 0
    ? 'text-green-600 bg-green-50 border-green-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  return (
    <div className="p-1 max-w-[280px] font-sans">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="font-bold text-gray-800 text-sm truncate">
          {panneau.nom || `Panneau #${panneau.id_panneau}`}
        </h3>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-[11px] text-gray-600 mb-2 flex items-start gap-1">
        <span>📍</span>
        <span className="line-clamp-2">
          {panneau.adresse || 'Adresse non renseignée'}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-1 text-[10px] mb-2">
        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
          {totalFaces} face(s)
        </span>
        {facesOccupees > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
            {facesOccupees} occupée(s)
          </span>
        )}
        {panneau.commune && (
          <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
            {panneau.commune}
          </span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onViewDetails();
        }}
        disabled={isProblem}
        className={`w-full py-1.5 text-[11px] font-bold rounded-lg transition ${
          isProblem
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isProblem ? '❌ Indisponible' : 'Voir les détails →'}
      </button>
    </div>
  );
}