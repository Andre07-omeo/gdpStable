'use client';

// src/app/dashboard/commercial/components/MapComponentWrapper.tsximport MapComponent from './MapComponent';
import { PanneauMap } from './map/types';
import { ReservationsMap } from './filters/reservationsLoader';

interface MapComponentWrapperProps {
  panneaux?: PanneauMap[];
  reservationsMap?: ReservationsMap;
  userLocation: { lat: number; lng: number } | null;
  locationError?: string | null;
  onMarkerClick?: (panneau: PanneauMap) => void;
  onReserveClick?: (panneau: PanneauMap, face?: any) => void;
  onAddToCart?: (panneau: PanneauMap, face?: any) => void;
}

export default function MapComponentWrapper(props: MapComponentWrapperProps) {
  return <MapComponent {...props} />;
}