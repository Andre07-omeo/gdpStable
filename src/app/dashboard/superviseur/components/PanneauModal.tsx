// src/app/dashboard/superviseur/components/PanneauModal.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, MapPin, Calendar, Users, Building, ChevronRight, 
  Clock, CheckCircle, Plus, Loader2
} from 'lucide-react';

interface PanneauModalProps {
  isOpen: boolean;
  panneau: any;
  onClose: () => void;
  onSelectReservation: (reservation: any) => void;
  user: any;
}

export default function PanneauModal({ 
  isOpen, 
  panneau, 
  onClose, 
  onSelectReservation,
  user 
}: PanneauModalProps) {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && panneau) {
      loadReservationsFromAPI();
    }
  }, [isOpen, panneau]);

  // ✅ Charger les réservations depuis l'API corrigée
  const loadReservationsFromAPI = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const url = `/api/superviseurs/reservations/en-cours?panneauId=${panneau.id_panneau}`;
      console.log('📡 URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Réponse status:', response.status);
      
      if (response.status === 401) {
        setApiError('❌ Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Données API:', data);
      
      if (data.success && data.data) {
        const formattedReservations: any[] = [];
        
        data.data.forEach((reservation: any) => {
          if (reservation.lignes && reservation.lignes.length > 0) {
            reservation.lignes.forEach((ligne: any) => {
              formattedReservations.push({
                id_ligne: ligne.id_ligne_reservation || ligne.id_face,
                id_face: ligne.id_face,
                id_reservation: reservation.id_reservation,
                face_orientation: ligne.orientation || 'N/A',
                type_face: ligne.type_face || 'N/A',
                client_nom: reservation.client?.nom || 'Client non spécifié',
                client_prenom: '',
                commercial_nom: reservation.commercial?.nom || 'N/A',
                commercial_prenom: reservation.commercial?.prenom || '',
                date_debut: ligne.date_debut || reservation.date_debut_campagne,
                date_fin: ligne.date_fin || reservation.date_fin_campagne,
                statut_diffusion: ligne.statut_diffusion || reservation.statut || 'En attente',
                joursRestants: ligne.jours_restants || 0,
                photo_campagne_url: reservation.photoCampagneUrl || null,
                statut: ligne.statut_diffusion || 'Occupé',
                numero_commande: reservation.numero_commande,
                notes: reservation.notes
              });
            });
          }
        });
        
        console.log('📊 Réservations formatées:', formattedReservations);
        setReservations(formattedReservations);
      } else {
        console.log('ℹ️ Aucune réservation trouvée');
        setReservations([]);
        if (data.message) {
          setApiError(data.message);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement réservations:', error);
      setApiError('Erreur de connexion au serveur');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction pour récupérer le token
  const getToken = (): string | null => {
    // Essayer localStorage
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('auth_token') ||
                  sessionStorage.getItem('token');
    if (token) return token;
    
    // Essayer les cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token' || name === 'auth_token') {
        return value;
      }
    }
    return null;
  };

  // ✅ Fonction pour uploader la photo avec métadonnées
  // Dans PanneauModal.tsx - mise à jour de handlePhotoUpload

const handlePhotoUpload = async (reservation: any, file: File) => {
  setUploading(reservation.id_ligne);
  setUploadProgress(0);
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'photo');
    
    // Ajouter les métadonnées de localisation
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        
        formData.append('latitude', position.coords.latitude.toString());
        formData.append('longitude', position.coords.longitude.toString());
        formData.append('accuracy', position.coords.accuracy.toString());
        console.log('📍 Position GPS capturée:', position.coords.latitude, position.coords.longitude);
      } catch (geoError) {
        console.warn('⚠️ Position GPS non disponible:', geoError);
      }
    }

    const now = new Date();
    formData.append('capture_date', now.toISOString());
    formData.append('capture_time', now.toLocaleTimeString('fr-FR'));

    const token = getToken();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/superviseurs/reservations/${reservation.id_reservation}/upload`, true);
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(progress);
      }
    });

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.onload = () => {
        console.log('📡 Upload status:', xhr.status);
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Erreur de parsing'));
          }
        } else if (xhr.status === 401) {
          reject(new Error('Session expirée. Veuillez vous reconnecter.'));
        } else {
          reject(new Error(`Erreur ${xhr.status}: ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error('Erreur réseau'));
      xhr.send(formData);
    });

    const result = await uploadPromise as any;
    console.log('📦 Résultat upload:', result);
    
    if (result.success) {
      // ✅ Afficher le message de décalage des dates si applicable
      if (result.datesModifiees) {
        alert(`✅ Photo ajoutée avec succès !\n\n📅 ${result.messageDates}\n\nLes réservations futures sur la même face ont été automatiquement décalées.`);
      } else {
        alert('✅ Photo ajoutée avec succès !');
      }
      await loadReservationsFromAPI();
    } else {
      alert('❌ Erreur: ' + (result.error || 'Erreur inconnue'));
    }
  } catch (error: any) {
    console.error('❌ Erreur upload:', error);
    if (error.message.includes('Session expirée')) {
      alert('❌ Session expirée. Veuillez vous reconnecter.');
      window.location.href = '/login';
    } else {
      alert('❌ Erreur lors de l\'upload: ' + error.message);
    }
  } finally {
    setUploading(null);
    setUploadProgress(0);
    setSelectedReservationId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
};
  const handleAddPhotoClick = (reservation: any) => {
    setSelectedReservationId(reservation.id_ligne);
    fileInputRef.current?.click();
  };

  if (!isOpen || !panneau) return null;

  const totalFaces = panneau.faces?.length || 0;
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const reservationsEnCours = reservations.filter((res: any) => {
    if (!res.date_debut || !res.date_fin) return false;
    const dateDebut = new Date(res.date_debut);
    const dateFin = new Date(res.date_fin);
    dateDebut.setHours(0, 0, 0, 0);
    dateFin.setHours(0, 0, 0, 0);
    return dateDebut <= aujourdhui && dateFin >= aujourdhui;
  });

  const reservationsFutures = reservations.filter((res: any) => {
    if (!res.date_debut) return false;
    const dateDebut = new Date(res.date_debut);
    dateDebut.setHours(0, 0, 0, 0);
    return dateDebut > aujourdhui;
  }).sort((a: any, b: any) => {
    return new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
  });

  const handleReservationClick = (reservation: any) => {
    onSelectReservation(reservation);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          className="relative w-full sm:w-[550px] md:w-[650px] max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 p-5 sm:p-6 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter truncate">
                  {panneau.idPan || panneau.nom || `Panneau #${panneau.id_panneau}`}
                </h2>
                <p className="text-sm text-blue-200 mt-1 flex items-center gap-2">
                  <MapPin size={16} className="text-amber-400" />
                  {panneau.adresse || 'Adresse non renseignée'}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-blue-200 border border-white/10">
                    {totalFaces} face(s)
                  </span>
                  {panneau.commune && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-blue-200 border border-white/10">
                      {panneau.commune}
                    </span>
                  )}
                  {panneau.ville && (
                    <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-blue-200 border border-white/10">
                      {panneau.ville}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="p-2.5 bg-white/15 hover:bg-red-500/80 rounded-xl transition-all text-white">
                <X size={22} />
              </button>
            </div>
          </div>

          {/* CORPS */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-gray-500">Chargement des réservations...</p>
              </div>
            ) : apiError && reservations.length === 0 ? (
              <div className="text-center py-16 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-yellow-700 font-bold text-lg">{apiError}</p>
                <p className="text-yellow-600 text-sm mt-2">
                  💡 Les réservations doivent être validées par la comptabilité pour apparaître ici.
                </p>
                <button
                  onClick={loadReservationsFromAPI}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                >
                  🔄 Rafraîchir
                </button>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-200">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500 font-bold text-lg">Aucune réservation confirmée</p>
                <p className="text-gray-400 text-sm mt-1">
                  Aucune réservation validée par la comptabilité pour ce panneau
                </p>
                <button
                  onClick={loadReservationsFromAPI}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                >
                  🔄 Rafraîchir
                </button>
              </div>
            ) : (
              <>
                {/* RÉSERVATIONS EN COURS */}
                {reservationsEnCours.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        En cours ({reservationsEnCours.length})
                      </h3>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="space-y-3">
                      {reservationsEnCours.map((res: any) => (
                        <div
                          key={res.id_ligne}
                          className="bg-white rounded-xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition overflow-hidden"
                        >
                          <button
                            onClick={() => handleReservationClick(res)}
                            className="w-full text-left p-4 hover:bg-emerald-50/30 transition"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-800">
                                    Face {res.face_orientation || `#${res.id_face}`}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                    EN COURS
                                  </span>
                                  {res.photo_campagne_url && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                                      📸
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  <Building size={14} className="inline mr-1" />
                                  {res.client_nom || 'Client non spécifié'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  <Calendar size={12} className="inline mr-1" />
                                  {res.date_debut ? new Date(res.date_debut).toLocaleDateString() : 'N/A'} 
                                  {res.date_fin ? ` → ${new Date(res.date_fin).toLocaleDateString()}` : ''}
                                </p>
                                {res.joursRestants > 0 && (
                                  <p className="text-xs font-bold text-emerald-600 mt-1">
                                    ⏳ {res.joursRestants} jour{res.joursRestants > 1 ? 's' : ''} restant{res.joursRestants > 1 ? 's' : ''}
                                  </p>
                                )}
                              </div>
                              <ChevronRight size={20} className="text-emerald-400 flex-shrink-0 ml-2" />
                            </div>
                          </button>

                          <div className="border-t border-emerald-100 px-4 py-2 bg-emerald-50/30 flex justify-end">
                            {uploading === res.id_ligne ? (
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Loader2 size={16} className="animate-spin" />
                                <span>{uploadProgress}%</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddPhotoClick(res)}
                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                              >
                                <Plus size={16} />
                                Ajouter photo
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RÉSERVATIONS À VENIR */}
                {reservationsFutures.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-6 bg-amber-500 rounded-full" />
                      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                        À venir ({reservationsFutures.length})
                      </h3>
                      <Clock size={14} className="text-amber-500" />
                    </div>
                    <div className="space-y-3">
                      {reservationsFutures.map((res: any) => (
                        <div
                          key={res.id_ligne}
                          className="bg-white rounded-xl border-2 border-amber-200 shadow-sm hover:shadow-md transition overflow-hidden"
                        >
                          <button
                            onClick={() => handleReservationClick(res)}
                            className="w-full text-left p-4 hover:bg-amber-50/30 transition"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-gray-800">
                                    Face {res.face_orientation || `#${res.id_face}`}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                                    À VENIR
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  <Building size={14} className="inline mr-1" />
                                  {res.client_nom || 'Client non spécifié'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  <Calendar size={12} className="inline mr-1" />
                                  Débute le {res.date_debut ? new Date(res.date_debut).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <ChevronRight size={20} className="text-amber-400 flex-shrink-0 ml-2" />
                            </div>
                          </button>

                          <div className="border-t border-amber-100 px-4 py-2 bg-amber-50/30 flex justify-end">
                            <button
                              disabled
                              className="flex items-center gap-2 px-4 py-1.5 bg-gray-300 text-gray-500 rounded-lg text-sm font-bold cursor-not-allowed"
                              title="Photo disponible uniquement pendant la diffusion"
                            >
                              <Plus size={16} />
                              Ajouter photo
                              <span className="text-xs text-gray-400 ml-1">(non disponible)</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-bold">
                {reservations.length} réservation(s) confirmée(s)
              </span>
              <div className="flex gap-4">
                <span className="text-xs text-emerald-600 font-bold">
                  ● En cours ({reservationsEnCours.length})
                </span>
                <span className="text-xs text-amber-600 font-bold">
                  ● À venir ({reservationsFutures.length})
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file && selectedReservationId !== null) {
            const reservation = reservations.find((r: any) => r.id_ligne === selectedReservationId);
            if (reservation) {
              if (file.size > 10 * 1024 * 1024) {
                alert('❌ Le fichier est trop volumineux. Max: 10MB');
                e.target.value = '';
                return;
              }
              handlePhotoUpload(reservation, file);
            }
          }
          e.target.value = '';
        }}
      />
    </>
  );
}