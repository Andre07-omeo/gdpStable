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

// ─── Utilitaire : parse une date ───
function parseDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const normalized = String(str).trim().replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Utilitaire : normalise une date à minuit ───
function atStartOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

// ─── Utilitaire : la réservation est-elle future ? ───
// Utilisé UNIQUEMENT pour le compteur "Rés. Futures"
function isReservationFuture(resa: ReservationInfo, today: Date): boolean {
  const debut = parseDate(resa.date_debut);
  if (!debut) return false;

  const debutDay = atStartOfDay(debut);
  const todayDay = atStartOfDay(today);

  return debutDay > todayDay;
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

  // Fonction pour obtenir le statut d'une face
  const getFaceStatus = (face: CommercialFace): string => {
    return face.status || 'Libre';
  };

  // ─── Panneaux filtrés ───
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

      // Filtre statut
      if (statusFilter !== 'Tous') {
        const hasMatchingFace = (panneau.faces || []).some((face) => {
          return getFaceStatus(face) === statusFilter;
        });
        if (!hasMatchingFace) return false;
      }

      return true;
    });
  }, [panneaux, geoFilter, searchFilter, statusFilter, typeFilter]);

  // ============================================
  // ✅ STATISTIQUES — CORRIGÉES
  // ============================================
  // Nouvelle logique : on lit DIRECTEMENT le `status` de chaque face,
  // calculé par l'API. Le hook ne fait que COMPTER.
  //
  //   - Libre    : face.status === 'Libre'
  //   - Réservé  : face.status === 'Réservé'
  //   - Occupé   : face.status === 'Occupé'
  //   - Problème : face.status === 'Problème' (compté séparément, pas dans les cartes)
  //
  // Pour "Rés. Futures" : on utilise le reservationsMap
  //   (le status de l'API ne le distingue pas)
  // ============================================
  const stats = useMemo(() => {
    const today = new Date();

    let totalFaces = 0;
    let totalLibres = 0;
    let totalOccupes = 0;
    let totalReserves = 0;
    let totalProblemes = 0;
    let totalEnAttente = 0;
    let totalReservationsFutures = 0;

    // 1️⃣ Compter les faces par `status` (calculé par l'API)
    filteredPanneaux.forEach((panneau) => {
      (panneau.faces || []).forEach((face) => {
        totalFaces++;

        const status = face.status || 'Libre';

        if (status === 'Problème') {
          totalProblemes++;
        } else if (status === 'Occupé') {
          totalOccupes++;
        } else if (status === 'Réservé') {
          totalReserves++;
        } else if (status === 'En attente') {
          totalEnAttente++;
        } else {
          // 'Libre' ou inconnu
          totalLibres++;
        }
      });
    });

    // 2️⃣ Compter les réservations futures (via reservationsMap)
    //    ⚠️ Utilisé uniquement pour la carte "Rés. Futures"
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
      totalProblemes,
      totalEnAttente,
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