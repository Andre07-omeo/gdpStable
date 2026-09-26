'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/hooks/usePanneauxFilters.ts
import { useMemo, useState } from 'react';
import { CommercialPanneau, CommercialFace } from '../types/commercial.types';

interface UsePanneauxFiltersProps {
  panneaux: CommercialPanneau[];
}

export function usePanneauxFilters({ panneaux }: UsePanneauxFiltersProps) {
  const [geoFilter, setGeoFilter] = useState({
    pays: 'Tous',
    province: 'Tous',
    district: 'Tous',
    commune: 'Tous'
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
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
        const paysMatch = panneau.adresse?.toLowerCase().startsWith(geoFilter.pays.toLowerCase());
        if (!paysMatch) return false;
      }
      
      if (geoFilter.province !== 'Tous') {
        const adresseParts = (panneau.adresse || '').split('/').map((s: string) => s.trim());
        const province = adresseParts[1] || '';
        if (!province.toLowerCase().includes(geoFilter.province.toLowerCase())) return false;
      }
      
      // Filtre recherche
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchId = (panneau.idPan || '').toLowerCase().includes(searchLower);
        const matchNom = (panneau.nom || '').toLowerCase().includes(searchLower);
        const matchAdresse = (panneau.adresse || '').toLowerCase().includes(searchLower);
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

  // Statistiques
  const stats = useMemo(() => {
    let totalFaces = 0;
    let totalLibres = 0;
    let totalOccupes = 0;
    let totalReserves = 0;
    let totalReservationsFutures = 0;
    
    filteredPanneaux.forEach((panneau) => {
      (panneau.faces || []).forEach((face) => {
        totalFaces++;
        const status = getFaceStatus(face);
        if (status === 'Libre') totalLibres++;
        else if (status === 'Occupé') totalOccupes++;
        else if (status === 'Réservé' || status === 'En attente') totalReserves++;
        
        if (face.reservation_future) totalReservationsFutures++;
      });
    });
    
    return {
      totalPanneaux: filteredPanneaux.length,
      totalFaces,
      totalLibres,
      totalOccupes,
      totalReserves,
      totalReservationsFutures,
      totalRevenue: 0
    };
  }, [filteredPanneaux]);

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
    getFaceStatus
  };
}