'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/hooks/useAffichages.tsimport { useState, useEffect, useCallback } from 'react';

export interface AffichageReservation {
  id_reservation: number;
  id_client: number;
  id_commercial: number | null;
  id_chef_validation: number | null;
  id_chef_commercial: number | null;
  id_superviseur: number | null;

  validation_chef_commercial: boolean;
  validation_superviseur: boolean;

  date_validation_chef: string | null;
  date_validation_superviseur: string | null;

  numero_commande: string | null;
  date_creation: string | null;
  date_debut_campagne: string | null;
  date_fin_campagne: string | null;

  statut: string | null;
  est_verrouille: boolean;
  date_verrouillage: string | null;

  notes: string | null;

  created_at: string | null;
  updated_at: string | null;
  date_expiration: string | null;

  photoCampagneUrl: string | null;
  photo_metadata: any;
  photo_latitude: number | null;
  photo_longitude: number | null;
  date_upload_photo: string | null;

  client?: {
    id: number;
    nom: string;
    raison_sociale?: string;
    email?: string;
    telephone?: string;
  } | null;

  commercial?: {
    id: number;
    nom: string;
    prenom: string;
    email?: string;
  } | null;

  chef?: {
    nom: string;
    prenom: string;
  } | null;

  superviseur?: {
    nom: string;
    prenom: string;
  } | null;
}

interface UseAffichagesResult {
  affichages: AffichageReservation[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  isValidating: boolean;
  refresh: () => Promise<void>;
  validerReservations: (ids: number[], notes?: string) => Promise<boolean>;
}

export function useAffichages(): UseAffichagesResult {
  const [affichages, setAffichages] = useState<AffichageReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAffichages = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch('/api/superviseurs/affichages', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur ${res.status}`);
      }

      const json = await res.json();
      const list: AffichageReservation[] = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];

      setAffichages(list);
    } catch (err: any) {
      console.error('❌ useAffichages error:', err);
      setError(err.message || 'Impossible de charger les affichages');
      setAffichages([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAffichages(false);
  }, [fetchAffichages]);

  const refresh = useCallback(() => fetchAffichages(true), [fetchAffichages]);

  const validerReservations = useCallback(
    async (ids: number[], notes?: string): Promise<boolean> => {
      if (!ids.length) return false;
      try {
        setIsValidating(true);
        const res = await fetch('/api/superviseurs/affichages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reservationIds: ids, notes }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur ${res.status}`);
        }

        await fetchAffichages(true);
        return true;
      } catch (err: any) {
        console.error('❌ validerReservations:', err);
        alert('❌ ' + (err.message || 'Erreur lors de la validation'));
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [fetchAffichages]
  );

  return {
    affichages,
    loading,
    error,
    isRefreshing,
    isValidating,
    refresh,
    validerReservations,
  };
}