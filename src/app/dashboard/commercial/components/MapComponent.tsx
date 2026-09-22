// src/app/dashboard/commercial/components/MapComponent.tsx

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
// ✅ Map renommé en GoogleMap pour éviter le conflit avec `new Map()` JavaScript
import { Map as GoogleMap, useMap } from '@vis.gl/react-google-maps';
import { MapMarkers } from './map/MapMarkers';
import { MapControls } from './map/MapControls';
import { PanneauDetailModal } from './map/PanneauDetailModal';
import { GoogleMapProvider, GOOGLE_MAPS_MAP_ID } from './map/GoogleMapProvider';
import { PanneauMap, FaceMap } from './map/types';
import { useCart } from '@/context/CartContext';

import { FilterButton } from './filters/FilterButton';
import { filterPanneaux } from './filters/filterLogic';
import { PanneauFiltersState } from './filters/types';
import {
  loadReservationsByFace,
  ReservationsMap,
} from './filters/reservationsLoader';

// 🎯 Centre par défaut (Kinshasa)
const DEFAULT_CENTER = { lat: -4.325, lng: 15.322 };
const DEFAULT_ZOOM = 12;

interface MapComponentProps {
  panneaux?: PanneauMap[];
  reservationsMap?: ReservationsMap;
  userLocation: { lat: number; lng: number } | null;
  locationError?: string | null;
  onMarkerClick?: (panneau: PanneauMap) => void;
  onReserveClick?: (panneau: PanneauMap, face?: any) => void;
  onAddToCart?: (panneau: PanneauMap, face?: any) => void;
}

const normalizeFaceId = (id: number | string): number => {
  if (typeof id === 'number') return id;
  const parsed = parseInt(String(id), 10);
  return isNaN(parsed) ? 0 : parsed;
};

const DEFAULT_FILTERS: PanneauFiltersState = {
  search: '',
  situation: 'tous',
  faceSituation: 'tous',
  echeanceActive: false,
  echeanceDebut: '',
  echeanceFin: '',
};

/**
 * 🔄 Synchronise la vue de la carte quand `center` change
 */
function MapCenterController({
  center,
  trigger,
  zoom,
}: {
  center: { lat: number; lng: number };
  trigger: number;
  zoom?: number;
}) {
  const map = useMap();
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (!map) return;
    if (lastTrigger.current !== trigger) {
      lastTrigger.current = trigger;
      map.panTo(center);
      if (zoom) map.setZoom(zoom);
    }
  }, [center, trigger, zoom, map]);

  return null;
}

