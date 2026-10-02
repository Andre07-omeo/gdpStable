'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/admin/components/AdminPanneauxList.tsx
import React, { useState } from 'react';
import {
  MapPin, Edit2, Trash2, Search, Plus,
  Loader2, AlertTriangle, Layers, Eye, Ruler,
} from 'lucide-react';

// ✅ Type Panneau basé sur ta structure MySQL réelle
export interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: string;
  commune: string;
  province: string;
  ville: string;
  nbFaces?: number;
  faces?: any[];
  nbReservations?: number;
  // ✅ Dimensions (adapte selon tes colonnes réelles)
  largeur?: number | null;   // en mètres
  hauteur?: number | null;   // en mètres
  dimension?: string | null; // ex: "6x3" ou "6m x 3m"
  format?: string | null;    // ex: "4x3", "8x4"
  surface?: number | null;   // en m²
}

interface AdminPanneauxListProps {
  panneaux: Panneau[];
  onRefresh: () => void;
  onEdit?: (panneau: Panneau) => void;
  onView?: (panneau: Panneau) => void;
}

export function AdminPanneauxList({
  panneaux,
  onRefresh,
  onEdit,
  onView,
}: AdminPanneauxListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const filteredPanneaux = panneaux.filter((p) =>
    p.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.adresse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.commune?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ville?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (p: Panneau) => {
    const nbFaces = p.nbFaces ?? p.faces?.length ?? 0;
    const nbResa = p.nbReservations ?? 0;

    let message = `Voulez-vous vraiment supprimer le panneau « ${p.nom || 'Sans nom'} » ?`;
    if (nbFaces > 0 || nbResa > 0) {
      message += `\n\n⚠️ ATTENTION : Cette action supprimera aussi :`;
      if (nbFaces > 0) message += `\n• ${nbFaces} face(s) liée(s)`;
      if (nbResa > 0) message += `\n• ${nbResa} réservation(s) associée(s)`;
      message += `\n\nCette opération est IRRÉVERSIBLE.`;
    }
    if (!confirm(message)) return;

    setDeletingId(p.id_panneau);
    try {
      const res = await fetch(`/api/admin/panneaux/${p.id_panneau}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const details = data.deleted
          ? `\n(${data.deleted.faces || 0} face(s), ${data.deleted.reservations || 0} réservation(s) supprimée(s))`
          : '';
        alert(`Panneau supprimé avec succès${details}`);
        onRefresh();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Erreur : ' + (error.error || `Code ${res.status}`));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur réseau lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusConfig = (etat?: string) => {
    const normalized = (etat || 'actif').toLowerCase().replace(/[\s_-]/g, '');
    switch (normalized) {
      case 'actif':
        return { label: 'Actif', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'enmaintenance':
      case 'maintenance':
        return { label: 'Maintenance', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'inactif':
        return { label: 'Inactif', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
      case 'horsservice':
        return { label: 'Hors service', cls: 'bg-red-100 text-red-700 border-red-200' };
      case 'reserve':
        return { label: 'Réservé', cls: 'bg-blue-100 text-blue-700 border-blue-200' };
      default:
        return { label: etat || 'Inconnu', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
  };

  // ✅ Dimensions : gère plusieurs formats possibles
  const formatDimensions = (p: Panneau): { label: string; surface?: string } => {
    // 1) largeur + hauteur en mètres
    if (p.largeur && p.hauteur) {
      const l = Number(p.largeur);
      const h = Number(p.hauteur);
      return {
        label: `${l} × ${h} m`,
        surface: p.surface ? `${p.surface} m²` : `${(l * h).toFixed(1)} m²`,
      };
    }
    // 2) champ dimension libre (ex: "6x3" ou "6m x 3m")
    if (p.dimension) {
      return { label: p.dimension };
    }
    // 3) champ format (ex: "4x3")
    if (p.format) {
      const match = p.format.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
      if (match) {
        const l = Number(match[1]);
        const h = Number(match[2]);
        return {
          label: `${l} × ${h} m`,
          surface: `${(l * h).toFixed(1)} m²`,
        };
      }
      return { label: p.format };
    }
    // 4) surface seule
    if (p.surface) {
      return { label: `${p.surface} m²` };
    }
    return { label: '' };
  };

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Panneaux publicitaires</h2>
          <p className="text-sm text-gray-500">
            Gestion des supports d'affichage — {filteredPanneaux.length} panneau{filteredPanneaux.length > 1 ? 'x' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, adresse, ville..."
              className="pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-72"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} />
            Nouveau
          </button>
        </div>
      </div>

      {/* ── Tableau ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Panneau</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Adresse</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Dimensions</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Faces</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPanneaux.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <MapPin size={40} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {searchTerm ? 'Aucun panneau ne correspond à votre recherche' : 'Aucun panneau enregistré'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPanneaux.map((p) => {
                  const status = getStatusConfig(p.etat);
                  const nbFaces = p.nbFaces ?? p.faces?.length ?? 0;
                  const dims = formatDimensions(p);
                  const isDeleting = deletingId === p.id_panneau;

                  return (
                    <tr
                      key={p.id_panneau}
                      className={`hover:bg-gray-50/70 transition ${isDeleting ? 'opacity-50' : ''}`}
                    >
                      {/* ID */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-mono font-semibold">
                          #{p.id_panneau}
                        </span>
                      </td>

                      {/* Nom */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-800 truncate block max-w-[220px]">
                          {p.nom || 'Sans nom'}
                        </span>
                      </td>

                      {/* ✅ Adresse (remplace Localisation) */}
                      <td className="px-4 py-3">
                        {p.adresse ? (
                          <div className="flex items-start gap-1.5 text-sm text-gray-700">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <span className="block truncate max-w-[280px]">{p.adresse}</span>
                              {(p.commune || p.ville) && (
                                <span className="block text-xs text-gray-500 truncate max-w-[280px]">
                                  {[p.commune, p.ville].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Aucune adresse</span>
                        )}
                      </td>

                      {/* ✅ Dimensions */}
                      <td className="px-4 py-3 text-center">
                        {dims.label ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                              <Ruler size={11} />
                              {dims.label}
                            </span>
                            {dims.surface && (
                              <span className="text-[10px] text-gray-500 font-medium">
                                {dims.surface}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">—</span>
                        )}
                      </td>

                      {/* Nombre de faces */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            nbFaces > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                        >
                          <Layers size={11} />
                          {nbFaces}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${status.cls}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {onView && (
                            <button
                              onClick={() => onView(p)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
                              title="Voir les détails"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit?.(p)}
                            disabled={isDeleting || !onEdit}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            title={onEdit ? 'Modifier' : 'Fonction non disponible'}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Supprimer (faces et réservations liées seront aussi supprimées)"
                          >
                            {isDeleting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note informative sur le cascade */}
      <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          La suppression d'un panneau entraîne automatiquement la suppression de ses <strong>faces</strong> et des <strong>réservations</strong> qui y sont liées.
        </p>
      </div>
    </div>
  );
}