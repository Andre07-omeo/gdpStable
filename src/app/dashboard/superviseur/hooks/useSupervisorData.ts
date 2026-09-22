// src/app/dashboard/superviseur/hooks/useSupervisorData.ts

import { useState, useEffect, useCallback } from 'react';
import { Panneau, ReservationWithDetails } from '../types/panneau.types';

export function useSupervisorData() {
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPanneau, setSelectedPanneau] = useState<Panneau | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithDetails | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ Charger les panneaux depuis l'API
  const loadPanneaux = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ CHANGEMENT ICI : Utiliser /api/panneaux au lieu de /api/map-panneaux
      const res = await fetch('/api/panneaux');
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      
      console.log('📊 Panneaux reçus:', data);
      console.log('📊 Nombre de panneaux:', data?.length || 0);
      console.log('📊 Est un tableau?', Array.isArray(data));
      
      // ✅ Vérifier que c'est un tableau
      if (Array.isArray(data)) {
        setPanneaux(data);
        setError(null);
      } else {
        console.error('❌ Les données ne sont pas un tableau:', data);
        setPanneaux([]);
        setError('Format de données invalide');
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'Erreur de chargement des données';
      setError(errorMessage);
      console.error('❌ Erreur chargement panneaux:', errorMessage);
      setPanneaux([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ✅ Fonction de rafraîchissement avec feedback
  const refreshPanneaux = useCallback(async () => {
    setIsRefreshing(true);
    await loadPanneaux();
  }, [loadPanneaux]);

  // Charger les réservations d'un panneau
  const loadPanneauReservations = useCallback(async (panneauId: number) => {
    try {
      const res = await fetch(`/api/superviseur/reservations?panneauId=${panneauId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Erreur chargement réservations:', err);
      return [];
    }
  }, []);

  // Mettre à jour le statut d'une réservation
  const updateReservation = useCallback(async (
    ligneId: number,
    nouveauStatut: string,
    photoFile?: File | null
  ) => {
    try {
      const formData = new FormData();
      formData.append('ligneId', String(ligneId));
      formData.append('statut', nouveauStatut);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await fetch('/api/superviseur/reservations', {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const data = await res.json();
      await loadPanneaux();
      return { success: true, photoUrl: data.photoUrl };
    } catch (err) {
      console.error('Erreur mise à jour:', err);
      return { success: false };
    }
  }, [loadPanneaux]);

  // Mettre à jour l'état du panneau
  const updatePanneauEtat = useCallback(async (panneauId: number, etat: string) => {
    try {
      const res = await fetch('/api/panneaux', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_panneau: panneauId, etat })
      });

      if (res.ok) {
        await loadPanneaux();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Erreur mise à jour panneau:', err);
      return false;
    }
  }, [loadPanneaux]);

  // Géolocalisation
  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        setLocationError("La géolocalisation n'est pas supportée");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          let errorMsg = "Impossible d'obtenir votre position";
          if (err.code === 1) errorMsg = "Accès à la localisation refusé";
          if (err.code === 2) errorMsg = "Position indisponible";
          if (err.code === 3) errorMsg = "Délai d'obtention dépassé";
          setLocationError(errorMsg);
        },
        { enableHighAccuracy: true, timeout: 30000 }
      );
    };

    getLocation();
    const interval = setInterval(getLocation, 60000);
    return () => clearInterval(interval);
  }, []);

  // Chargement initial
  useEffect(() => {
    loadPanneaux();
  }, [loadPanneaux]);

  return {
    panneaux,
    loading,
    error,
    selectedPanneau,
    setSelectedPanneau,
    selectedReservation,
    setSelectedReservation,
    userLocation,
    locationError,
    loadPanneaux,
    refreshPanneaux,
    isRefreshing,
    loadPanneauReservations,
    updateReservation,
    updatePanneauEtat
  };
}