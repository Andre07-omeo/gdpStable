'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/PanneauReservationsModal.tsximport { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Building2, Loader2, 
  AlertCircle, Check, Clock, AlertTriangle, MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PanneauReservationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panneau: any;
  onReserveClick?: (panneau: any, face: any) => void;
}

export function PanneauReservationsModal({ 
  isOpen, 
  onClose, 
  panneau, 
  onReserveClick 
}: PanneauReservationsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && panneau) {
      fetchReservations();
    }
  }, [isOpen, panneau]);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const panneauId = panneau.id_panneau || panneau.id;
      const res = await fetch(`/api/commercials/panneaux/${panneauId}/reservations`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      setError('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isPending = (statut: string) => {
    return statut === 'En attente' || statut === 'En attente de validation';
  };

  const isExpired = (reservation: any) => {
    if (reservation.statut === 'Expirée') return true;
    if (reservation.date_expiration) {
      return new Date() > new Date(reservation.date_expiration);
    }
    return false;
  };

  // ✅ Fonction pour obtenir le numéro de face (F1, F2, F3...)
  const getFaceLabel = (faceId: number) => {
    if (!data?.reservations_by_face) return `Face ${faceId}`;
    const index = data.reservations_by_face.findIndex((f: any) => f.face_id === faceId);
    return index !== -1 ? `F${index + 1}` : `Face ${faceId}`;
  };

  // ✅ Fonction pour obtenir l'orientation d'une face
  const getFaceOrientation = (faceId: number) => {
    if (!data?.reservations_by_face) return null;
    const face = data.reservations_by_face.find((f: any) => f.face_id === faceId);
    return face?.orientation || null;
  };

  return (
    <>
      <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[501] bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl mx-auto max-h-[90vh]"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Réservations</p>
              <h2 className="text-xl font-bold text-white">
                {panneau?.nom || 'Panneau'}
              </h2>
              <p className="text-sm text-blue-300 flex items-center gap-1">
                <MapPin size={14} /> {panneau?.adresse}
              </p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <AlertCircle size={48} className="mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : data && data.total_reservations === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Calendar size={64} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Aucune réservation pour ce panneau</p>
              <p className="text-sm">Toutes les faces sont libres</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Résumé */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">{data.total_reservations}</p>
                  <p className="text-xs text-gray-500">Total réservations</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-200">
                  <p className="text-2xl font-bold text-amber-600">
                    {data.reservations?.filter((r: any) => isPending(r.statut)).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">En attente</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
                  <p className="text-2xl font-bold text-emerald-600">
                    {data.reservations?.filter((r: any) => r.statut === 'Confirmée' || r.statut === 'Validée').length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Confirmées</p>
                </div>
              </div>

              {/* ✅ Réservations par face avec titres F1, F2, F3... */}
              {data.reservations_by_face?.map((faceGroup: any, index: number) => {
                const faceLabel = `F${index + 1}`;
                const orientation = faceGroup.orientation || 'N/A';
                
                return (
                  <div key={faceGroup.face_id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <Building2 size={16} />
                        🏷️ Réservations de la face <span className="text-blue-600">{faceLabel}</span>
                        <span className="text-xs text-gray-400">
                          ({faceGroup.reservations.length} réservation(s)) - Orientation: {orientation}
                        </span>
                      </h3>
                      {onReserveClick && panneau && (
                        <button
                          onClick={() => {
                            const face = panneau.faces?.find((f: any) => f.id_face === faceGroup.face_id);
                            if (face) {
                              onReserveClick(panneau, face);
                              onClose();
                            }
                          }}
                          className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition"
                        >
                          <Calendar size={12} className="inline mr-1" /> Réserver cette face
                        </button>
                      )}
                    </div>
                    <div className="p-3 space-y-3">
                      {faceGroup.reservations.map((reservation: any, idx: number) => {
                        const pending = isPending(reservation.statut);
                        const expired = isExpired(reservation);
                        
                        return (
                          <div 
                            key={idx}
                            className={`border rounded-lg p-3 ${
                              pending ? 'border-amber-300 bg-amber-50/50' :
                              expired ? 'border-red-300 bg-red-50/50' :
                              'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-800">
                                  {reservation.client_nom || 'Client inconnu'}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  <User size={14} />
                                  Commercial: {reservation.commercial_nom || 'N/A'}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                pending ? 'bg-amber-200 text-amber-700 animate-pulse' :
                                expired ? 'bg-red-200 text-red-700' :
                                'bg-emerald-200 text-emerald-700'
                              }`}>
                                {pending ? '⏳ En attente' : 
                                 expired ? '❌ Expirée' : 
                                 reservation.statut || 'Confirmée'}
                              </span>
                            </div>
                            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <span>📅 Début: {reservation.dateDebut || 'N/A'}</span>
                              <span>📅 Fin: {reservation.dateFin || 'N/A'}</span>
                            </div>
                            {reservation.numero_commande && (
                              <p className="text-xs text-gray-400 mt-1">Commande: {reservation.numero_commande}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {data?.total_reservations || 0} réservation(s) au total
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}