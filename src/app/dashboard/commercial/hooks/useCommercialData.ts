'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/hooks/useCommercialData.ts
import { useState, useEffect, useCallback } from 'react';
import { CommercialPanneau, CommercialPanneauxResponse } from '../types/commercial.types';

export function useCommercialData() {
  const [panneaux, setPanneaux] = useState<CommercialPanneau[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/commercials/panneaux');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const data: CommercialPanneauxResponse = await response.json();
      if (data.success) {
        setPanneaux(data.data);
      } else {
        throw new Error('Erreur lors du chargement des données');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur useCommercialData:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    panneaux,
    loading,
    error,
    refresh: fetchData
  };
}