// src/app/dashboard/superviseur/components/ReservationEnCoursModal.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Users, User, MapPin, Camera, Upload, 
  Loader2, CheckCircle, Eye, Calendar as CalendarIcon,
  RefreshCw, AlertCircle
} from 'lucide-react';

interface ReservationEnCours {
  id_reservation: number;
  numero_commande: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: string;
  photoCampagneUrl: string | null;
  notes: string;
  client: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
  };
  commercial: {
    nom: string;
    prenom: string;
    email: string;
  };
  lignes: {
    id_ligne_reservation: number;
    id_face: number;
    orientation: string;
    type_face: string;
    statut_diffusion: string;
    date_debut: string;
    date_fin: string;
    panneau: {
      nom: string;
      adresse: string;
    };
  }[];
}

interface ReservationEnCoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  panneauId?: number;
  user: any;
}

export default function ReservationEnCoursModal({ 
  isOpen, 
  onClose, 
  panneauId,
  user 
}: ReservationEnCoursModalProps) {
  const [reservations, setReservations] = useState<ReservationEnCours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationEnCours | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'photo' | 'video'>('photo');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchReservations();
    }
    // Nettoyer la caméra à la fermeture
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    };
  }, [isOpen, panneauId]);

  // ✅ Fonction pour récupérer le token depuis plusieurs sources
  const getToken = (): string | null => {
    // 1. Essayer localStorage
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('auth_token') ||
                  sessionStorage.getItem('token');
    
    if (token) return token;

    // 2. Essayer les cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token' || name === 'auth_token') {
        return value;
      }
    }

    return null;
  };

  // ✅ Fonction pour récupérer le token depuis l'utilisateur (contexte)
  const getUserToken = (): string | null => {
    // Si l'utilisateur a un token dans ses données
    if (user?.token) return user.token;
    if (user?.accessToken) return user.accessToken;
    return null;
  };

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = panneauId 
        ? `/api/superviseurs/reservations/en-cours?panneauId=${panneauId}`
        : '/api/superviseurs/reservations/en-cours';
      
      // ✅ Essayer plusieurs sources de token
      const token = getToken() || getUserToken();
      
      console.log('🔍 Récupération des réservations en cours...');
      console.log('📡 URL:', url);
      console.log('🔑 Token présent:', !!token);
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // ✅ Inclure les cookies
      });
      
      console.log('📡 Status:', res.status);
      
      const data = await res.json();
      console.log('📦 Réponse:', data);
      
      if (res.ok && data.success) {
        setReservations(data.data);
        setError(null);
      } else if (res.status === 401) {
        setError('❌ Session expirée. Veuillez vous reconnecter.');
        // Rediriger vers login après 3 secondes
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(data.error || `Erreur ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.error('❌ Erreur fetch:', err);
      setError('Erreur de connexion au serveur. Vérifiez votre connexion internet.');
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (reservationId: number, file: File) => {
    setUploading(reservationId);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const token = getToken() || getUserToken();
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/superviseurs/reservations/${reservationId}/upload`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      // ✅ Suivi de progression
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      // ✅ Promesse pour gérer le XHR
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error('Erreur de parsing'));
            }
          } else {
            reject(new Error(`Erreur ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Erreur réseau'));
        xhr.send(formData);
      });

      const result = await uploadPromise as any;
      
      if (result.success) {
        await fetchReservations();
        alert(`${uploadType === 'video' ? 'Vidéo' : 'Photo'} uploadée avec succès !`);
      } else {
        alert('Erreur: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('❌ Erreur upload:', err);
      alert('Erreur lors de l\'upload. Veuillez réessayer.');
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('❌ Votre navigateur ne supporte pas l\'accès à la caméra.');
      return;
    }

    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setShowCamera(true);
        setStream(stream);
      }
    } catch (err: any) {
      console.error('Erreur caméra:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('❌ Accès à la caméra refusé. Autorisez l\'accès dans les paramètres.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('❌ Aucune caméra trouvée sur cet appareil.');
      } else {
        setCameraError(`❌ Erreur: ${err.message || 'Erreur inconnue'}`);
      }
    }
  };

  const capturePhoto = (reservationId: number) => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setShowCamera(false);

      uploadFile(reservationId, file);
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // ✅ Fonction pour formater l'erreur
  const formatError = (errorMsg: string) => {
    if (errorMsg.includes('401')) return '❌ Session expirée';
    if (errorMsg.includes('404')) return '❌ API non trouvée';
    if (errorMsg.includes('500')) return '❌ Erreur serveur';
    return errorMsg;
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-6 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-white tracking-tighter">
                    📅 Réservations en cours
                  </h2>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full border border-emerald-500/30 font-bold">
                    {reservations.length}
                  </span>
                </div>
                <p className="text-sm text-blue-300">
                  Campagnes actuellement en diffusion
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchReservations}
                  disabled={loading}
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white disabled:opacity-50"
                  title="Rafraîchir"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all text-white"
                >
                  <X size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* CONTENU */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/80">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-64">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="mt-4 text-sm text-gray-500 font-medium">Chargement des réservations...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={40} className="text-red-500" />
                </div>
                <p className="text-red-500 text-center font-bold text-lg">{formatError(error)}</p>
                <button
                  onClick={fetchReservations}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                >
                  Réessayer
                </button>
                {error.includes('401') && (
                  <p className="mt-2 text-sm text-gray-500">Redirection vers la page de connexion...</p>
                )}
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={40} className="text-emerald-500" />
                </div>
                <p className="text-gray-500 text-lg font-medium">Aucune réservation en cours</p>
                <p className="text-gray-400 text-sm mt-1">Toutes les campagnes sont terminées</p>
              </div>
            ) : (
              <div className="space-y-6">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id_reservation}
                    className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    {/* En-tête */}
                    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800">
                              {reservation.numero_commande}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                              reservation.statut === 'Diffusée' ? 'bg-emerald-100 text-emerald-700' :
                              reservation.statut === 'Confirmée' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {reservation.statut}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <CalendarIcon size={14} />
                              <span>{formatDate(reservation.date_debut_campagne)}</span>
                              <span className="mx-1">→</span>
                              <span>{formatDate(reservation.date_fin_campagne)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Boutons upload */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading === reservation.id_reservation}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                          >
                            {uploading === reservation.id_reservation ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                {uploadProgress > 0 && `${uploadProgress}%`}
                              </>
                            ) : (
                              <Upload size={16} />
                            )}
                            {uploading === reservation.id_reservation ? 'Upload...' : 'Upload'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setUploadType('photo');
                              startCamera();
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-2"
                          >
                            <Camera size={16} />
                            Photo
                          </button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Vérifier la taille du fichier (max 10MB pour photo, 50MB pour video)
                                const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
                                if (file.size > maxSize) {
                                  alert(`Le fichier est trop volumineux. Max: ${maxSize / (1024 * 1024)}MB`);
                                  e.target.value = '';
                                  return;
                                }
                                const isVideo = file.type.startsWith('video/');
                                setUploadType(isVideo ? 'video' : 'photo');
                                uploadFile(reservation.id_reservation, file);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Infos client et commercial */}
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-2">
                          <Users size={14} />
                          Client
                        </div>
                        <p className="font-bold text-gray-800">
                          {reservation.client?.prenom || ''} {reservation.client?.nom || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">{reservation.client?.email || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{reservation.client?.telephone || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold mb-2">
                          <User size={14} />
                          Agent commercial
                        </div>
                        <p className="font-bold text-gray-800">
                          {reservation.commercial?.prenom || ''} {reservation.commercial?.nom || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-500">{reservation.commercial?.email || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Panneaux associés */}
                    <div className="px-5 pb-5">
                      <div className="text-xs text-gray-500 uppercase font-bold mb-3">
                        Panneaux associés ({reservation.lignes?.length || 0})
                      </div>
                      <div className="space-y-2">
                        {reservation.lignes?.map((ligne) => (
                          <div
                            key={ligne.id_ligne_reservation}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-gray-800">
                                  {ligne.panneau?.nom || 'Panneau non spécifié'}
                                </p>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <MapPin size={12} />
                                  {ligne.panneau?.adresse || 'Adresse non renseignée'}
                                </p>
                                <div className="flex gap-3 mt-1 text-xs flex-wrap">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                    {ligne.orientation || 'N/A'}
                                  </span>
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                    {ligne.type_face || 'N/A'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    ligne.statut_diffusion === 'Diffusée' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {ligne.statut_diffusion || 'N/A'}
                                  </span>
                                </div>
                              </div>
                              {ligne.statut_diffusion === 'Diffusée' && (
                                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                  <CheckCircle size={14} />
                                  En diffusion
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Photo/Vidéo existante */}
                    {reservation.photoCampagneUrl && (
                      <div className="px-5 pb-5">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">
                          Preuve d'affichage
                        </div>
                        <div className="relative group">
                          {reservation.photoCampagneUrl.match(/\.(mp4|webm|mov)$/i) ? (
                            <video
                              src={reservation.photoCampagneUrl}
                              controls
                              className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                            />
                          ) : (
                            <img
                              src={reservation.photoCampagneUrl}
                              alt="Preuve d'affichage"
                              className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                            />
                          )}
                          <button
                            onClick={() => window.open(reservation.photoCampagneUrl!, '_blank')}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition"
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* MODAL CAMERA */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-black"
            >
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto max-h-[70vh] object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <p className="text-white text-center p-4 max-w-xs">{cameraError}</p>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => selectedReservation && capturePhoto(selectedReservation.id_reservation)}
                      className="w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 border-4 border-white transition active:scale-90 flex items-center justify-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-white" />
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-8 py-3 rounded-xl bg-red-500/80 text-white font-bold text-sm hover:bg-red-600 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>

                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
                >
                  <X size={24} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}