'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/MapComponent.tsx
import { useEffect, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  GoogleMapProvider,
  GOOGLE_MAPS_MAP_ID,
} from '../../commercial/components/map/GoogleMapProvider';
import {
  getMarkerColorAndStatus,
  MARKER_COLORS,
} from '../../commercial/components/map/markerLogic';
import type { PanneauMap } from '../../commercial/components/map/types';

interface MapComponentProps {
  panneaux: any[];
  userLocation: { lat: number; lng: number } | null;
  onMarkerClick: (panneau: any) => void;
}

const DEFAULT_CENTER = { lat: -4.325, lng: 15.322 };
const DEFAULT_ZOOM = 13;

// 🎨 Styles pour le mode NUIT
const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b95a8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c4a35a' }],
  },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8b95a8' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1e2a1e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3444' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d4a5e' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2c3444' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1621' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5a78' }] },
];

type MapMode = 'plan' | 'nuit' | 'satellite';

/**
 * Contrôleur de centrage
 */
function MapCenter({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    if (zoom) map.setZoom(zoom);
  }, [center, zoom, map]);
  return null;
}

/**
 * 🎨 Applique le mode d'affichage
 */
function MapStyleController({ mode }: { mode: MapMode }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (mode === 'nuit') {
      map.setOptions({ mapTypeId: 'roadmap', styles: DARK_MAP_STYLE });
    } else if (mode === 'satellite') {
      map.setOptions({ mapTypeId: 'hybrid', styles: [] });
    } else {
      map.setOptions({ mapTypeId: 'roadmap', styles: [] });
    }
  }, [mode, map]);
  return null;
}

/**
 * 🎛️ Sélecteur de mode flottant
 */
