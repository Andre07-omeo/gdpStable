'use client';

// src/app/dashboard/commercial/components/map/GoogleMapProvider.tsximport { APIProvider } from '@vis.gl/react-google-maps';
import { ReactNode } from 'react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY manquante dans .env.local');
}

export function GoogleMapProvider({ children }: { children: ReactNode }) {
  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['marker', 'places', 'geometry']}
      version="weekly"
    >
      {children}
    </APIProvider>
  );
}

export { GOOGLE_MAPS_MAP_ID };