export default function MapComponent({
  panneaux: panneauxProps = [],
  reservationsMap: reservationsMapProp,
  userLocation,
  locationError = null,
  onMarkerClick,
  onReserveClick,
  onAddToCart,
}: MapComponentProps) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isMounted, setIsMounted] = useState(false);

  const [panneaux, setPanneaux] = useState<PanneauMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPanneau, setSelectedPanneau] = useState<PanneauMap | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<PanneauFiltersState>(DEFAULT_FILTERS);

  // ✅ CORRIGÉ : `new globalThis.Map()` pour utiliser le Map natif JavaScript
  const [reservationsMap, setReservationsMap] = useState<ReservationsMap>(
    reservationsMapProp || (new globalThis.Map() as ReservationsMap)
  );

  const hasCenteredOnUser = useRef(false);

  const cart = useCart() as any;
  const addItem: ((item: any) => void) | undefined = cart?.addItem;
  const removeItem: ((id: number) => void) | undefined = cart?.removeItem;
  const isInCartFn: ((id: number) => boolean) | undefined = cart?.isInCart;
  const cartItems: any[] = Array.isArray(cart?.items) ? cart.items : [];

  const isInCart = useCallback(
    (faceId: number | string): boolean => {
      const normalized = normalizeFaceId(faceId);
      if (typeof isInCartFn === 'function') return !!isInCartFn(normalized);
      return cartItems.some((it) => normalizeFaceId(it?.id_face) === normalized);
    },
    [isInCartFn, cartItems]
  );

  const handleToggleCart = useCallback(
    (panneau: PanneauMap, face?: FaceMap | any) => {
      if (!face) return;
      const faceId = normalizeFaceId(face.id_face);
      if (!faceId) return;
      if (face.a_probleme === 1) return;

      if (isInCart(faceId)) {
        if (typeof removeItem === 'function') removeItem(faceId);
        return;
      }

      const cartItem = {
        id_face: faceId,
        id_panneau:
          typeof panneau.id_panneau === 'number'
            ? panneau.id_panneau
            : parseInt(String(panneau.id_panneau), 10),
        panneau_nom: panneau.nom || 'Panneau sans nom',
        panneau_adresse: panneau.adresse || 'Adresse non définie',
        panneau_ville: (panneau as any).ville || 'Non spécifié',
        panneau_quartier: (panneau as any).quartier || 'Non spécifié',
        orientation: face.orientation || 'N/A',
        type_face: face.type_face || 'Standard',
        dimension_m2: 'N/A',
        statut: face.status || 'Libre',
        date_debut: face.date_debut || undefined,
        date_fin: face.date_fin || undefined,
        prix_saisi: (face as any).prix_saisi || 0,
        hauteur_cm: (face as any).hauteur_cm || 0,
        largeur_cm: (face as any).largeur_cm || 0,
        id_face_original: faceId,
        currency: 'USD' as const,
      };

      if (typeof addItem === 'function') addItem(cartItem);
      if (onAddToCart) onAddToCart(panneau, face);
    },
    [isInCart, addItem, removeItem, onAddToCart]
  );

  // Réservations
  useEffect(() => {
    if (reservationsMapProp) {
      setReservationsMap(reservationsMapProp);
    } else {
      loadReservationsByFace().then(setReservationsMap);
    }
  }, [reservationsMapProp]);

  // Panneaux
  useEffect(() => {
    const fetchPanneaux = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/panneaux', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`Erreur ${response.status}`);
        const data = await response.json();
        setPanneaux(data);
      } catch (error) {
        console.error('❌ Erreur chargement panneaux:', error);
        if (panneauxProps.length > 0) setPanneaux(panneauxProps);
      } finally {
        setLoading(false);
      }
    };
    fetchPanneaux();
  }, [panneauxProps]);

  // Mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Centrage initial sur user
  useEffect(() => {
    if (userLocation && !hasCenteredOnUser.current) {
      hasCenteredOnUser.current = true;
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      setCenterTrigger((t) => t + 1);
    }
  }, [userLocation]);

  const handleMarkerClick = (panneau: PanneauMap) => {
    setSelectedPanneau(panneau);
    setIsModalOpen(true);
    if (onMarkerClick) onMarkerClick(panneau);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPanneau(null);
  };

  const handleRecenterOnUser = () => {
    if (userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
      setZoom(15);
      setCenterTrigger((t) => t + 1);
    }
  };

  const panneauxFiltres = useMemo(() => {
    return filterPanneaux(panneaux, filters, reservationsMap);
  }, [panneaux, filters, reservationsMap]);

  if (!isMounted || loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-lg font-bold uppercase tracking-wider">
            {loading ? 'Chargement des panneaux...' : 'Chargement de la carte...'}
          </p>
        </div>
      </div>
    );
  }

  const panneauxAvecCoordonnees = panneauxFiltres.filter((p) => {
    const lat = p.latitude || 0;
    const lng = p.longitude || 0;
    return lat && lng;
  });

  if (panneauxAvecCoordonnees.length === 0) {
    return (
      <div className="h-full w-full relative" style={{ minHeight: '400px' }}>
        <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl">
          <div className="text-center p-8 max-w-lg">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-gray-500 font-bold text-lg">
              {panneaux.length === 0
                ? 'Aucun panneau trouvé'
                : 'Aucun panneau ne correspond aux filtres'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {panneaux.length === 0
                ? 'La base de données ne contient aucun panneau'
                : `${panneauxFiltres.length} / ${panneaux.length} panneau(x) affiché(s)`}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
            >
              🔄 Recharger
            </button>
          </div>
        </div>
        <FilterButton
          filters={filters}
          onFiltersChange={setFilters}
          totalResults={panneauxFiltres.length}
          totalPanneaux={panneaux.length}
        />
      </div>
    );
  }

  return (
    <GoogleMapProvider>
      <div className="h-full w-full relative" style={{ minHeight: '400px' }}>
        <GoogleMap
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={center}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <MapCenterController
            center={center}
            trigger={centerTrigger}
            zoom={zoom}
          />

          <MapMarkers
            panneaux={panneauxAvecCoordonnees}
            userLocation={userLocation}
            onMarkerClick={handleMarkerClick}
          />
        </GoogleMap>

        <FilterButton
          filters={filters}
          onFiltersChange={setFilters}
          totalResults={panneauxFiltres.length}
          totalPanneaux={panneaux.length}
        />

        {userLocation && (
          <button
            onClick={handleRecenterOnUser}
            className="absolute bottom-24 right-4 z-[10] w-11 h-11 bg-white hover:bg-blue-50 text-blue-600 rounded-full shadow-lg border border-gray-200 flex items-center justify-center transition"
            title="Recentrer sur ma position"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="8" opacity="0.3" />
            </svg>
          </button>
        )}

        <MapControls
          userLocation={userLocation}
          locationError={locationError}
          onRefresh={() => {
            setLoading(true);
            const fetchPanneaux = async () => {
              try {
                const response = await fetch('/api/panneaux', {
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                });
                if (response.ok) {
                  const data = await response.json();
                  setPanneaux(data);
                }
              } catch (error) {
                console.error('Erreur rafraîchissement:', error);
              } finally {
                setLoading(false);
              }
            };
            fetchPanneaux();
          }}
        />

        {isModalOpen && selectedPanneau && (
          <PanneauDetailModal
            panneau={selectedPanneau}
            onClose={handleCloseModal}
            onReserveClick={onReserveClick}
            onAddToCart={handleToggleCart}
            isInCart={isInCart}
          />
        )}
      </div>
    </GoogleMapProvider>
  );
}