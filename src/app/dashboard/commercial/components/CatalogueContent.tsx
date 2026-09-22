// src/app/dashboard/commercial/components/CatalogueContent.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Grid, List, RefreshCw, Eye,
  Download, Camera, Video, Image, Calendar, Loader2,
  ChevronLeft, ChevronRight, Maximize2, MapPin,
  User, Clock, X, Play, Pause, Volume2, VolumeX
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface ReservationWithPhoto {
  id_reservation: number;
  numero_commande: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: string;
  photoCampagneUrl: string;
  photo_metadata?: any;
  photo_latitude?: string;
  photo_longitude?: string;
  date_upload_photo: string;
  notes?: string;
  jours_restants?: number;
  client: {
    nom: string;
    email: string;
    telephone?: string;
  };
  commercial: {
    nom: string;
    prenom: string;
    email: string;
  };
  panneau?: {
    id: number;
    nom: string;
    adresse: string;
    latitude?: string;
    longitude?: string;
  };
  face?: {
    id: number;
    orientation: string;
    type: string;
  };
  lignes?: {
    id_ligne: number;
    id_face: number;
    id_panneau: number;
    orientation: string;
    type_face: string;
    statut_diffusion: string;
    date_debut: string;
    date_fin: string;
    jours_restants: number;
    panneau: {
      id: number;
      nom: string;
      adresse: string;
    };
  }[];
}

interface CatalogueContentProps {
  user?: any;
}

// ============================================================
// HELPERS (au niveau module : stables, hoistés, testables)
// ============================================================

const isVideo = (url?: string | null): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|avi|mkv|ogv)$/i.test(url);
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const getPanneauNom = (lignes?: any[]): string => {
  if (lignes && lignes.length > 0 && lignes[0]?.panneau?.nom) {
    return lignes[0].panneau.nom;
  }
  if (lignes && lignes.length > 0 && lignes[0]?.id_panneau) {
    return `Panneau #${lignes[0].id_panneau}`;
  }
  return 'Panneau non spécifié';
};

const getFaces = (lignes?: any[]): string => {
  if (!lignes || lignes.length === 0) return 'N/A';
  return lignes.map((l: any) => l.orientation || 'N/A').join(', ');
};

