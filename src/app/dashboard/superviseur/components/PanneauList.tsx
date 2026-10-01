'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/PanneauList.tsx
import { useState } from 'react';
import {
  Search, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, MapPin, Building,
  AlertCircle, Filter, Pencil, Trash2
} from 'lucide-react';

// ✅ Importer le type depuis panneau.types
import { Panneau, Face } from '../types/panneau.types';

interface PanneauListProps {
  panneaux: Panneau[];
  onPanneauProblem: (panneauId: number, raison: string) => void;
  onFaceProblem: (panneauId: number, faceId: number, raison: string) => void;
  onResoudreProblem: (panneauId: number, faceId?: number) => void;
  /** ✅ NOUVEAU : callback pour ouvrir le formulaire en mode édition */
  onEditPanneau?: (panneau: Panneau) => void;
  /** ✅ NOUVEAU : callback pour supprimer un panneau */
  onDeletePanneau?: (panneauId: number) => void;
}

export default function PanneauList({
  panneaux,
  onPanneauProblem,
  onFaceProblem,
  onResoudreProblem,
  onEditPanneau,
  onDeletePanneau,
}: PanneauListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPanneau, setExpandedPanneau] = useState<number | null>(null);
  const [filterProblemes, setFilterProblemes] = useState(false);
  const [showRaisonInput, setShowRaisonInput] = useState<{
    panneauId: number;
    faceId?: number;
    type: 'panneau' | 'face';
  } | null>(null);
  const [raison, setRaison] = useState('');

  // ✅ Filtrer les panneaux
  const panneauxFiltres = panneaux.filter(p => {
    const matchSearch =
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.adresse.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterProblemes) {
      const aProbleme = p.faces?.some(f => f.a_probleme) || p.raison_probleme !== null;
      return matchSearch && aProbleme;
    }
    return matchSearch;
  });

  const hasProblem = (panneau: Panneau) =>
    panneau.faces?.some(f => f.a_probleme) || panneau.raison_probleme !== null;

  const getStatusText = (panneau: Panneau) => {
    const toutesEnPanne =
      panneau.faces?.every(f => f.a_probleme) && (panneau.faces?.length || 0) > 0;
    if (toutesEnPanne || panneau.raison_probleme !== null) return '🔴 Panneau en panne';
    if (panneau.faces?.some(f => f.a_probleme)) return '🟡 Face(s) en panne';
    return '✅ Opérationnel';
  };

  const getStatusColor = (panneau: Panneau) => {
    const toutesEnPanne =
      panneau.faces?.every(f => f.a_probleme) && (panneau.faces?.length || 0) > 0;
    if (toutesEnPanne || panneau.raison_probleme !== null)
      return 'bg-red-100 text-red-700 border-red-300';
    if (panneau.faces?.some(f => f.a_probleme))
      return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-emerald-100 text-emerald-700 border-emerald-300';
  };

  const getProblemCount = (panneau: Panneau) =>
    panneau.faces?.filter(f => f.a_probleme).length || 0;

  const handleDeclarerProbleme = (panneauId: number, faceId?: number) => {
    if (!raison.trim()) {
      alert('Veuillez décrire le problème');
      return;
    }
    if (faceId) {
      onFaceProblem(panneauId, faceId, raison);
    } else {
      onPanneauProblem(panneauId, raison);
    }
    setShowRaisonInput(null);
    setRaison('');
  };

  const handleDelete = (panneau: Panneau) => {
    if (!onDeletePanneau) return;
    const ok = window.confirm(
      `⚠️ Supprimer définitivement le panneau "${panneau.nom}" et toutes ses faces ?`
    );
    if (ok) onDeletePanneau(panneau.id_panneau);
  };

  if (!panneaux || panneaux.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-bold text-gray-700">Chargement des panneaux...</p>
        <p className="text-sm text-gray-500">Veuillez patienter</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
      {/* ==================== EN-TÊTE (RESPONSIVE) ==================== */}
      <div className="p-4 sm:p-5 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-center lg:justify-between">
          {/* Titre */}
          <div className="flex items-center gap-2">
            <Building className="text-blue-600" size={20} />
            <h3 className="text-base sm:text-lg font-bold text-gray-800">
              Liste des panneaux
            </h3>
            <span className="text-xs sm:text-sm text-gray-400 font-bold">
              ({panneauxFiltres.length})
            </span>
          </div>

          {/* Recherche + filtre */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:flex-none">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Rechercher un panneau..."
                className="w-full lg:w-72 xl:w-80 2xl:w-96 pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setFilterProblemes(!filterProblemes)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition w-full sm:w-auto ${
                filterProblemes
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter size={16} />
              Problèmes
              {filterProblemes && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== LISTE ==================== */}
      <div className="divide-y divide-gray-100 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
        {panneauxFiltres.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold">Aucun panneau trouvé</p>
            <p className="text-sm">Ajustez vos filtres ou recherchez autre chose</p>
          </div>
        ) : (
          panneauxFiltres.map((panneau) => (
            <div
              key={panneau.id_panneau}
              className="hover:bg-gray-50 transition"
            >
              {/* ==================== LIGNE PANNEAU ==================== */}
              <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                {/* Partie gauche : expand + infos */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() =>
                      setExpandedPanneau(
                        expandedPanneau === panneau.id_panneau
                          ? null
                          : panneau.id_panneau
                      )
                    }
                    className="p-1 hover:bg-gray-200 rounded-lg transition flex-shrink-0 mt-0.5"
                    aria-label="Expand"
                  >
                    {expandedPanneau === panneau.id_panneau ? (
                      <ChevronUp size={16} className="text-gray-500" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-500" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-gray-800 truncate text-sm sm:text-base">
                        {panneau.nom}
                      </h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${getStatusColor(
                          panneau
                        )}`}
                      >
                        {getStatusText(panneau)}
                      </span>
                    </div>

                    {/* Infos secondaires - wrap automatique */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1 min-w-0">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-none">
                          {panneau.adresse}
                        </span>
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span className="truncate">
                        {panneau.commune}, {panneau.ville}
                      </span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {panneau.faces?.length || 0} face(s)
                      </span>
                      {hasProblem(panneau) && (
                        <span className="text-amber-600 font-bold whitespace-nowrap">
                          • {getProblemCount(panneau)} problème(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ==================== ACTIONS ==================== */}
                <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0 pl-7 lg:pl-0">
                  {/* Modifier */}
                  {onEditPanneau && (
                    <button
                      onClick={() => onEditPanneau(panneau)}
                      className="px-2.5 sm:px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                      title="Modifier le panneau"
                    >
                      <Pencil size={14} />
                      <span className="hidden sm:inline">Modifier</span>
                    </button>
                  )}

                  {/* Supprimer */}
                  {onDeletePanneau && (
                    <button
                      onClick={() => handleDelete(panneau)}
                      className="px-2.5 sm:px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                      title="Supprimer le panneau"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Suppr.</span>
                    </button>
                  )}

                  {/* Signaler / Résoudre */}
                  {!hasProblem(panneau) ? (
                    <button
                      onClick={() =>
                        setShowRaisonInput({
                          panneauId: panneau.id_panneau,
                          type: 'panneau',
                        })
                      }
                      className="px-2.5 sm:px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                    >
                      <AlertTriangle size={14} />
                      <span className="hidden sm:inline">Signaler</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onResoudreProblem(panneau.id_panneau)}
                      className="px-2.5 sm:px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition flex items-center gap-1 whitespace-nowrap"
                    >
                      <CheckCircle size={14} />
                      <span className="hidden sm:inline">Résoudre</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ==================== DÉTAILS DES FACES ==================== */}
              {expandedPanneau === panneau.id_panneau && panneau.faces && (
                <div className="px-3 sm:px-4 pb-4 pt-2 bg-gray-50/50 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3">
                    {panneau.faces.map((face) => (
                      <div
                        key={face.id_face}
                        className={`p-3 rounded-xl border-2 transition ${
                          face.a_probleme
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-gray-700 truncate">
                              Face {face.orientation || face.id_face}
                            </span>
                            {face.a_probleme ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold whitespace-nowrap">
                                ⚠️ Problème
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold whitespace-nowrap">
                                ✓ OK
                              </span>
                            )}
                          </div>
                          {!face.a_probleme ? (
                            <button
                              onClick={() =>
                                setShowRaisonInput({
                                  panneauId: panneau.id_panneau,
                                  faceId: face.id_face,
                                  type: 'face',
                                })
                              }
                              className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                            >
                              Signaler
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                onResoudreProblem(panneau.id_panneau, face.id_face)
                              }
                              className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
                            >
                              Résoudre
                            </button>
                          )}
                        </div>
                        {face.raison_probleme && (
                          <p className="text-xs text-red-600 mt-1 bg-red-50 p-1.5 rounded-lg break-words">
                            <AlertCircle size={12} className="inline mr-1" />
                            {face.raison_probleme}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions panneau entier */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        if (panneau.raison_probleme !== null) {
                          onResoudreProblem(panneau.id_panneau);
                        } else {
                          setShowRaisonInput({
                            panneauId: panneau.id_panneau,
                            type: 'panneau',
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        panneau.raison_probleme !== null
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      {panneau.raison_probleme !== null
                        ? '✅ Résoudre tout'
                        : '⚠️ Panneau entier en panne'}
                    </button>
                    <span className="text-[10px] text-gray-400">
                      {panneau.raison_probleme !== null
                        ? 'Toutes les faces sont bloquées'
                        : 'Signaler une face ou le panneau entier'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ==================== MODAL RAISON ==================== */}
      {showRaisonInput && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">
              {showRaisonInput.type === 'panneau'
                ? '⚠️ Signaler le panneau entier'
                : `⚠️ Signaler la face ${showRaisonInput.faceId}`}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {showRaisonInput.type === 'panneau'
                ? 'Toutes les faces seront bloquées'
                : 'Seule cette face sera bloquée'}
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
              placeholder="Décrivez le problème..."
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRaisonInput(null);
                  setRaison('');
                }}
                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (showRaisonInput.type === 'panneau') {
                    handleDeclarerProbleme(showRaisonInput.panneauId);
                  } else {
                    handleDeclarerProbleme(
                      showRaisonInput.panneauId,
                      showRaisonInput.faceId
                    );
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}