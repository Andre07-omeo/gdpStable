'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/hooks/usePanneauxFilters.ts
import { useMemo, useState } from 'react';
import { CommercialPanneau, CommercialFace } from '../types/commercial.types';
import type {
  ReservationsMap,
  ReservationInfo,
} from '../components/filters/reservationsLoader';

interface UsePanneauxFiltersProps {
  panneaux: CommercialPanneau[];
  reservationsMap?: ReservationsMap;
}

// ─── Utilitaire : parse une date (supporte ISO + MySQL datetime) ───
function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const normalized = String(str).trim().replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Utilitaire : normalise une date à minuit (début de jour) ───
function atStartOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

// ─── Utilitaire : normalise une date à 23:59:59 (fin de jour) ───
function atEndOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

// ─── Utilitaire : la réservation est-elle active AUJOURD'HUI ? ───
function isReservationActiveToday(resa: ReservationInfo, today: Date): boolean {
  const debut = parseDate(resa.date_debut);
  const fin = parseDate(resa.date_fin);

  if (!debut || !fin) return false;

  const debutDay = atStartOfDay(debut);
  const finDay = atEndOfDay(fin);
  const todayDay = atStartOfDay(today);

  return debutDay <= todayDay && todayDay <= finDay;
}

// ─── Utilitaire : la réservation est-elle future ? ───
function isReservationFuture(resa: ReservationInfo, today: Date): boolean {
  const debut = parseDate(resa.date_debut);
  if (!debut) return false;

  const debutDay = atStartOfDay(debut);
  const todayDay = atStartOfDay(today);

  return debutDay > todayDay;
}

// ─── Utilitaire : la réservation a-t-elle une photo ? ───
// Utilise directement le champ `hasPhoto` calculé dans le loader (plus fiable)
function hasPhoto(resa: ReservationInfo): boolean {
  if (typeof resa.hasPhoto === 'boolean') return resa.hasPhoto;
  // Fallback : vérifie photoCampagneUrl
  return !!(
    resa.photoCampagneUrl &&
    String(resa.photoCampagneUrl).trim() !== ''
  );
}

export function usePanneauxFilters({
  panneaux,
  reservationsMap,
}: UsePanneauxFiltersProps) {
  const [geoFilter, setGeoFilter] = useState({
    pays: 'Tous',
    province: 'Tous',
    district: 'Tous',
    commune: 'Tous',
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Tous');
  const [typeFilter, setTypeFilter] = useState<string>('Tous');

  // Fonction pour obtenir le statut d'une face (version CommercialFace)
  const getFaceStatus = (face: CommercialFace): string => {
    return face.status || 'Libre';
  };

  // Panneaux filtrés
  const filteredPanneaux = useMemo(() => {
    if (!panneaux) return [];

    return panneaux.filter((panneau) => {
      // Filtre géographique
      if (geoFilter.pays !== 'Tous') {
        const paysMatch = panneau.adresse
          ?.toLowerCase()
          .startsWith(geoFilter.pays.toLowerCase());
        if (!paysMatch) return false;
      }

      if (geoFilter.province !== 'Tous') {
        const adresseParts = (panneau.adresse || '')
          .split('/')
          .map((s: string) => s.trim());
        const province = adresseParts[1] || '';
        if (!province.toLowerCase().includes(geoFilter.province.toLowerCase()))
          return false;
      }

      // Filtre recherche
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchId = (panneau.idPan || '').toLowerCase().includes(searchLower);
        const matchNom = (panneau.nom || '').toLowerCase().includes(searchLower);
        const matchAdresse = (panneau.adresse || '')
          .toLowerCase()
          .includes(searchLower);
        if (!matchId && !matchNom && !matchAdresse) return false;
      }

      // Filtre type
      if (typeFilter !== 'Tous') {
        const panneauType = (panneau.type || '').toLowerCase().trim();
        if (panneauType !== typeFilter.toLowerCase().trim()) return false;
      }

      // Filtre statut (vérifier si au moins une face a ce statut)
      if (statusFilter !== 'Tous') {
        const hasMatchingFace = (panneau.faces || []).some((face) => {
          return getFaceStatus(face) === statusFilter;
        });
        if (!hasMatchingFace) return false;
      }

      return true;
    });
  }, [panneaux, geoFilter, searchFilter, statusFilter, typeFilter]);

  // ─── Statistiques (calculées à partir des réservations) ───
  const stats = useMemo(() => {
    const today = new Date();

    let totalFaces = 0;
    let totalLibres = 0;
    let totalOccupes = 0;
    let totalReserves = 0;
    let totalReservationsFutures = 0;

    // 1️⃣ Parcourir toutes les faces des panneaux filtrés
    filteredPanneaux.forEach((panneau) => {
      (panneau.faces || []).forEach((face) => {
        totalFaces++;

        const faceId = Number(face.id_face);

        // ✅ Utiliser Map.get() avec le type exact
        const reservations: ReservationInfo[] =
          reservationsMap instanceof Map
            ? reservationsMap.get(faceId) || []
            : [];

        // Chercher une réservation active aujourd'hui
        const reservationActive = reservations.find((r) =>
          isReservationActiveToday(r, today)
        );

        if (reservationActive) {
          // ✅ La face a une réservation en cours → RÉSERVÉE
          totalReserves++;

          // ✅ OCCUPÉE si la réservation active a une photo
          if (hasPhoto(reservationActive)) {
            totalOccupes++;
          }
        } else {
          // ✅ LIBRE si aucune réservation active
          totalLibres++;
        }
      });
    });

    // 2️⃣ Compter TOUTES les réservations futures
    if (reservationsMap instanceof Map) {
      reservationsMap.forEach((reservations) => {
        (reservations || []).forEach((resa) => {
          if (isReservationFuture(resa, today)) {
            totalReservationsFutures++;
          }
        });
      });
    }

    return {
      totalPanneaux: filteredPanneaux.length,
      totalFaces,
      totalLibres,
      totalOccupes,
      totalReserves,
      totalReservationsFutures,
      totalRevenue: 0,
    };
  }, [filteredPanneaux, reservationsMap]);

  return {
    geoFilter,
    dateFilter,
    searchFilter,
    statusFilter,
    typeFilter,
    setGeoFilter,
    setDateFilter,
    setSearchFilter,
    setStatusFilter,
    setTypeFilter,
    filteredPanneaux,
    stats,
    getFaceStatus,
  };
}