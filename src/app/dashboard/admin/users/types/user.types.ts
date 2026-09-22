// ============================================
// TYPES - GESTION DES UTILISATEURS
// ============================================

export interface User {
  id: number;
  id_user: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  departement: string;
  fonction: string;
  profil: string;
  profilLibelle: string;
  actif: boolean;
  zone_travail?: string | null;
  zone_niveau: string;
  id_profil: number;
  created_at: string;
  updated_at: string;
  ville_nom: string | null;  // ✅ AJOUTER CE CHAMP
  derniere_connexion?: string | null;

  // ✅ Relations géographiques
  province_id?: number | null;
  ville_id?: number | null;
  commune_id?: number | null;
  pays_id?: number | null;

  // ✅ Informations supplémentaires
  sexe?: string;
  id_manager?: number | null;
}

export interface CreateUserDTO {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  departement?: string;
  fonction?: string;
  id_profil: number;
  zone_travail?: string | null;
  zone_niveau?: string;
  sexe?: string;
  actif?: boolean;

  // ✅ Relations géographiques
  province_id?: number | null;
  ville_id?: number | null;
  commune_id?: number | null;
  pays_id?: number | null;

  // ✅ Gestionnaire
  id_manager?: number | null;
}

// src/app/dashboard/admin/users/types/user.types.ts

export interface CreateUserDTO {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville_nom?: string;  // ✅ CORRECT
  ville?: string;      // ✅ Pour compatibilité
  departement?: string;
  fonction?: string;
  id_profil: number;
  zone_travail?: string | null;
  zone_niveau?: string;
  sexe?: string;
  actif?: boolean;
  province_id?: number | null;
  ville_id?: number | null;
  commune_id?: number | null;
  pays_id?: number | null;
  id_manager?: number | null;
}

export interface UpdateUserDTO {
  nom?: string;
  prenom?: string;
  email?: string;
  password?: string;
  telephone?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;           // ✅ AJOUTER
  ville_nom?: string;       // ✅ GARDER POUR COMPATIBILITÉ
  departement?: string;
  fonction?: string;
  id_profil?: number;
  zone_travail?: string | null;
  zone_niveau?: string;
  sexe?: string;
  actif?: boolean;
  province_id?: number | null;
  ville_id?: number | null;
  commune_id?: number | null;
  pays_id?: number | null;
  id_manager?: number | null;
}

export interface UserFilters {
  search?: string;
  role?: string;
  actif?: boolean;
  id_profil?: number;
  province_id?: number;
  ville_id?: number;
  commune_id?: number;
  zone_niveau?: string;
}

export interface UserStats {
  total: number;
  actifs: number;
  inactifs: number;
  byRole: Record<string, number>;
}

// ============================================
// TYPES POUR LA SÉLECTION DES ZONES
// ============================================

export interface LocationSelection {
  // Format avec underscore (pour compatibilité)
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
  commune_id?: number;

  // Format camelCase (pour le composant moderne)
  paysId?: number;
  provinceIds?: number[];
  villeIds?: number[];
  communeIds?: number[];
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Convertit une sélection en chaîne pour stockage
 * Format: "pays:1|provinces:2,3,4|villes:5,6|communes:7,8,9"
 */
export function locationSelectionToString(selection: LocationSelection): string {
  if (!selection.paysId && !selection.pays_id) return '';

  const paysId = selection.paysId || selection.pays_id;
  const parts = [`pays:${paysId}`];

  if (selection.provinceIds?.length) {
    parts.push(`provinces:${selection.provinceIds.join(',')}`);
  }
  if (selection.villeIds?.length) {
    parts.push(`villes:${selection.villeIds.join(',')}`);
  }
  if (selection.communeIds?.length) {
    parts.push(`communes:${selection.communeIds.join(',')}`);
  }

  return parts.join('|');
}

/**
 * Parse une chaîne en sélection
 */
export function stringToLocationSelection(str: string): LocationSelection {
  if (!str) return {};

  try {
    const selection: LocationSelection = {};
    str.split('|').forEach(part => {
      const [key, value] = part.split(':');
      if (!key || !value) return;

      switch (key) {
        case 'pays':
          const paysId = parseInt(value);
          selection.paysId = paysId;
          selection.pays_id = paysId;
          break;
        case 'provinces':
          selection.provinceIds = value.split(',').map(Number);
          break;
        case 'villes':
          selection.villeIds = value.split(',').map(Number);
          break;
        case 'communes':
          selection.communeIds = value.split(',').map(Number);
          break;
      }
    });
    return selection;
  } catch {
    return {};
  }
}

/**
 * Vérifie si une sélection est vide
 */
export function isLocationSelectionEmpty(selection: LocationSelection): boolean {
  return !selection.paysId && !selection.pays_id;
}

/**
 * Obtient un résumé textuel de la sélection
 */
export function getLocationSummary(selection: LocationSelection): string {
  const parts: string[] = [];

  if (selection.paysId || selection.pays_id) {
    parts.push('Pays sélectionné');
  }
  if (selection.provinceIds?.length) {
    parts.push(`${selection.provinceIds.length} province(s)`);
  }
  if (selection.villeIds?.length) {
    parts.push(`${selection.villeIds.length} ville(s)`);
  }
  if (selection.communeIds?.length) {
    parts.push(`${selection.communeIds.length} commune(s)`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'Aucune zone sélectionnée';
}

/**
 * Extrait les IDs de la sélection
 */
export function extractLocationIds(selection: LocationSelection): {
  provinceIds: number[];
  villeIds: number[];
  communeIds: number[];
} {
  return {
    provinceIds: selection.provinceIds || [],
    villeIds: selection.villeIds || [],
    communeIds: selection.communeIds || []
  };
}

/**
 * Crée une sélection à partir d'un pays ID
 */
export function createLocationSelectionFromPays(paysId: number): LocationSelection {
  return {
    paysId: paysId,
    pays_id: paysId,
    provinceIds: [],
    villeIds: [],
    communeIds: []
  };
}

// ============================================
// TYPES POUR LES ROLES
// ============================================

export interface Role {
  id: number;
  code: string;
  libelle: string;
  niveauHierarchique: number;
  permissions?: any;
  created_at?: string;
}

// ============================================
// TYPES POUR LES RÉPONSES API
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// CONSTANTES
// ============================================

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  ADMIN_SYSTEM: 'ADMIN_SYSTEM',
  COMMERCIAL: 'COMMERCIAL',
  SUPERVISEUR: 'SUPERVISEUR',
  CAISSIER: 'CAISSIER',
  DG: 'DG',
  PDG: 'PDG',
  COMPTABLE: 'COMPTABLE'
} as const;

export const ZONE_NIVEAUX = {
  NATIONAL: 'National',
  PROVINCIAL: 'Provincial',
  LOCAL: 'Local'
} as const;

export const SEXE = {
  HOMME: 'Homme',
  FEMME: 'Femme',
  AUTRE: 'Autre',
  NON_SPECIFIE: 'Non spécifié'
} as const;