const downloadMedia = (url: string, name: string) => {
  const link = document.createElement('a');
  link.href = url;
  const ext = url.split('.').pop() || 'jpg';
  link.download = `campagne_${name}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================
// LIGHTBOX (déclaré au niveau module)
// ============================================================

interface LightboxProps {
  reservation: ReservationWithPhoto;
  onClose: () => void;
}

function Lightbox({ reservation, onClose }: LightboxProps) {
  const isVideoFile = isVideo(reservation.photoCampagneUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Bloque le scroll du body
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous || 'auto';
    };
  }, []);

  // Fermeture avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying((p) => !p);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted((m) => !m);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition z-10 p-2 rounded-full bg-black/50 hover:bg-black/70"
      >
        <X size={32} />
      </button>

      <div className="relative max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="relative bg-black/30 rounded-2xl overflow-hidden flex-1 min-h-[50vh] flex items-center justify-center">
          {isVideoFile ? (
            <video
              ref={videoRef}
              src={reservation.photoCampagneUrl}
              className="max-h-[80vh] w-full object-contain"
              loop
              playsInline
              muted={isMuted}
              onClick={togglePlay}
            />
          ) : (
            <img
              src={reservation.photoCampagneUrl}
              alt={reservation.numero_commande}
              className="max-h-[80vh] w-full object-contain"
              loading="lazy"
            />
          )}

          <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
            {isVideoFile ? (
              <span className="px-3 py-1 bg-purple-500/80 backdrop-blur-sm text-white rounded-full text-xs font-bold flex items-center gap-1">
                <Video size={14} /> VIDÉO
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-500/80 backdrop-blur-sm text-white rounded-full text-xs font-bold flex items-center gap-1">
                <Image size={14} /> PHOTO
              </span>
            )}
            <span className="px-3 py-1 bg-blue-500/80 backdrop-blur-sm text-white rounded-full text-xs font-bold">
              {reservation.statut || 'En attente'}
            </span>
            <span className="px-3 py-1 bg-amber-500/80 backdrop-blur-sm text-white rounded-full text-xs font-bold">
              {reservation.numero_commande}
            </span>
          </div>

          {isVideoFile && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <button onClick={togglePlay} className="text-white hover:text-gray-300 transition">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={toggleMute} className="text-white hover:text-gray-300 transition">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <span className="text-white text-sm">{reservation.numero_commande}</span>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-300">Client</p>
            <p className="font-bold text-lg">{reservation.client?.nom || 'N/A'}</p>
            <p className="text-sm text-gray-300 truncate">{reservation.client?.email}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-300">Panneau</p>
            <p className="font-bold text-lg">{getPanneauNom(reservation.lignes)}</p>
            <p className="text-sm text-gray-300">Face: {getFaces(reservation.lignes)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-sm text-gray-300">Période</p>
            <p className="font-bold text-lg">{formatDate(reservation.date_debut_campagne)}</p>
            <p className="text-sm text-gray-300">→ {formatDate(reservation.date_fin_campagne)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MEDIA CARD (déclaré au niveau module)
// ============================================================

interface MediaCardProps {
  reservation: ReservationWithPhoto;
  onOpen: (r: ReservationWithPhoto) => void;
}

function MediaCard({ reservation, onOpen }: MediaCardProps) {
  const mediaUrl = reservation.photoCampagneUrl || '';
  const isVideoFile = isVideo(mediaUrl);
  const panneauNom = getPanneauNom(reservation.lignes);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {mediaUrl ? (
          isVideoFile ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              muted
              autoPlay={isHovered}
              loop
              playsInline
            />
          ) : (
            <img
              src={mediaUrl}
              alt={reservation.numero_commande}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
            <Camera size={48} />
          </div>
        )}

        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <button
              onClick={() => onOpen(reservation)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full text-sm font-bold transition flex items-center gap-2"
            >
              <Maximize2 size={16} />
              Agrandir
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(mediaUrl, '_blank')}
                className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full transition"
                aria-label="Ouvrir"
              >
                <Eye size={18} />
              </button>
              <button
                onClick={() =>
                  downloadMedia(mediaUrl, reservation.numero_commande || String(reservation.id_reservation))
                }
                className="p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-full transition"
                aria-label="Télécharger"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex gap-2">
          {isVideoFile ? (
            <span className="px-2.5 py-1 bg-purple-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
              <Video size={12} /> VIDÉO
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
              <Image size={12} /> PHOTO
            </span>
          )}
          {reservation.jours_restants !== undefined && reservation.jours_restants > 0 && (
            <span className="px-2.5 py-1 bg-amber-500/80 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold flex items-center gap-1">
              <Clock size={12} /> {reservation.jours_restants}j
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3">
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${
              reservation.statut === 'ACTIVE'
                ? 'bg-emerald-500 text-white'
                : reservation.statut === 'Diffusée'
                ? 'bg-blue-500 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {reservation.statut || 'En attente'}
          </span>
        </div>

        <div className="absolute bottom-3 left-3">
          <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold">
            {reservation.numero_commande || 'N/A'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 truncate">{panneauNom}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={12} />
              {reservation.panneau?.adresse ||
                reservation.lignes?.[0]?.panneau?.adresse ||
                'Adresse N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <User size={12} className="text-gray-400" />
          <span className="truncate">{reservation.client?.nom || 'Client N/A'}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={12} className="text-gray-400" />
          <span>{formatDate(reservation.date_debut_campagne)}</span>
          <span className="text-gray-300">→</span>
          <span>{formatDate(reservation.date_fin_campagne)}</span>
        </div>

        {reservation.photo_latitude && reservation.photo_longitude && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <MapPin size={10} />
            <span>
              {parseFloat(reservation.photo_latitude).toFixed(4)},{' '}
              {parseFloat(reservation.photo_longitude).toFixed(4)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onOpen(reservation)}
            className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Eye size={14} />
            Voir en grand
          </button>
          <button
            onClick={() =>
              downloadMedia(mediaUrl, reservation.numero_commande || String(reservation.id_reservation))
            }
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
            aria-label="Télécharger"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGINATION (déclaré au niveau module)
// ============================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalFiltered: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onGoToPage: (p: number) => void;
  onItemsPerPageChange: (n: number) => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalFiltered,
  itemsPerPage,
  itemsPerPageOptions,
  onGoToPage,
  onItemsPerPageChange,
}: PaginationProps) {
  if (totalFiltered === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-200 mt-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Affichage de</span>
        <span className="font-bold">{startIndex + 1}</span>
        <span>à</span>
        <span className="font-bold">{endIndex}</span>
        <span>sur</span>
        <span className="font-bold">{totalFiltered}</span>
        <span>éléments</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Afficher</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value) || 12)}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onGoToPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
          >
            ⏮
          </button>
          <button
            onClick={() => onGoToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-3 py-1 text-sm font-medium min-w-[60px] text-center">
            {currentPage} / {totalPages || 1}
          </span>

          <button
            onClick={() => onGoToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onGoToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96, 192];

export function CatalogueContent({ user }: CatalogueContentProps) {
  const [reservations, setReservations] = useState<ReservationWithPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedImage, setSelectedImage] = useState<ReservationWithPhoto | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchReservationsWithPhotos = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // ✅ On récupère tout côté serveur (pas de pagination serveur),
      //    la pagination est faite localement.
      const response = await fetch('/api/commercials/catalogue-photos?limit=9999&offset=0', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        const sortedData: ReservationWithPhoto[] = (data.data as ReservationWithPhoto[]).sort(
          (a, b) => {
            const dateA = new Date(a.date_upload_photo || 0).getTime();
            const dateB = new Date(b.date_upload_photo || 0).getTime();
            return dateB - dateA;
          }
        );

        const formattedData = sortedData.map((item) => ({
          ...item,
          lignes: Array.isArray(item.lignes) ? item.lignes : [],
        }));

        setReservations(formattedData);
        setTotalItems(typeof data.total === 'number' ? data.total : formattedData.length);
        setCurrentPage(1);
      } else {
        setError(data.message || data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservationsWithPhotos();
  }, []);

  const handleOpenLightbox = (r: ReservationWithPhoto) => {
    setSelectedImage(r);
    setIsLightboxOpen(true);
  };

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false);
    setSelectedImage(null);
  };

  // ✅ Filtrage (searchLower calculé une fois)
  const searchLower = searchTerm.trim().toLowerCase();
  const filteredReservations = reservations.filter((r) => {
    const matchSearch =
      !searchLower ||
      r.numero_commande?.toLowerCase().includes(searchLower) ||
      r.client?.nom?.toLowerCase().includes(searchLower) ||
      r.lignes?.some((l) => l.panneau?.nom?.toLowerCase().includes(searchLower));

    const matchType =
      filterType === 'all' ||
      (filterType === 'photo' && !isVideo(r.photoCampagneUrl)) ||
      (filterType === 'video' && isVideo(r.photoCampagneUrl));

    return matchSearch && matchType;
  });

  // ✅ Pagination
  const totalFiltered = filteredReservations.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalFiltered);
  const currentItems = filteredReservations.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  // ✅ Compteurs
  const totalPhotos = reservations.filter((r) => r.photoCampagneUrl && !isVideo(r.photoCampagneUrl)).length;
  const totalVideos = reservations.filter((r) => r.photoCampagneUrl && isVideo(r.photoCampagneUrl)).length;

  return (
    <div className="bg-gray-50 rounded-xl">
      {/* Filtres */}
      <div className="bg-white rounded-t-xl border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-[180px] relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📋 Tous ({reservations.length})
            </button>
            <button
              onClick={() => {
                setFilterType('photo');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'photo' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📷 Photos ({totalPhotos})
            </button>
            <button
              onClick={() => {
                setFilterType('video');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'video' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎬 Vidéos ({totalVideos})
            </button>
          </div>
          <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Vue grille"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Vue liste"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={fetchReservationsWithPhotos}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="mt-4 text-gray-500">Chargement des preuves d'affichage...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-red-200">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-red-600 font-bold">{error}</p>
            <button
              onClick={fetchReservationsWithPhotos}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Réessayer
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 font-bold text-lg">Aucune preuve d'affichage</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm
                ? 'Aucun résultat pour votre recherche'
                : "Aucune photo ou vidéo n'a encore été uploadée"}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {currentItems.map((reservation) => (
                <MediaCard
                  key={reservation.id_reservation}
                  reservation={reservation}
                  onOpen={handleOpenLightbox}
                />
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalFiltered={totalFiltered}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
              onGoToPage={goToPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        ) : (
          <>
            <div className="space-y-4">
              {currentItems.map((reservation) => (
                <div
                  key={reservation.id_reservation}
                  className="bg-white rounded-xl border-2 border-gray-200 p-4 flex flex-col sm:flex-row gap-4 hover:border-blue-300 hover:shadow-lg transition"
                >
                  <div className="relative rounded-lg overflow-hidden bg-gray-100 w-full sm:w-48 h-32 flex-shrink-0">
                    {reservation.photoCampagneUrl ? (
                      isVideo(reservation.photoCampagneUrl) ? (
                        <video
                          src={reservation.photoCampagneUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={reservation.photoCampagneUrl}
                          alt="Preuve"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Camera size={30} />
                      </div>
                    )}
                    <div className="absolute top-1 right-1">
                      {isVideo(reservation.photoCampagneUrl) ? (
                        <span className="px-1.5 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold">
                          🎬
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">
                          📷
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{getPanneauNom(reservation.lignes)}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            reservation.statut === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : reservation.statut === 'Diffusée'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {reservation.statut || 'En attente'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{reservation.client?.nom || 'Client'}</p>
                      <p className="text-xs text-gray-400">
                        {formatDate(reservation.date_debut_campagne)} →{' '}
                        {formatDate(reservation.date_fin_campagne)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenLightbox(reservation)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition"
                      >
                        <Eye size={14} className="inline mr-1" />
                        Voir
                      </button>
                      <button
                        onClick={() =>
                          downloadMedia(
                            reservation.photoCampagneUrl,
                            reservation.numero_commande || String(reservation.id_reservation)
                          )
                        }
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold transition"
                      >
                        <Download size={14} className="inline mr-1" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalFiltered={totalFiltered}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
              onGoToPage={goToPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-b-xl border-t border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex flex-wrap justify-between items-center gap-2 text-xs sm:text-sm text-gray-500">
          <div className="flex flex-wrap gap-3">
            <span className="font-bold">📊 {filteredReservations.length} réservation(s)</span>
            <span>📷 {totalPhotos} photo(s)</span>
            <span>🎬 {totalVideos} vidéo(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📅 {new Date().toLocaleDateString()}</span>
            <span className="text-gray-300">|</span>
            <span className="text-xs">
              Page {currentPage} / {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && selectedImage && (
        <Lightbox reservation={selectedImage} onClose={handleCloseLightbox} />
      )}
    </div>
  );
}