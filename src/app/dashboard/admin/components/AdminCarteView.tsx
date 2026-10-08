'use client';

// src/app/dashboard/admin/components/AdminCarteView.tsx
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { MapPin, Search, RefreshCw, Info, X, Layers } from 'lucide-react';
import MapComponent from '@/app/dashboard/superviseur/components/MapComponent';

interface AdminCarteViewProps {
  panneaux: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

/**
 * Vue Carte pour l'admin : réutilise MapComponent du superviseur.
 * Affiche au survol/clic : nom, dimension, types de faces.
 */
export default function AdminCarteView({
  panneaux,
  loading = false,
  onRefresh,
}: AdminCarteViewProps) {
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  // Filtrage local (nom, adresse, commune)
  const filteredPanneaux = useMemo(() => {
    if (!search.trim()) return panneaux;
    const q = search.toLowerCase().trim();
    return panneaux.filter((p) => {
      const haystack = [
        p.nom,
        p.idPan,
        p.adresse,
        p.commune,
        p.ville,
        p.province,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [panneaux, search]);

  return (
    <div className="w-full">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin size={20} className="text-blue-600" />
            Carte des panneaux
          </h2>
          <p className="text-sm text-gray-500">
            {filteredPanneaux.length} panneau(x) affiché(s)
            {search && ` sur ${panneaux.length}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (nom, adresse...)"
              className="pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-[220px]"
            />
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw size={14} />
              Rafraîchir
            </button>
          )}
        </div>
      </div>

      {/* Carte */}
      <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
        {loading ? (
          <div className="w-full h-[500px] flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500">Chargement de la carte...</p>
            </div>
          </div>
        ) : filteredPanneaux.length === 0 ? (
          <div className="w-full h-[500px] flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MapPin size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucun panneau à afficher</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-[500px] sm:h-[600px] lg:h-[700px]">
            <MapComponent
              panneaux={filteredPanneaux}
              userLocation={null}
              onMarkerClick={(p) => setSelected(p)}
                hideInfoWindow={true}
            />
          </div>
        )}
      </div>

      {/* Panneau de détails (au clic sur un marqueur) */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">
                    {selected.nom || selected.idPan || `Panneau #${selected.id_panneau}`}
                  </h3>
                  {selected.adresse && (
                    <p className="text-xs text-gray-500 truncate">{selected.adresse}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corps */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Info de base */}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow
                  label="Dimension"
                  value={selected.dimension || 'N/A'}
                  icon={<Info size={12} />}
                />
                <InfoRow
                  label="État"
                  value={selected.etat || 'Actif'}
                  icon={<Info size={12} />}
                  valueClass={
                    selected.etat === 'Actif'
                      ? 'text-emerald-600'
                      : selected.etat === 'EnMaintenance'
                        ? 'text-amber-600'
                        : 'text-red-600'
                  }
                />
                <InfoRow
                  label="Commune"
                  value={selected.commune || 'N/A'}
                />
                <InfoRow
                  label="Ville"
                  value={selected.ville || 'N/A'}
                />
              </div>

              {/* Faces */}
              <div className="border-t border-gray-100 pt-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Layers size={12} />
                  Faces ({selected.faces?.length || 0})
                </h4>

                {selected.faces && selected.faces.length > 0 ? (
                  <div className="space-y-2">
                    {selected.faces.map((f: any, i: number) => (
                      <div
                        key={f.id_face || i}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {f.orientation || f.nom_face || `Face #${f.id_face}`}
                            </p>
                            {f.est_active === 0 && (
                              <p className="text-[10px] text-red-500 font-semibold">
                                Inactive
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                          {f.statut || 'Disponible'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Aucune face enregistrée pour ce panneau.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- Sous-composant -------------------- */
function InfoRow({
  label,
  value,
  icon,
  valueClass = 'text-gray-800',
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={'text-sm font-bold mt-0.5 truncate ' + valueClass}>{value}</p>
    </div>
  );
}