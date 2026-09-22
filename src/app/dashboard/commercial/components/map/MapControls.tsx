// src/app/dashboard/commercial/components/map/MapControls.tsx

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';

interface MapControlsProps {
  userLocation: { lat: number; lng: number } | null;
  locationError: string | null;
  onRefresh: () => void;
}

export function MapControls({
  userLocation,
  locationError,
  onRefresh,
}: MapControlsProps) {
  const [legendVisible, setLegendVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Faire disparaître la légende après 8s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;

    if (legendVisible) {
      timer = setTimeout(() => {
        setFadeOut(true);
        fadeTimer = setTimeout(() => setLegendVisible(false), 500);
      }, 8000);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [legendVisible]);

  // Réafficher la légende à l'interaction avec la carte Google
  useEffect(() => {
    const mapContainer = document.querySelector(
      '.gm-style'
    ) as HTMLElement | null;
    if (!mapContainer) return;

    const handleInteraction = () => {
      setLegendVisible(true);
      setFadeOut(false);
    };

    const events = ['click', 'touchstart', 'mousedown', 'wheel'] as const;
    events.forEach((ev) =>
      mapContainer.addEventListener(ev, handleInteraction, { passive: true })
    );

    return () => {
      events.forEach((ev) =>
        mapContainer.removeEventListener(ev, handleInteraction)
      );
    };
  }, []);

  return (
    <div className="absolute bottom-6 left-6 z-[10] flex flex-col gap-1.5">
      {/* GPS Indicator */}
      <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 shadow-lg">
        {userLocation ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              GPS
            </span>
          </div>
        ) : locationError ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              {locationError}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
              GPS...
            </span>
          </div>
        )}
      </div>

      {/* Bouton refresh */}
      <button
        onClick={onRefresh}
        className="bg-black/50 backdrop-blur-sm p-2 rounded-full border border-white/10 hover:bg-black/70 transition shadow-lg"
        title="Rafraîchir la carte"
      >
        <RefreshCw size={14} className="text-white/80" />
      </button>

      {/* Légende */}
      {!legendVisible ? (
        <button
          onClick={() => {
            setLegendVisible(true);
            setFadeOut(false);
          }}
          className="bg-black/50 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10 hover:bg-black/70 transition shadow-lg text-white/60 text-[10px] font-medium flex items-center gap-1"
        >
          <span className="text-[10px]">📊</span> Légende
        </button>
      ) : (
        <div
          className={`bg-black/60 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg transition-all duration-500 ${
            fadeOut
              ? 'opacity-0 translate-y-4 pointer-events-none'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-white/60 text-[10px] font-bold">Légende</p>
              <button
                onClick={() => {
                  setFadeOut(true);
                  setTimeout(() => setLegendVisible(false), 500);
                }}
                className="text-white/30 hover:text-white/60 transition"
              >
                <ChevronDown size={12} />
              </button>
            </div>
            <div className="space-y-1">
              <LegendItem color="bg-red-500" label="Problème" />
              <LegendItem color="bg-amber-500" label="Complet" />
              <LegendItem color="bg-blue-500" label="Diffusion" />
              <LegendItem color="bg-green-500" label="Partiel" />
              <LegendItem color="bg-emerald-400" label="Libre" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-white/50 hover:text-white/80 transition cursor-pointer">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}