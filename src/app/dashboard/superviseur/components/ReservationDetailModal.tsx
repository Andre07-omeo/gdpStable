// src/app/dashboard/superviseur/components/ReservationDetailModal.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Calendar, Users, Building, Camera, Save, Edit3, 
  Upload, Loader2
} from 'lucide-react';
import { ReservationWithDetails } from '../types/panneau.types';
import { PanneauServiceClient } from '../services/panneauService.client';

interface ReservationDetailModalProps {
  isOpen: boolean;
  reservation: ReservationWithDetails | null;
  onClose: () => void;
  onUpdate: () => void;
  user: any;
}

export default function ReservationDetailModal({ 
  isOpen, 
  reservation, 
  onClose, 
  onUpdate,
  user 
}: ReservationDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newStatut, setNewStatut] = useState('');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (reservation) {
      const statutValide = reservation.statut_diffusion || 'En attente';
      const statutsAutorises = ['En attente', 'Diffusée', 'Terminée', 'Annulée'];
      setNewStatut(statutsAutorises.includes(statutValide) ? statutValide : 'En attente');
      
      if (reservation.photo_campagne_url) {
        setLocalPreview(reservation.photo_campagne_url);
      }
    }
  }, [reservation]);

  if (!isOpen || !reservation) return null;

  // ✅ Vérifier si la réservation est en cours (basé sur les dates)
  const estEnCours = (() => {
    if (!reservation.date_debut || !reservation.date_fin) return false;
    const today = new Date();
    const debut = new Date(reservation.date_debut);
    const fin = new Date(reservation.date_fin);
    return debut <= today && fin >= today;
  })();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // ✅ Récupérer le nom du panneau - uniquement les propriétés existantes
  const getPanneauNom = () => {
    // Essayer d'abord depuis panneau_idPan
    if (reservation.panneau_idPan) return reservation.panneau_idPan;
    
    // Essayer depuis panneau_id
    if (reservation.panneau_id) return `Panneau #${reservation.panneau_id}`;
    
    // Si on a un nom de panneau direct
    if ((reservation as any).panneau_nom) return (reservation as any).panneau_nom;
    
    return 'Panneau non spécifié';
  };

  // ✅ Récupérer le nom du client
  const getClientNom = () => {
    if (reservation.client_nom) return reservation.client_nom;
    return 'Client non spécifié';
  };

  // ✅ Récupérer le nom du commercial
  const getCommercialNom = () => {
    if (reservation.commercial_nom) return reservation.commercial_nom;
    return 'Non spécifié';
  };

  // Démarrer la caméra
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
      setUploading(true);

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
        setCameraError('❌ Accès à la caméra refusé. Veuillez autoriser l\'accès.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('❌ Aucune caméra trouvée.');
      } else {
        setCameraError(`❌ Erreur: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // Capturer la photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);
      setNewPhotoFile(file);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setShowCamera(false);
      setIsEditing(true);
      setNewStatut('Diffusée');
      setMessage('✓ Photo prise - Statut automatiquement mis à jour vers "Diffusée"');
      
      await handleSaveWithPhoto(file);
    }, 'image/jpeg', 0.9);
  };

  // Fermer la caméra
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Upload photo depuis la galerie
  const handleFileSelect = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setNewPhotoFile(file);
    setIsEditing(true);
    setNewStatut('Diffusée');
    setMessage('✓ Photo sélectionnée - Statut automatiquement mis à jour vers "Diffusée"');
  };

  // ✅ Sauvegarder avec photo
  const handleSaveWithPhoto = async (file: File) => {
    setSaving(true);
    setMessage(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('statut', 'Diffusée');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/superviseurs/reservations/${reservation.id_reservation}/upload`, true);
      xhr.withCredentials = true;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            try {
              resolve(JSON.parse(xhr.responseText));
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
        setMessage('✓ Photo et statut enregistrés avec succès !');
        setTimeout(() => {
          setIsEditing(false);
          onUpdate();
          onClose();
        }, 1500);
      } else {
        setMessage('✗ Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('✗ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setUploadProgress(0);

    try {
      const result = await PanneauServiceClient.updateReservationStatus(
        reservation.id_ligne,
        newStatut,
        newPhotoFile
      );

      if (result.success) {
        setMessage('✓ Modifications enregistrées avec succès !');
        setTimeout(() => {
          setIsEditing(false);
          onUpdate();
          onClose();
        }, 1500);
      } else {
        setMessage('✗ Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessage('✗ Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const currentPhoto = localPreview || reservation.photo_campagne_url || '';

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ✅ Déterminer la couleur du statut
  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Diffusée':
        return 'text-emerald-600';
      case 'En attente':
        return 'text-amber-600';
      case 'Terminée':
        return 'text-gray-500';
      case 'Annulée':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[2100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl bg-white"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 p-6 border-b border-white/15">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tighter">
                  {getPanneauNom()}
                </h2>
                {estEnCours && (
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold animate-pulse border-2 border-emerald-500/30">
                    EN COURS
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-200 mt-1.5 font-bold">
                Face {reservation.face_orientation || `#${reservation.id_face || 'N/A'}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/15 hover:bg-red-500/80 rounded-xl transition-all text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* CONTENU */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto bg-gray-50 custom-scrollbar">
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-xl text-center text-sm font-bold ${
              message.includes('succès')
                ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200'
                : 'bg-red-50 text-red-700 border-2 border-red-200'
            }`}>
              {message}
              {uploading && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{uploadProgress}%</span>
                </div>
              )}
            </div>
          )}

          {/* Client */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Client</label>
            <p className="text-gray-800 font-black text-base mt-1">
              {getClientNom()}
            </p>
          </div>

          {/* Commercial */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Agent commercial</label>
            <p className="text-gray-800 font-black text-base mt-1">
              {getCommercialNom()}
            </p>
          </div>

          {/* Période */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Date début</label>
              <p className="text-gray-800 text-base mt-1 font-black">
                {formatDate(reservation.date_debut)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
              <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Date fin</label>
              <p className="text-gray-800 text-base mt-1 font-black">
                {formatDate(reservation.date_fin)}
              </p>
            </div>
          </div>

          {/* Jours restants */}
          <div className={`rounded-xl p-4 border-2 shadow-sm ${
            reservation.joursRestants <= 3 && reservation.joursRestants > 0
              ? 'bg-orange-50 border-orange-200'
              : 'bg-white border-gray-200'
          }`}>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Jours restants</label>
            <p className={`font-black text-base mt-1 ${
              reservation.joursRestants <= 3 && reservation.joursRestants > 0 ? 'text-orange-600' : 'text-gray-800'
            }`}>
              {reservation.joursRestants > 0 
                ? `${reservation.joursRestants} jour${reservation.joursRestants > 1 ? 's' : ''}`
                : 'Terminée'}
            </p>
          </div>

          {/* Statut */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Statut diffusion</label>
            {isEditing ? (
              <select
                value={newStatut}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewStatut(e.target.value)}
                className="w-full mt-1.5 p-2 bg-gray-50 rounded-lg border-2 border-gray-200 text-gray-800 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="En attente">En attente</option>
                <option value="Diffusée">Diffusée</option>
                <option value="Terminée">Terminée</option>
                <option value="Annulée">Annulée</option>
              </select>
            ) : (
              <p className={`text-base font-black mt-1 ${getStatutColor(reservation.statut_diffusion || 'N/A')}`}>
                {reservation.statut_diffusion || 'N/A'}
              </p>
            )}
          </div>

          {/* Photo */}
          <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Preuve d'affichage</label>
            <div className="mt-3">
              {currentPhoto ? (
                <div className="space-y-3">
                  <div className="relative group">
                    <img
                      src={currentPhoto}
                      alt="Preuve d'affichage"
                      className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                    />
                    <button
                      onClick={() => window.open(currentPhoto, '_blank')}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition"
                    >
                      <span className="text-xs">🔍</span>
                    </button>
                  </div>
                  
                  {isEditing && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 border-2 border-blue-200 text-blue-600 text-sm font-bold hover:bg-blue-100 transition"
                      >
                        <Upload size={16} />
                        Choisir
                      </button>
                      <button
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-50 border-2 border-emerald-200 text-emerald-600 text-sm font-bold hover:bg-emerald-100 transition"
                      >
                        <Camera size={16} />
                        Prendre
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition bg-gray-50"
                    >
                      <Upload size={24} className="text-gray-400" />
                      <span className="text-xs text-gray-500 font-bold">Choisir</span>
                    </button>
                    <button
                      onClick={startCamera}
                      className="flex-1 flex flex-col items-center justify-center gap-1 py-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-400 transition bg-gray-50"
                    >
                      <Camera size={24} className="text-emerald-400" />
                      <span className="text-xs text-emerald-500 font-bold">Prendre</span>
                    </button>
                  </div>
                  <p className="text-xs text-blue-500 text-center font-bold">
                    📸 Le statut passera automatiquement à "Diffusée"
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      alert('❌ Le fichier est trop volumineux. Max: 10MB');
                      e.target.value = '';
                      return;
                    }
                    handleFileSelect(file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />

              {(uploading || saving) && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600 font-bold">
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'Traitement...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t-2 border-gray-200 bg-white flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-600 text-sm font-bold hover:bg-blue-100 transition"
              >
                <Edit3 size={18} />
                Modifier
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition"
              >
                Fermer
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 text-sm font-bold hover:bg-emerald-100 transition disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Enregistrer
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNewPhotoFile(null);
                  setNewStatut(reservation.statut_diffusion || 'En attente');
                  setLocalPreview(reservation.photo_campagne_url || null);
                  setMessage(null);
                }}
                className="flex-1 py-3 rounded-xl bg-red-50 border-2 border-red-200 text-red-600 text-sm font-bold hover:bg-red-100 transition"
              >
                Annuler
              </button>
            </>
          )}
        </div>

        {/* CAMERA MODAL */}
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
                      <p className="text-white text-center p-4">{cameraError}</p>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
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
      </motion.div>
    </motion.div>
  );
}