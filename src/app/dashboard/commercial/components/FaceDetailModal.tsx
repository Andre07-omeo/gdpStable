'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/FaceDetailModal.tsx
import { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Building2, MapPin, 
  Clock, AlertCircle, Download, Maximize2, 
  Minimize2, Play, Pause, ExternalLink, Loader2,
  Info, Ruler, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FaceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  faceId: number | null;
  onReserveClick?: (panneau: any, face: any) => void;
}

export function FaceDetailModal({ isOpen, onClose, faceId, onReserveClick }: FaceDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<any>(null);

  useEffect(() => {
    if (isOpen && faceId) {
      fetchFaceDetails();
    }
  }, [isOpen, faceId]);

  const fetchFaceDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/commercials/faces/${faceId}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMouseDown = (url: string, name: string) => {
    const timer = setTimeout(() => {
      if (confirm(`Voulez-vous télécharger cette image ?`)) {
        handleDownload(url, name);
      }
    }, 800);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Vérifie si la face a un problème
  const hasProblem = (face: any): boolean => {
    if (!face) return false;
    const problemValue = face.a_problem ?? 
                        face.a_probleme ?? 
                        face.problem ?? 
                        face.has_problem ?? 
                        face.hasProblem ?? 
                        face.probleme;
    
    if (typeof problemValue === 'number') {
      return problemValue === 1;
    }
    if (typeof problemValue === 'boolean') {
      return problemValue === true;
    }
    if (typeof problemValue === 'string') {
      return problemValue === '1' || problemValue.toLowerCase() === 'true' || problemValue.toLowerCase() === 'oui';
    }
    return false;
  };

  if (!isOpen) return null;

  const faceHasProblem = data?.face ? hasProblem(data.face) : false;

  return (
    <>
      <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[501] bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl mx-auto max-h-[90vh]"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 rounded-t-2xl flex-shrink-0 ${
          faceHasProblem 
            ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700' 
            : 'bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900'
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center gap-2">
                Détails de la face
                {faceHasProblem && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse flex items-center gap-1">
                    <ShieldAlert size={12} />
                    PROBLÈME
                  </span>
                )}
              </p>
              {loading ? (
                <h2 className="text-xl font-bold text-white">Chargement...</h2>
              ) : data ? (
                <>
                  <h2 className="text-xl font-bold text-white">
                    {data.panneau?.nom || 'Panneau'} - Face {data.face?.orientation || 'N/A'}
                  </h2>
                  <p className="text-sm text-blue-300 flex items-center gap-2">
                    <MapPin size={14} />
                    {data.panneau?.adresse}
                  </p>
                </>
              ) : null}
            </div>
            <div className="flex gap-2">
              {onReserveClick && data && (
                <button
                  onClick={() => {
                    if (!faceHasProblem) {
                      // ✅ Fermer le modal de détails et ouvrir le modal de réservation
                      onClose();
                      setTimeout(() => {
                        onReserveClick(data.panneau, data.face);
                      }, 300);
                    }
                  }}
                  disabled={faceHasProblem}
                  className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                    faceHasProblem
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                  title={faceHasProblem ? 'Réservation impossible - Face avec problème' : 'Réserver cette face'}
                >
                  {faceHasProblem ? (
                    <>
                      <ShieldAlert size={16} /> Réservation bloquée
                    </>
                  ) : (
                    <>
                      <Calendar size={16} /> Réserver
                    </>
                  )}
                </button>
              )}
              <button onClick={() => onClose()} className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition text-white">
                <X size={22} />
              </button>
            </div>
          </div>
          {faceHasProblem && (
            <div className="mt-2 px-3 py-1.5 bg-red-900/50 border border-red-400/30 rounded-lg flex items-center gap-2 text-white text-sm animate-pulse">
              <AlertCircle size={16} className="text-red-300" />
              <span className="font-medium">⚠️ Cette face a un problème technique - Réservation temporairement bloquée</span>
            </div>
          )}
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
          ) : data ? (
            <div className="space-y-6">
              {/* Bannière d'avertissement si problème */}
              {faceHasProblem && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <ShieldAlert size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-700">⚠️ Face problématique</h4>
                    <p className="text-sm text-red-600">
                      Cette face est actuellement marquée comme ayant un problème technique. 
                      La réservation est temporairement bloquée jusqu'à résolution du problème.
                    </p>
                    <p className="text-xs text-red-500 mt-1">
                      Veuillez contacter l'équipe technique pour plus d'informations.
                    </p>
                  </div>
                </div>
              )}

              {/* Informations du panneau */}
              <div className={`rounded-xl p-4 border ${
                faceHasProblem 
                  ? 'bg-red-50/50 border-red-200' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
                  <Building2 size={16} /> Informations du panneau
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Nom</p>
                    <p className="font-bold text-gray-800">{data.panneau?.nom || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-bold text-gray-800">{data.panneau?.type || 'Standard'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dimension</p>
                    <p className="font-bold text-gray-800">{data.panneau?.dimension || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">État</p>
                    <p className={`font-bold ${data.panneau?.etat === 'Actif' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {data.panneau?.etat || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  📍 {data.panneau?.commune && `${data.panneau.commune}, `}
                  {data.panneau?.ville && `${data.panneau.ville}, `}
                  {data.panneau?.province || ''}
                </div>
              </div>

              {/* Informations de la face */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`rounded-xl p-3 border ${
                  faceHasProblem ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-xs text-gray-500">ID Face</p>
                  <p className="font-bold text-gray-800">{data.face?.id_face || 'N/A'}</p>
                </div>
                <div className={`rounded-xl p-3 border ${
                  faceHasProblem ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-xs text-gray-500">Orientation</p>
                  <p className="font-bold text-gray-800 uppercase">{data.face?.orientation || 'N/A'}</p>
                </div>
                <div className={`rounded-xl p-3 border ${
                  faceHasProblem ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-xs text-gray-500">Type de face</p>
                  <p className="font-bold text-gray-800">{data.face?.type_face?.libelle || 'Standard'}</p>
                </div>
                <div className={`rounded-xl p-3 border ${
                  faceHasProblem ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`font-bold ${data.face?.est_active ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.face?.est_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {/* Affichage du problème si présent */}
              {faceHasProblem && (
                <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-bold text-red-700">État : Problème détecté</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    Cette face est actuellement indisponible pour la réservation en raison d'un problème technique.
                  </p>
                </div>
              )}

              {/* Réservations */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar size={16} /> Réservations
                  <span className="text-xs text-gray-400">({data.total_reservations || 0})</span>
                </h3>
                
                {data.total_reservations === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Aucune réservation pour cette face</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.reservations.map((reservation: any, index: number) => {
                      const isPending = reservation.statut === 'En attente' || reservation.statut === 'En attente de validation';
                      const isExpired = reservation.statut === 'Expirée' || 
                        (reservation.date_expiration && new Date() > new Date(reservation.date_expiration));
                      
                      return (
                        <div 
                          key={index}
                          className={`border-2 rounded-xl p-4 ${
                            isPending ? 'border-amber-300 bg-amber-50/50 animate-pulse' :
                            isExpired ? 'border-red-300 bg-red-50/50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          {/* Titre de la réservation */}
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                  #{(index + 1)}
                                </span>
                                {reservation.client_nom || reservation.societeLocatrice || 'Client inconnu'}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <User size={14} />
                                Commercial: {reservation.commercial_nom || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Commande: {reservation.numero_commande || 'N/A'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              isPending ? 'bg-amber-200 text-amber-700 animate-pulse' :
                              isExpired ? 'bg-red-200 text-red-700' :
                              'bg-emerald-200 text-emerald-700'
                            }`}>
                              {isPending ? '⏳ En attente' : 
                               isExpired ? '❌ Expirée' : 
                               reservation.statut || 'Confirmée'}
                            </span>
                          </div>
                          
                          {/* Dates */}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar size={14} /> 
                              Début: {reservation.dateDebut || 'N/A'}
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar size={14} /> 
                              Fin: {reservation.dateFin || 'N/A'}
                            </div>
                          </div>
                          
                          {isPending && (
                            <div className="mt-2 text-xs text-amber-600 font-bold flex items-center gap-1 animate-pulse">
                              <AlertCircle size={12} />
                              En attente de validation comptable
                            </div>
                          )}
                          
                          {isExpired && (
                            <div className="mt-2 text-xs text-red-600 font-bold flex items-center gap-1">
                              <AlertCircle size={12} />
                              Réservation expirée
                            </div>
                          )}

                          {/* Photo / Média */}
                          {reservation.photoCampagneUrl && (
                            <div className="mt-3">
                              <div 
                                className="relative rounded-xl overflow-hidden cursor-pointer border-2 border-gray-200"
                                onMouseDown={() => handleMouseDown(reservation.photoCampagneUrl, `reservation_${index}_${Date.now()}`)}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => setExpandedImage(reservation.photoCampagneUrl)}
                              >
                                <img 
                                  src={reservation.photoCampagneUrl} 
                                  alt="Campagne"
                                  className="w-full h-48 object-cover hover:opacity-90 transition"
                                />
                                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                                  <Maximize2 size={12} />
                                  Cliquer pour agrandir
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-between items-center">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              ID Panneau: {data?.panneau?.id_panneau || 'N/A'}
            </p>
            {faceHasProblem && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                <ShieldAlert size={10} />
                Réservation bloquée
              </span>
            )}
          </div>
          <button
            onClick={() => onClose()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition"
          >
            Fermer
          </button>
        </div>
      </motion.div>

      {/* Modal d'agrandissement d'image */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            >
              <img 
                src={expandedImage} 
                alt="Agrandissement"
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <button
                  onClick={() => {
                    handleDownload(expandedImage, `image_${Date.now()}`);
                  }}
                  className="px-4 py-2 bg-white/20 text-white rounded-lg font-bold hover:bg-white/30 transition flex items-center gap-2 backdrop-blur-sm"
                >
                  <Download size={16} /> Télécharger
                </button>
                <button
                  onClick={() => setExpandedImage(null)}
                  className="px-4 py-2 bg-red-500/80 text-white rounded-lg font-bold hover:bg-red-600 transition"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}