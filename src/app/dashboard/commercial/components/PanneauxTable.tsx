// src/app/dashboard/commercial/components/PanneauxTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Eye, MapPin, Calendar, Building2, ChevronDown, ChevronRight,
  User, Clock, Ruler, AlertTriangle, AlertCircle, ShieldAlert, XCircle, Timer,
  Layout, LayoutGrid, Grid, Layers, Box, ShoppingCart, CheckCircle
} from 'lucide-react';
import { CommercialPanneau, CommercialFace } from '../types/commercial.types';
import { useCart } from '@/context/CartContext';
import { CartItem, Currency } from '@/context/CartContext';

interface PanneauxTableProps {
  panneaux: CommercialPanneau[];
  onFaceClick: (panneau: CommercialPanneau, face: CommercialFace) => void;
  onReserveClick: (panneau: CommercialPanneau, face?: CommercialFace) => void;
  loading?: boolean;
}

export function PanneauxTable({ panneaux, onFaceClick, onReserveClick, loading = false }: PanneauxTableProps) {
  const [expandedPanneaux, setExpandedPanneaux] = useState<Set<string>>(new Set());
  const [, setCurrentTime] = useState(new Date());
  const { addItem, removeItem, isInCart, items } = useCart();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getPanneauKey = (panneau: CommercialPanneau): string => {
    return String((panneau as any).idPan ?? (panneau as any).id_panneau ?? (panneau as any).id ?? '');
  };

  const togglePanneau = (id: string) => {
    setExpandedPanneaux((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  };

  const getStatusColor = (statut: string): string => {
    switch (statut) {
      case 'Libre': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Occupé': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Réservé': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'En attente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Problème': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (statut: string): string => {
    switch (statut) {
      case 'Libre': return 'bg-emerald-500';
      case 'Occupé': return 'bg-blue-500';
      case 'Réservé': return 'bg-purple-500';
      case 'En attente': return 'bg-amber-500';
      case 'Problème': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (statut: string): string => {
    switch (statut) {
      case 'Libre': return '🟢';
      case 'Occupé': return '🔵';
      case 'Réservé': return '🟣';
      case 'En attente': return '🟡';
      case 'Problème': return '🔴';
      default: return '⚪';
    }
  };

  const getTypeFaceIcon = (type: string) => {
    const typeLower = type?.toLowerCase() || '';
    if (typeLower.includes('classique') || typeLower.includes('standard')) {
      return <Layout size={16} className="text-gray-500" />;
    }
    if (typeLower.includes('scroller') || typeLower.includes('défileur')) {
      return <LayoutGrid size={16} className="text-blue-500" />;
    }
    if (typeLower.includes('digital') || typeLower.includes('led') || typeLower.includes('lcd')) {
      return <Grid size={16} className="text-purple-500" />;
    }
    if (typeLower.includes('panoramique')) {
      return <Layers size={16} className="text-green-500" />;
    }
    if (typeLower.includes('lumineux')) {
      return <Grid size={16} className="text-orange-500" />;
    }
    if (typeLower.includes('bâche') || typeLower.includes('bache')) {
      return <Layout size={16} className="text-teal-500" />;
    }
    if (typeLower.includes('trivision')) {
      return <Layers size={16} className="text-indigo-500" />;
    }
    return <Box size={16} className="text-gray-400" />;
  };

  const getDimensionM2 = (face: CommercialFace): string => {
    if ((face as any).dimension_m2) {
      return (face as any).dimension_m2;
    }
    const hauteur = (face as any).hauteur_cm || 0;
    const largeur = (face as any).largeur_cm || 0;
    if (hauteur > 0 && largeur > 0) {
      const m2 = (hauteur * largeur) / 10000;
      return m2.toFixed(2) + ' m²';
    }
    return 'N/A';
  };

  const isReservationPending = (reservation: any): boolean => {
    if (!reservation) return false;
    const statut = reservation.statut || '';
    return statut === 'En attente' || statut === 'En attente de validation';
  };

  const hasProblem = (face: CommercialFace): boolean => {
    return face.a_probleme === 1;
  };

  const getClientFullName = (face: CommercialFace): string => {
    if (face.client_prenom && face.client_nom) {
      return `${face.client_prenom} ${face.client_nom}`;
    }
    return face.client_nom || 'N/A';
  };

  const getCommercialFullName = (face: CommercialFace): string => {
    if (face.commercial_prenom && face.commercial_nom) {
      return `${face.commercial_prenom} ${face.commercial_nom}`;
    }
    return face.commercial_nom || 'N/A';
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const getDuration = (dateDebut: string | null, dateFin: string | null): number | null => {
    if (!dateDebut || !dateFin) return null;
    try {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      return Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const getTimerColor = (hours: number) => {
    if (hours <= 0) return 'text-red-600';
    if (hours <= 2) return 'text-orange-600 animate-pulse';
    if (hours <= 6) return 'text-amber-600';
    if (hours <= 12) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleToggleCart = (panneau: CommercialPanneau, face: CommercialFace, e: React.MouseEvent) => {
    e.stopPropagation();

    if (hasProblem(face)) {
      alert('❌ Impossible d\'ajouter cette face au panier car elle a un problème.');
      return;
    }

    const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(String(face.id_face) || '0');
    const panneauId = typeof panneau.idPan === 'number' ? panneau.idPan : parseInt(String(panneau.idPan) || '0');

    if (isInCart(faceId)) {
      removeItem(faceId);
      return;
    }

    const cartItem: CartItem = {
      id_face: faceId,
      id_panneau: panneauId,
      panneau_nom: panneau.nom || 'Panneau sans nom',
      panneau_adresse: panneau.adresse || 'Adresse non définie',
      panneau_ville: (panneau as any).ville || 'Non spécifié',
      panneau_quartier: (panneau as any).quartier || 'Non spécifié',
      orientation: face.orientation || 'N/A',
      type_face: face.type_face || 'Standard',
      dimension_m2: getDimensionM2(face),
      statut: face.status || 'Libre',
      date_debut: face.date_debut || undefined,
      date_fin: face.date_fin || undefined,
      prix_saisi: (face as any).prix_saisi || 0,
      hauteur_cm: (face as any).hauteur_cm || 0,
      largeur_cm: (face as any).largeur_cm || 0,
      id_face_original: faceId,
      currency: 'USD' as Currency
    };

    addItem(cartItem);
  };

  const isFaceInCart = (face: CommercialFace): boolean => {
    const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(String(face.id_face) || '0');
    return isInCart(faceId);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des panneaux...</p>
      </div>
    );
  }

  if (!panneaux || panneaux.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-600">Aucun panneau trouvé</h3>
        <p className="text-sm text-gray-400 mt-1">Ajustez vos filtres pour voir plus de résultats</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* ✅ CONTENEUR SCROLLABLE INTERNE : le scroll vertical ET horizontal se fait ici */}
      <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[400px]">
        <table className="w-full min-w-[1900px] border-collapse">
          {/* ✅ HEADER STICKY AU TOP DU CONTENEUR SCROLLABLE */}
          <thead className="sticky top-0 z-30">
            <tr className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800">
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[200px] sticky left-0 z-40 bg-gradient-to-r from-blue-800 to-blue-700">
                Panneau / Adresse
              </th>
              <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[70px] bg-blue-800">
                Faces
              </th>
              <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[220px] bg-blue-800">
                Actions
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[80px] bg-blue-800">
                N° Face
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[90px] bg-blue-800">
                Type
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[100px] bg-blue-800">
                Orientation
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[90px] bg-blue-800">
                Dim. (m²)
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[180px] bg-blue-800">
                Client
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[160px] bg-blue-800">
                Commercial
              </th>
              <th className="px-4 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-r border-blue-600/40 min-w-[200px] bg-blue-800">
                Période
              </th>
              <th className="px-4 py-4 text-center text-sm font-bold text-white uppercase tracking-wider min-w-[150px] bg-blue-800">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {panneaux.map((panneau) => {
              const faces = panneau.faces || [];
              const panneauKey = getPanneauKey(panneau);
              const isExpanded = expandedPanneaux.has(panneauKey);
              const hasAnyProblem = faces.some(face => hasProblem(face));

              return (
                <React.Fragment key={panneauKey}>
                  <tr
                    className={'hover:bg-blue-50/50 transition-colors cursor-pointer ' + (panneau.etatPanneau === 'En panne' ? 'bg-red-50/30' : '')}
                    onClick={() => togglePanneau(panneauKey)}
                  >
                    <td className="px-4 py-3 sticky left-0 z-20 bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-700 truncate">
                          {panneau.nom || 'Sans nom'}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        {hasAnyProblem && (
                          <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse flex items-center gap-1">
                            <AlertTriangle size={10} /> PROBLÈME
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5 truncate max-w-[200px]">
                        📍 {panneau.adresse || 'Adresse non définie'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-base font-bold text-blue-600">
                      {faces.length}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400 text-sm" colSpan={9}>
                      <span className="text-blue-500 font-medium">
                        {panneau.etatPanneau === 'En panne' ? '⛔ Panneau en panne' : 'Cliquez pour voir les faces'}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && panneau.etatPanneau !== 'En panne' && faces.map((face, idx) => {
                    const faceHasProblem = hasProblem(face);
                    const isPending = isReservationPending(face.reservation);
                    const hasReservation = !!face.reservation;
                    const clientName = getClientFullName(face);
                    const commercialName = getCommercialFullName(face);
                    const duration = getDuration(face.date_debut, face.date_fin);
                    const remainingTime = face.remaining_time;
                    const inCart = isFaceInCart(face);

                    let rowClasses = 'hover:bg-blue-50/30 transition-colors bg-blue-50/10';

                    if (faceHasProblem) {
                      rowClasses = 'hover:bg-red-100/70 transition-colors bg-red-50/90 border-l-4 border-red-500';
                    } else if (isPending) {
                      rowClasses = 'animate-pulse bg-amber-50/30';
                    } else if (face.status === 'Occupé') {
                      rowClasses = 'hover:bg-blue-50/50 transition-colors bg-blue-50/10';
                    }

                    return (
                      <tr
                        key={panneauKey + '-face-' + idx}
                        className={rowClasses}
                      >
                        <td className="px-4 py-3 sticky left-0 z-20 bg-inherit">
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-sm text-blue-400">
                              └── F{idx + 1}
                            </span>
                            {faceHasProblem && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                                <XCircle size={12} /> PROBLÈME
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3" colSpan={1}></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFaceClick(panneau, face);
                              }}
                              className="px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded text-sm font-bold hover:bg-blue-200 transition"
                              title="Voir les détails"
                            >
                              <Eye size={14} className="inline" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!faceHasProblem) {
                                  onReserveClick(panneau, face);
                                }
                              }}
                              disabled={faceHasProblem}
                              className={`px-2.5 py-1.5 rounded text-sm font-bold transition ${
                                faceHasProblem
                                  ? 'bg-red-200 text-red-500 cursor-not-allowed border border-red-300'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              }`}
                              title={faceHasProblem ? '❌ Réservation impossible - Face avec problème' : 'Réserver cette face'}
                            >
                              <Calendar size={14} className="inline" />
                              {faceHasProblem ? '❌' : 'Réserver'}
                            </button>

                            <button
                              onClick={(e) => handleToggleCart(panneau, face, e)}
                              disabled={faceHasProblem}
                              className={`px-2.5 py-1.5 rounded text-sm font-bold transition flex items-center gap-1 ${
                                faceHasProblem
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : inCart
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              }`}
                              title={faceHasProblem ? '❌ Face avec problème' : inCart ? 'Retirer du panier' : 'Ajouter au panier'}
                            >
                              {inCart ? (
                                <>
                                  <CheckCircle size={14} /> ✓
                                </>
                              ) : (
                                <>
                                  <ShoppingCart size={14} /> +
                                </>
                              )}
                            </button>
                          </div>
                          {faceHasProblem && (
                            <div className="text-[10px] text-red-600 font-bold mt-1 animate-pulse flex items-center justify-center gap-1">
                              <XCircle size={12} /> Réservation bloquée
                            </div>
                          )}
                          {inCart && !faceHasProblem && (
                            <div className="text-[10px] text-green-600 font-bold mt-1 flex items-center justify-center gap-1">
                              <CheckCircle size={12} /> Dans le panier
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-indigo-600">
                          {face.id_face?.toString() || 'F' + (idx + 1)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {getTypeFaceIcon(face.type_face)}
                            <span className="text-sm font-semibold text-gray-700">
                              {face.type_face || 'Non défini'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700 uppercase">
                          {face.orientation || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                          {getDimensionM2(face)}
                        </td>
                        <td className="px-4 py-3">
                          {hasReservation && !faceHasProblem ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
                                <Building2 size={14} className="inline text-gray-400 mr-1" />
                                {clientName}
                              </span>
                              {face.reservation?.client_email && (
                                <span className="text-[11px] text-gray-400 truncate max-w-[160px]">
                                  {face.reservation.client_email}
                                </span>
                              )}
                            </div>
                          ) : faceHasProblem ? (
                            <span className="text-red-500 text-sm flex items-center gap-1 font-bold">
                              <XCircle size={14} /> Face problématique
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasReservation && !faceHasProblem ? (
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-700 truncate max-w-[140px]">
                                <User size={14} className="inline text-gray-400 mr-1" />
                                {commercialName}
                              </span>
                              {face.reservation?.commercial_email && (
                                <span className="text-[11px] text-gray-400 truncate max-w-[140px]">
                                  {face.reservation.commercial_email}
                                </span>
                              )}
                            </div>
                          ) : faceHasProblem ? (
                            <span className="text-red-400 text-sm flex items-center gap-1">-</span>
                          ) : (
                            <span className="text-gray-300 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {hasReservation && face.date_debut && face.date_fin && !faceHasProblem ? (
                            <div className="flex flex-col">
                              <span className={`text-sm font-medium ${isPending ? 'text-amber-600 animate-pulse' : 'text-gray-700'}`}>
                                📅 {formatDate(face.date_debut)} → {formatDate(face.date_fin)}
                              </span>
                              {duration && (
                                <span className="text-[11px] text-gray-400">
                                  Durée: {duration} jours
                                </span>
                              )}
                              {isPending && remainingTime && (
                                <span className={`text-[11px] font-bold ${getTimerColor(remainingTime.hours)} flex items-center gap-1 mt-0.5`}>
                                  <Timer size={12} />
                                  {remainingTime.expired ? '⏰ Expirée' : remainingTime.label}
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[11px] text-amber-600 font-bold animate-pulse flex items-center gap-1">
                                  <AlertCircle size={12} /> En attente de validation
                                </span>
                              )}
                            </div>
                          ) : faceHasProblem ? (
                            <span className="text-red-400 text-[12px] flex items-center gap-1 font-bold">
                              <XCircle size={14} /> Réservation indisponible
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {faceHasProblem ? (
                            <span className="px-2.5 py-1 rounded-full text-sm font-bold border border-red-500 bg-red-200 text-red-700 flex items-center gap-1 justify-center animate-pulse">
                              <XCircle size={14} /> Problème
                            </span>
                          ) : hasReservation ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-2.5 py-1 rounded-full text-sm font-bold border ${
                                isPending
                                  ? 'border-amber-300 bg-amber-100 text-amber-700 animate-pulse'
                                  : getStatusColor(face.status)
                              } flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : getStatusDot(face.status)}`} />
                                {getStatusIcon(face.status)} {face.status}
                              </span>
                              {isPending && remainingTime && (
                                <span className={`text-[10px] font-bold ${getTimerColor(remainingTime.hours)} flex items-center gap-0.5`}>
                                  <Timer size={10} />
                                  {remainingTime.expired ? 'Expirée' : remainingTime.label}
                                </span>
                              )}
                              {face.reservation?.statut && (
                                <span className="text-[10px] text-gray-400">
                                  {face.reservation.statut}
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] text-amber-600 font-bold animate-pulse">
                                  ⚠️ Validation requise
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-sm font-bold border bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1 justify-center">
                              🟢 Libre
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-gray-600">
            📊 {panneaux.length} panneau(x)
          </span>
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-gray-600">
            🎯 {panneaux.reduce((acc, p) => acc + (p.faces || []).length, 0)} face(s)
          </span>
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-red-600">
            ❌ {panneaux.reduce((acc, p) => acc + (p.faces || []).filter(f => hasProblem(f)).length, 0)} face(s) avec problème
          </span>
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-amber-600">
            ⏳ {panneaux.reduce((acc, p) => acc + (p.faces || []).filter(f => isReservationPending(f.reservation)).length, 0)} en attente
          </span>
          <span className="text-gray-300">•</span>
          <span className="font-semibold text-green-600">
            🛒 {items.length} dans le panier
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            En attente
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Occupé
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Réservé
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            ❌ Problème
          </span>
        </div>
        <div className="text-sm text-gray-400">
          Dernière mise à jour: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}