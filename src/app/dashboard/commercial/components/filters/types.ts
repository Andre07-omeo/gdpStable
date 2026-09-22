// src/app/dashboard/commercial/components/filters/types.ts

export type PanneauSituation =
  | 'tous'
  | 'totalement_occupe'
  | 'partiellement_occupe'
  | 'totalement_reserve'
  | 'partiellement_reserve'
  | 'totalement_libre'
  | 'partiellement_libre'
  | 'totalement_en_panne'
  | 'partiellement_en_panne';

export type FaceSituation =
  | 'tous'
  | 'occupee'
  | 'reservee'
  | 'libre'
  | 'en_panne';

export interface PanneauFiltersState {
  search: string;
  situation: PanneauSituation;
  faceSituation: FaceSituation; // ← gardé pour compatibilité
  echeanceActive: boolean;
  echeanceDebut: string;
  echeanceFin: string;
}

export const DEFAULT_FILTERS: PanneauFiltersState = {
  search: '',
  situation: 'tous',
  faceSituation: 'tous',
  echeanceActive: false,
  echeanceDebut: '',
  echeanceFin: '',
};

// ✅ Couleurs officielles
export const COLORS = {
  libre: '#10B981',
  reserve: '#F59E0B',
  occupe: '#3B82F6',
  en_panne: '#EF4444',
  neutre: '#6B7280',
};