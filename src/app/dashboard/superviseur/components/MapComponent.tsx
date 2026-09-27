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
    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[10] w-[160px] sm:w-[200px] md:w-[220px] max-w-[calc(100vw-1rem)]">
      <div className="bg-black/70 backdrop-blur-md rounded-xl border border-white/15 shadow-2xl overflow-hidden">
        {/* Header cliquable */}
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

        {/* Contenu */}
        {!collapsed && (
          <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3 space-y-1 sm:space-y-1.5">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[9px] sm:text-[10px] text-white/70"
              >
                <div
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${item.color} shadow shrink-0`}
                />
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

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (userLocation) {
      setCenter({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation]);

  // ✅ CONTAINER RESPONSIVE UNIVERSELLEMENT (mobile → 4K)
  const containerClassName =
    'relative w-full h-[100dvh] min-h-[500px] sm:h-full sm:min-h-[600px] lg:min-h-[700px] xl:min-h-[800px] 2xl:min-h-[900px]';

  if (!isMounted) {
    return (
      <div className={`${containerClassName} flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950`}>
        <div className="text-center px-4">
          <div className="w-14 h-14 sm:w-20 sm:h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80 text-sm sm:text-lg font-bold uppercase tracking-wider">
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
        <GoogleMap
          mapId={GOOGLE_MAPS_MAP_ID}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          gestureHandling="greedy"

          // 🎛️ Contrôles
          zoomControl={true}
          streetViewControl={true}
          mapTypeControl={true}       // Plan / Satellite / Hybride
          fullscreenControl={true}
          rotateControl={true}        // 🔄 Rotation
          tiltControl={true}          // 🏔️ 3D / Inclinaison

          // 📍 Positions
          zoomControlOptions={{ position: 6 /* RIGHT_BOTTOM */ }}
          fullscreenControlOptions={{ position: 3 /* TOP_RIGHT */ }}
          mapTypeControlOptions={{ position: 8 /* LEFT_BOTTOM */ }}
          rotateControlOptions={{ position: 8 /* LEFT_BOTTOM */ }}

          style={{ width: '100%', height: '100%' }}
        >
          <MapCenter center={center} zoom={zoom} />

          {/* 📍 Position utilisateur */}
          {userLocation && (
            <AdvancedMarker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              zIndex={2000}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex w-9 h-9 rounded-full bg-emerald-500 opacity-40 animate-ping" />
                <span className="relative w-5 h-5 rounded-full bg-emerald-600 border-[3px] border-white shadow-lg" />
              </div>
            </AdvancedMarker>
          )}

          {/* 📌 Panneaux — MÊME LOGIQUE QUE LE COMMERCIAL */}
          {panneaux.map((panneau) => {
            if (!panneau.latitude || !panneau.longitude) return null;

            const panneauNormalise = panneau as PanneauMap;
            const { color } = getMarkerColorAndStatus(panneauNormalise);
            const palette = MARKER_COLORS[color];
            const isPulsing = color === 'red';

            return (
              <AdvancedMarker
                key={panneau.id_panneau}
                position={{
                  lat: panneau.latitude,
                  lng: panneau.longitude,
                }}
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
              position={{
                lat: openPanneau.latitude,
                lng: openPanneau.longitude,
              }}
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

        {/* 📊 Légende — EN HAUT À DROITE (repliable) */}
        <SupervisorLegend />
      </div>
    </GoogleMapProvider>
  );
}