function MapModeSwitcher({
  mode,
  onChange,
}: {
  mode: MapMode;
  onChange: (m: MapMode) => void;
}) {
  const options: { id: MapMode; label: string; icon: string }[] = [
    { id: 'plan', label: 'Clair', icon: '☀️' },
    { id: 'nuit', label: 'Nuit', icon: '🌙' },
    { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  ];

  return (
    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[15] flex gap-1 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-gray-200 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all active:scale-95 ${
            mode === opt.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          title={opt.label}
        >
          <span className="text-sm sm:text-base leading-none">{opt.icon}</span>
          <span className="hidden xs:inline sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * 📊 Légende repliable (responsive + repositionnée)
 */
function SupervisorLegend() {
  const [collapsed, setCollapsed] = useState(false);

  const items = [
    { color: 'bg-red-500', label: 'Panneau en panne' },
    { color: 'bg-amber-500', label: 'Complet (sans image)' },
    { color: 'bg-blue-500', label: 'Diffusion (avec image)' },
    { color: 'bg-green-500', label: 'Partiellement libre' },
    { color: 'bg-emerald-400', label: 'Libre' },
    { color: 'bg-gray-500', label: 'Aucune face' },
  ];

  return (
    <div className="absolute top-16 right-3 sm:top-20 sm:right-4 z-[12] w-[150px] sm:w-[180px] md:w-[200px] lg:w-[220px] max-w-[calc(100vw-1.5rem)]">
      <div className="bg-black/75 backdrop-blur-md rounded-xl border border-white/15 shadow-2xl overflow-hidden">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-between px-2.5 py-2 sm:px-3 sm:py-2.5 hover:bg-white/5 transition"
        >
          <span className="text-[10px] sm:text-[11px] font-bold text-white/90 uppercase tracking-wider">
            📊 Légende
          </span>
          <span className="text-white/50 text-[10px] sm:text-xs">
            {collapsed ? '▼' : '▲'}
          </span>
        </button>

        {!collapsed && (
          <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 space-y-1 sm:space-y-1.5">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[9px] sm:text-[10px] text-white/75"
              >
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${item.color} shadow shrink-0`} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MapComponent({
  panneaux,
  userLocation,
  onMarkerClick,
}: MapComponentProps) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(14);
  const [isMounted, setIsMounted] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('plan');

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation]);

  // ✅ Container : prend TOUTE la hauteur disponible du parent
  const containerClassName =
    'relative w-full h-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] xl:min-h-[700px] 2xl:min-h-[800px] overflow-hidden';

  if (!isMounted) {
    return (
      <div className={`${containerClassName} flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950`}>
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-sm sm:text-base lg:text-lg font-bold uppercase tracking-wider">
            Chargement de la carte...
          </p>
        </div>
      </div>
    );
  }

  const openPanneau = panneaux.find((p) => p.id_panneau === openId);

  return (
    <GoogleMapProvider>
      <div className={containerClassName}>
        {/* ============ CARTE GOOGLE ============ */}
        <GoogleMap
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"

          // 🎛️ Contrôles natifs (limités pour éviter les conflits avec nos UI custom)
          zoomControl={true}
          streetViewControl={true}
          mapTypeControl={false}       // ❌ désactivé : on a notre propre switcher
          fullscreenControl={true}
          rotateControl={true}

          zoomControlOptions={{ position: 6 /* RIGHT_BOTTOM */ }}
          fullscreenControlOptions={{ position: 3 /* TOP_RIGHT */ }}
          rotateControlOptions={{ position: 8 /* LEFT_BOTTOM */ }}

          style={{ width: '100%', height: '100%' }}
        >
          <MapCenter center={center} zoom={zoom} />
          <MapStyleController mode={mapMode} />

          {/* 📍 Position utilisateur */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              zIndex={2000}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 opacity-40 animate-ping" />
                <span className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-600 border-[3px] border-white shadow-lg" />
              </div>
            </AdvancedMarker>
          )}

          {/* 📌 Panneaux */}
          {panneaux.map((panneau) => {
            if (!panneau.latitude || !panneau.longitude) return null;

            const panneauNormalise = panneau as PanneauMap;
            const { color } = getMarkerColorAndStatus(panneauNormalise);
            const palette = MARKER_COLORS[color];
            const isPulsing = color === 'red';

            return (
              <AdvancedMarker
                key={panneau.id_panneau}
                position={{ lat: panneau.latitude, lng: panneau.longitude }}
                zIndex={isPulsing ? 1500 : 1000}
                onClick={() => setOpenId(panneau.id_panneau)}
              >
                <div className="relative flex items-center justify-center">
                  {isPulsing && (
                    <span
                      className="absolute inline-flex w-9 h-9 rounded-full animate-ping opacity-60"
                      style={{ backgroundColor: palette.main }}
                    />
                  )}
                  <Pin
                    background={palette.main}
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                    scale={1}
                  />
                </div>
              </AdvancedMarker>
            );
          })}

          {/* 🗨️ InfoWindow */}
          {openPanneau && (
            <InfoWindow
              position={{ lat: openPanneau.latitude, lng: openPanneau.longitude }}
              pixelOffset={[0, -40]}
            >
              <div className="p-1 w-[200px] sm:w-[240px] md:max-w-[280px] font-sans">
                <h3 className="font-bold text-blue-800 text-xs sm:text-sm">
                  {openPanneau.idPan ||
                    openPanneau.nom ||
                    `Panneau #${openPanneau.id_panneau}`}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-gray-600 mt-1 line-clamp-2">
                  {openPanneau.adresse}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[9px] sm:text-[10px]">
                  <span
                    className={`px-1.5 py-0.5 rounded-full font-medium ${
                      openPanneau.etat === 'Actif'
                        ? 'bg-green-100 text-green-700'
                        : openPanneau.etat === 'EnMaintenance'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {openPanneau.etat || 'Actif'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                    {openPanneau.faces?.length || 0} face(s)
                  </span>
                </div>
                <button
                  onClick={() => {
                    setOpenId(null);
                    onMarkerClick(openPanneau);
                  }}
                  className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-[11px] font-bold rounded-lg transition active:scale-95"
                >
                  Voir les réservations →
                </button>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>

        {/* ============ SÉLECTEUR DE MODE (top-right) ============ */}
        <MapModeSwitcher mode={mapMode} onChange={setMapMode} />

        {/* ============ LÉGENDE (sous le switcher) ============ */}
        <SupervisorLegend />
      </div>
    </GoogleMapProvider>
  );
}