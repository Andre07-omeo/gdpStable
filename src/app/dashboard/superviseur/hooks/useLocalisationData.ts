'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/hooks/useLocalisationData.tsimport { useState, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface Pays {
  id_pays: number;
  nom: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id_province: number;
  nom: string;
  code: string;
  pays_id: number;
  pays_nom?: string;
  pays_code?: string;
  created_at: string;
  updated_at: string;
}

export interface District {
  id_district: number;
  nom: string;
  code: string;
  province_id: number;
  province_nom?: string;
  province_code?: string;
  pays_nom?: string;
  created_at: string;
  updated_at: string;
}

export interface Ville {
  id_ville: number;
  nom: string;
  code: string | null;
  province_id: number;
  province_nom?: string;
  province_code?: string;
  pays_nom?: string;
  created_at: string;
  updated_at: string;
}

export interface Commune {
  id_commune: number;
  nom: string;
  code: string;
  ville_id: number;
  district_id: number | null;
  ville_nom?: string;
  district_nom?: string;
  district_code?: string;
  province_nom?: string;
  created_at: string;
  updated_at: string;
}

type EntityType = 'pays' | 'provinces' | 'districts' | 'villes' | 'communes';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useLocalisationData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // HELPER : Requête générique
  // ============================================
  const apiCall = useCallback(async <T,>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<ApiResponse<T>> => {
    try {
      const options: RequestInit = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);

      const res = await fetch(endpoint, options);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erreur HTTP ${res.status}`);
      }
      return data;
    } catch (err: any) {
      console.error(`❌ ${method} ${endpoint}:`, err);
      return { success: false, error: err.message };
    }
  }, []);

  const BASE = '/api/superviseurs/localisation';

  // ============================================
  // LOADERS (GET)
  // ============================================

  const loadPays = useCallback(async (): Promise<Pays[]> => {
    setLoading(true);
    setError(null);
    const r = await apiCall<Pays[]>('GET', `${BASE}/pays`);
    setLoading(false);
    if (!r.success) { setError(r.error || 'Erreur'); return []; }
    return r.data || [];
  }, [apiCall]);

  const loadProvinces = useCallback(async (paysId?: number): Promise<Province[]> => {
    setLoading(true);
    setError(null);
    const url = paysId ? `${BASE}/provinces?pays_id=${paysId}` : `${BASE}/provinces`;
    const r = await apiCall<Province[]>('GET', url);
    setLoading(false);
    if (!r.success) { setError(r.error || 'Erreur'); return []; }
    return r.data || [];
  }, [apiCall]);

  const loadDistricts = useCallback(async (provinceId?: number, paysId?: number): Promise<District[]> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (provinceId) params.append('province_id', String(provinceId));
    if (paysId) params.append('pays_id', String(paysId));
    const url = params.toString() ? `${BASE}/districts?${params}` : `${BASE}/districts`;
    const r = await apiCall<District[]>('GET', url);
    setLoading(false);
    if (!r.success) { setError(r.error || 'Erreur'); return []; }
    return r.data || [];
  }, [apiCall]);

  const loadVilles = useCallback(async (provinceId?: number, paysId?: number): Promise<Ville[]> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (provinceId) params.append('province_id', String(provinceId));
    if (paysId) params.append('pays_id', String(paysId));
    const url = params.toString() ? `${BASE}/villes?${params}` : `${BASE}/villes`;
    const r = await apiCall<Ville[]>('GET', url);
    setLoading(false);
    if (!r.success) { setError(r.error || 'Erreur'); return []; }
    return r.data || [];
  }, [apiCall]);

  const loadCommunes = useCallback(async (filters?: {
    ville_id?: number;
    district_id?: number;
    province_id?: number;
  }): Promise<Commune[]> => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters?.ville_id) params.append('ville_id', String(filters.ville_id));
    if (filters?.district_id) params.append('district_id', String(filters.district_id));
    if (filters?.province_id) params.append('province_id', String(filters.province_id));
    const url = params.toString() ? `${BASE}/communes?${params}` : `${BASE}/communes`;
    const r = await apiCall<Commune[]>('GET', url);
    setLoading(false);
    if (!r.success) { setError(r.error || 'Erreur'); return []; }
    return r.data || [];
  }, [apiCall]);

  // ============================================
  // CREATE (POST)
  // ============================================

  const createPays = useCallback(async (data: { nom: string; code: string }) => {
    return apiCall<Pays>('POST', `${BASE}/pays`, data);
  }, [apiCall]);

  const createProvince = useCallback(async (data: { nom: string; code: string; pays_id: number }) => {
    return apiCall<Province>('POST', `${BASE}/provinces`, data);
  }, [apiCall]);

  const createDistrict = useCallback(async (data: { nom: string; code: string; province_id: number }) => {
    return apiCall<District>('POST', `${BASE}/districts`, data);
  }, [apiCall]);

  const createVille = useCallback(async (data: { nom: string; code?: string; province_id: number }) => {
    return apiCall<Ville>('POST', `${BASE}/villes`, data);
  }, [apiCall]);

  const createCommune = useCallback(async (data: {
    nom: string;
    code: string;
    ville_id: number;
    district_id?: number | null;
  }) => {
    return apiCall<Commune>('POST', `${BASE}/communes`, data);
  }, [apiCall]);

  // ============================================
  // CREATE MULTIPLE (bulk insert)
  // ============================================

  /**
   * Créer PLUSIEURS provinces pour un même pays
   * @example
   * createProvincesMultiple(1, [
   *   { nom: 'Kinshasa', code: 'KIN' },
   *   { nom: 'Kongo-Central', code: 'KC' }
   * ])
   */
  const createProvincesMultiple = useCallback(async (
    paysId: number,
    provinces: Array<{ nom: string; code: string }>
  ) => {
    const results: Array<{ success: boolean; data?: Province; error?: string; nom: string }> = [];
    for (const p of provinces) {
      const r = await apiCall<Province>('POST', `${BASE}/provinces`, {
        nom: p.nom,
        code: p.code,
        pays_id: paysId,
      });
      results.push({ ...r, nom: p.nom });
    }
    return results;
  }, [apiCall]);

  /**
   * Créer PLUSIEURS districts pour une même province
   */
  const createDistrictsMultiple = useCallback(async (
    provinceId: number,
    districts: Array<{ nom: string; code: string }>
  ) => {
    const results: Array<{ success: boolean; data?: District; error?: string; nom: string }> = [];
    for (const d of districts) {
      const r = await apiCall<District>('POST', `${BASE}/districts`, {
        nom: d.nom,
        code: d.code,
        province_id: provinceId,
      });
      results.push({ ...r, nom: d.nom });
    }
    return results;
  }, [apiCall]);

  /**
   * Créer PLUSIEURS villes pour une même province
   */
  const createVillesMultiple = useCallback(async (
    provinceId: number,
    villes: Array<{ nom: string; code?: string }>
  ) => {
    const results: Array<{ success: boolean; data?: Ville; error?: string; nom: string }> = [];
    for (const v of villes) {
      const r = await apiCall<Ville>('POST', `${BASE}/villes`, {
        nom: v.nom,
        code: v.code,
        province_id: provinceId,
      });
      results.push({ ...r, nom: v.nom });
    }
    return results;
  }, [apiCall]);

  /**
   * Créer PLUSIEURS communes/tronçons pour une même ville (+ district optionnel)
   */
  const createCommunesMultiple = useCallback(async (
    villeId: number,
    districtId: number | null,
    communes: Array<{ nom: string; code: string }>
  ) => {
    const results: Array<{ success: boolean; data?: Commune; error?: string; nom: string }> = [];
    for (const c of communes) {
      const r = await apiCall<Commune>('POST', `${BASE}/communes`, {
        nom: c.nom,
        code: c.code,
        ville_id: villeId,
        district_id: districtId,
      });
      results.push({ ...r, nom: c.nom });
    }
    return results;
  }, [apiCall]);

  // ============================================
  // UPDATE (PUT)
  // ============================================

  const updatePays = useCallback(async (id: number, data: { nom: string; code: string }) => {
    return apiCall<Pays>('PUT', `${BASE}/pays/${id}`, data);
  }, [apiCall]);

  const updateProvince = useCallback(async (id: number, data: { nom: string; code: string; pays_id: number }) => {
    return apiCall<Province>('PUT', `${BASE}/provinces/${id}`, data);
  }, [apiCall]);

  const updateDistrict = useCallback(async (id: number, data: { nom: string; code: string; province_id: number }) => {
    return apiCall<District>('PUT', `${BASE}/districts/${id}`, data);
  }, [apiCall]);

  const updateVille = useCallback(async (id: number, data: { nom: string; code?: string; province_id: number }) => {
    return apiCall<Ville>('PUT', `${BASE}/villes/${id}`, data);
  }, [apiCall]);

  const updateCommune = useCallback(async (id: number, data: {
    nom: string;
    code: string;
    ville_id: number;
    district_id?: number | null;
  }) => {
    return apiCall<Commune>('PUT', `${BASE}/communes/${id}`, data);
  }, [apiCall]);

  // ============================================
  // DELETE
  // ============================================

  const deleteEntity = useCallback(async (type: EntityType, id: number) => {
    return apiCall<{ message: string }>('DELETE', `${BASE}/${type}/${id}`);
  }, [apiCall]);

  // ============================================
  // RETURN
  // ============================================

  return {
    loading,
    error,
    // Loaders
    loadPays,
    loadProvinces,
    loadDistricts,
    loadVilles,
    loadCommunes,
    // Create simple
    createPays,
    createProvince,
    createDistrict,
    createVille,
    createCommune,
    // Create multiple (bulk)
    createProvincesMultiple,
    createDistrictsMultiple,
    createVillesMultiple,
    createCommunesMultiple,
    // Update
    updatePays,
    updateProvince,
    updateDistrict,
    updateVille,
    updateCommune,
    // Delete
    deleteEntity,
  };
}