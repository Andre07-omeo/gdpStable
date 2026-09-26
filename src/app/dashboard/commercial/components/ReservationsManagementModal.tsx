'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/ReservationsManagementModal.tsximport React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Search,
  Loader2,
  RefreshCw,
  Building2,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { ProlongationModal } from './ProlongationModal';
import { ModificationModal } from './ModificationModal';

// ============================================
// TYPES
// ============================================
interface Reservation {
  id_reservation: number;
  numero_commande: string;
  date_creation: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: string;
  notes: string | null;
  date_expiration: string | null;
  est_verrouille: number;
  date_verrouillage: string | null;
  photoCampagneUrl: string | null;
  id_client: number;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  client_ville: string;
  commercial_id: number;
  commercial_nom: string;
  commercial_prenom: string;
  commercial_email: string;
  id_ligne: number;
  id_face: number;
  ligne_date_debut: string;
  ligne_date_fin: string;
  prix_vente_net: number;
  statut_diffusion: string;
  face_orientation: string;
  id_panneau: number;
  panneau_nom: string;
  panneau_adresse: string;
  panneau_ville: string;
  panneau_commune: string;
  panneau_province: string;
  panneau_etat: string;
  jours_restants: number;
}

interface ReservationsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// HELPER : FORMAT DATE
// ============================================
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ============================================
// HELPER : BADGE STATUT
// ============================================
function getStatutBadge(statut: string) {
  const styles: Record<string, { color: string; label: string }> = {
    'En attente': {
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      label: '⏳ En attente',
    },
    ACTIVE: {
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      label: '🔵 Active',
    },
    Confirmée: {
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      label: '✅ Confirmée',
    },
    Diffusée: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      label: '📢 Diffusée',
    },
    Terminée: {
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      label: '✔️ Terminée',
    },
    Expirée: {
      color: 'bg-red-100 text-red-700 border-red-300',
      label: '⏰ Expirée',
    },
    Annulée: {
      color: 'bg-red-100 text-red-700 border-red-300',
      label: '❌ Annulée',
    },
  };

  const style = styles[statut] || {
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    label: statut,
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.color}`}
    >
      {style.label}
    </span>
  );
}

// ============================================
// MODAL PRINCIPAL
// ============================================
export function ReservationsManagementModal({
  isOpen,
  onClose,
}: ReservationsManagementModalProps) {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('TOUS');

  // ✅ États pour les modals
  const [isProlongationOpen, setIsProlongationOpen] = useState(false);
  const [isModificationOpen, setIsModificationOpen] = useState(false);
  const [selectedReservationForProlongation, setSelectedReservationForProlongation] =
    useState<any>(null);
  const [selectedReservationForModification, setSelectedReservationForModification] =
    useState<any>(null);

  // ✅ Charger les réservations
  const fetchReservations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statutFilter !== 'TOUS') params.append('statut', statutFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `/api/commercials/reservations-manage?${params.toString()}`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.success) {
        setReservations(data.data || []);
      } else {
        console.error('Erreur:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
  }, [isOpen, statutFilter]);

  // ✅ Recherche avec debounce
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchReservations();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ Stats
  const stats = {
    total: reservations.length,
    enAttente: reservations.filter((r) => r.statut === 'En attente').length,
    actives: reservations.filter(
      (r) => r.statut === 'ACTIVE' || r.statut === 'Confirmée'
    ).length,
    expirees: reservations.filter((r) => r.statut === 'Expirée').length,
  };

  // ✅ Peut-on prolonger / modifier ?
  const canProlonger = (resa: Reservation): boolean => {
    return (
      resa.jours_restants > 14 &&
      (resa.statut === 'ACTIVE' || resa.statut === 'Confirmée')
    );
  };

  const canModifier = (resa: Reservation): boolean => {
    return resa.est_verrouille !== 1 || resa.statut !== 'ACTIVE';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* ============================================ */}
          {/* HEADER BLEU */}
          {/* ============================================ */}
          <div className="bg-gradient-to-r from-[#00539B] to-[#0077cc] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">
                  Gestion des réservations
                </p>
                <h2 className="text-lg font-bold text-white">
                  Mes réservations
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition"
              title="Fermer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* ============================================ */}
          {/* STATS COMPACTES */}
          {/* ============================================ */}
          <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            {[
              {
                icon: Calendar,
                value: stats.total,
                label: 'Total',
                color: 'text-gray-700',
                bg: 'bg-gray-100',
              },
              {
                icon: Clock,
                value: stats.enAttente,
                label: 'En attente',
                color: 'text-amber-700',
                bg: 'bg-amber-100',
              },
              {
                icon: CheckCircle,
                value: stats.actives,
                label: 'Actives',
                color: 'text-blue-700',
                bg: 'bg-blue-100',
              },
              {
                icon: XCircle,
                value: stats.expirees,
                label: 'Expirées',
                color: 'text-red-700',
                bg: 'bg-red-100',
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200"
                >
                  <div
                    className={`w-7 h-7 rounded-md ${s.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-base font-bold ${s.color} leading-none`}
                    >
                      {s.value}
                    </p>
                    <p className="text-[9px] text-gray-500 truncate">
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================ */}
          {/* FILTRES */}
          {/* ============================================ */}
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Recherche */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher (n° commande, client, panneau...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Filtres statut */}
              <div className="flex gap-1 flex-wrap">
                {[
                  { value: 'TOUS', label: 'Tous' },
                  { value: 'En attente', label: 'En attente' },
                  { value: 'ACTIVE', label: 'Actives' },
                  { value: 'Confirmée', label: 'Confirmées' },
                  { value: 'Diffusée', label: 'Diffusées' },
                  { value: 'Expirée', label: 'Expirées' },
                  { value: 'Annulée', label: 'Annulées' },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setStatutFilter(f.value)}
                    className={`
                      px-2.5 py-1.5 rounded-lg text-xs font-bold transition
                      ${
                        statutFilter === f.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <button
                onClick={fetchReservations}
                disabled={loading}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                title="Actualiser"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* ============================================ */}
          {/* LISTE DES RÉSERVATIONS */}
          {/* ============================================ */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-500 mt-2">
                  Chargement des réservations...
                </p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-14 h-14 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-bold text-sm">
                  Aucune réservation trouvée
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchTerm || statutFilter !== 'TOUS'
                    ? 'Essayez de modifier vos filtres'
                    : 'Aucune réservation pour le moment'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reservations.map((resa) => {
                  const peutProlonger = canProlonger(resa);
                  const peutModifier = canModifier(resa);

                  return (
                    <div
                      key={resa.id_ligne}
                      className="border-2 border-gray-200 rounded-xl p-3 hover:shadow-md hover:border-blue-300 transition bg-white"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        {/* N° commande + statut */}
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">
                              {resa.numero_commande}
                            </p>
                            <div className="mt-0.5">
                              {getStatutBadge(resa.statut)}
                            </div>
                          </div>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-1.5 min-w-[160px]">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {resa.client_nom || 'Client'}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {resa.client_email}
                            </p>
                          </div>
                        </div>

                        {/* Panneau + face */}
                        <div className="flex items-center gap-1.5 min-w-[180px] flex-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {resa.panneau_nom} - {resa.face_orientation}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {resa.panneau_adresse}
                            </p>
                          </div>
                        </div>

                        {/* Commercial */}
                        <div className="flex items-center gap-1.5 min-w-[130px]">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">
                              {resa.commercial_prenom} {resa.commercial_nom}
                            </p>
                          </div>
                        </div>

                        {/* Période */}
                        <div className="flex items-center gap-1.5 min-w-[180px]">
                          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-700">
                              {formatDate(resa.date_debut_campagne)} →{' '}
                              {formatDate(resa.date_fin_campagne)}
                            </p>
                            {resa.date_expiration && (
                              <p className="text-[10px] text-amber-600 font-semibold">
                                ⏰ Expire: {formatDateTime(resa.date_expiration)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Prix */}
                        <div className="min-w-[100px] text-right">
                          <p className="text-xs font-bold text-blue-600">
                            {Number(resa.prix_vente_net || 0).toLocaleString()} FC
                          </p>
                          <p
                            className={`text-[10px] ${
                              resa.jours_restants > 0
                                ? resa.jours_restants > 14
                                  ? 'text-emerald-600 font-semibold'
                                  : 'text-amber-600 font-semibold'
                                : 'text-red-500 font-semibold'
                            }`}
                          >
                            {resa.jours_restants > 0
                              ? `${resa.jours_restants}j restants`
                              : 'Échue'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Voir détails */}
                          <button
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition"
                            title="Voir détails"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* ✅ Prolonger */}
                          <button
                            onClick={() => {
                              setSelectedReservationForProlongation(resa);
                              setIsProlongationOpen(true);
                            }}
                            disabled={!peutProlonger}
                            className={`
                              p-1.5 rounded-lg transition
                              ${
                                peutProlonger
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              }
                            `}
                            title={
                              peutProlonger
                                ? 'Prolonger la réservation'
                                : `Prolongation impossible (${resa.jours_restants}j restants)`
                            }
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* ✅ Modifier */}
                          <button
                            onClick={() => {
                              setSelectedReservationForModification(resa);
                              setIsModificationOpen(true);
                            }}
                            disabled={!peutModifier}
                            className={`
                              p-1.5 rounded-lg transition
                              ${
                                peutModifier
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                              }
                            `}
                            title={
                              peutModifier
                                ? 'Modifier la réservation'
                                : 'Réservation verrouillée'
                            }
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================ */}
          {/* FOOTER */}
          {/* ============================================ */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="text-xs text-gray-500">
              {reservations.length} réservation(s)
            </div>
            <button
              onClick={onClose}
              className="px-5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-sm transition"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}
      <ProlongationModal
        isOpen={isProlongationOpen}
        onClose={() => {
          setIsProlongationOpen(false);
          setSelectedReservationForProlongation(null);
        }}
        onSuccess={fetchReservations}
        reservation={selectedReservationForProlongation}
      />

      <ModificationModal
        isOpen={isModificationOpen}
        onClose={() => {
          setIsModificationOpen(false);
          setSelectedReservationForModification(null);
        }}
        onSuccess={fetchReservations}
        reservation={selectedReservationForModification}
      />
    </>
  );
}