// src/app/dashboard/commercial/components/map/MapMarkers.tsx

'use client';

import { AdvancedMarker, InfoWindow, Pin } from '@vis.gl/react-google-maps';
import { useState } from 'react';
import { PanneauPopup } from './PanneauPopup';
import { PanneauMap } from './types';
import { getMarkerColorAndStatus, MARKER_COLORS } from './markerLogic';

interface MapMarkersProps {
  panneaux: PanneauMap[];
  userLocation: { lat: number; lng: number } | null;
  onMarkerClick: (panneau: PanneauMap) => void;
}

export function MapMarkers({
  panneaux,
  userLocation,
  onMarkerClick,
}: MapMarkersProps) {
  const [openPopupId, setOpenPopupId] = useState<number | null>(null);

  const openPanneau = panneaux.find(
    (p) => (p.id_panneau || 0) === openPopupId
  );

  return (
    <>
      {/* 📍 Position utilisateur */}
      {userLocation && (
        <AdvancedMarker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          zIndex={2000}
          title="Vous êtes ici"
        >
          <div className="relative flex items-center justify-center">
            {/* Halo pulsant */}
            <span className="absolute inline-flex w-10 h-10 rounded-full bg-blue-500 opacity-40 animate-ping" />
            {/* Point bleu */}
            <span className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 border-[3px] border-white shadow-lg">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
              </svg>
            </span>
          </div>
        </AdvancedMarker>
      )}

      {/* 📌 Panneaux */}
      {panneaux.map((panneau) => {
        const lat = panneau.latitude || 0;
        const lng = panneau.longitude || 0;
        const { color, clickable } = getMarkerColorAndStatus(panneau);
        const palette = MARKER_COLORS[color];
        const isPulsing = color === 'red';
        const id = panneau.id_panneau || 0;

        return (
          <AdvancedMarker
            key={panneau.id_panneau || panneau.idPan}
            position={{ lat, lng }}
            zIndex={isPulsing ? 1000 : 500}
            onClick={() => {
              if (clickable) {
                setOpenPopupId(id);
              }
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Halo pulsant rouge (panneau en panne) */}
              {isPulsing && (
                <span
                  className="absolute inline-flex w-9 h-9 rounded-full animate-ping opacity-60"
                  style={{ backgroundColor: palette.main }}
                />
              )}
              {/* Pin stylé */}
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

      {/* 🗨️ InfoWindow unique (une seule popup ouverte) */}
      {openPanneau && (
        <InfoWindow
          position={{
            lat: openPanneau.latitude || 0,
            lng: openPanneau.longitude || 0,
          }}
          onCloseClick={() => setOpenPopupId(null)}
          pixelOffset={[0, -40]}
        >
          <PanneauPopup
            panneau={openPanneau}
            onViewDetails={() => {
              const { clickable } = getMarkerColorAndStatus(openPanneau);
              if (clickable) {
                onMarkerClick(openPanneau);
                setOpenPopupId(null);
              }
            }}
          />
        </InfoWindow>
      )}
    </>
  );
}