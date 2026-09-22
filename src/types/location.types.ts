export interface Pays {
  id_pays: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id_province: number;
  pays_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Ville {
  id_ville: number;
  province_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Commune {
  id_commune: number;
  ville_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface LocationData {
  pays: Pays[];
  provinces: Province[];
  villes: Ville[];
  communes: Commune[];
}

// types/location.types.ts

// ============================================
// TYPES POUR LES LOCALISATIONS
// ============================================

// Types de base pour les entités géographiques
export interface Pays {
  id_pays: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Province {
  id_province: number;
  pays_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Ville {
  id_ville: number;
  province_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

export interface Commune {
  id_commune: number;
  ville_id: number;
  code: string;
  nom: string;
  created_at: string;
  updated_at: string;
}

// Version simplifiée pour les sélections (avec alias id)
export interface LocationItem {
  id: number;
  code: string;
  nom: string;
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
}

// Données complètes de localisation
export interface LocationData {
  pays: Pays[];
  provinces: Province[];
  villes: Ville[];
  communes: Commune[];
}

// ============================================
// TYPE PRINCIPAL POUR LA SÉLECTION
// ============================================

/**
 * Représente la sélection de zones géographiques
 * Supporte à la fois la sélection unique et multiple
 */
export interface LocationSelection {
  // Sélection unique (pour la compatibilité avec l'ancien code)
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
  commune_id?: number;
  
  // Sélection multiple (pour le nouveau composant)
  paysId?: number;
  provinceIds?: number[];
  villeIds?: number[];
  communeIds?: number[];
}

// ============================================
// TYPE POUR LE COMPOSANT LOCATION SELECTOR
// ============================================

/**
 * Props pour le composant LocationSelector
 */
export interface LocationSelectorProps {
  value?: LocationSelection;
  onChange?: (selection: LocationSelection) => void;
  className?: string;
  disabled?: boolean;
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Convertit une sélection en chaîne de caractères pour stockage
 * Format: "pays:1|provinces:2,3,4|villes:5,6|communes:7,8,9"
 */
export function locationSelectionToString(selection: LocationSelection): string {
  if (!selection.paysId) return '';
  
  const parts = [`pays:${selection.paysId}`];
  
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
 * Parse une chaîne de caractères en sélection
 * Format: "pays:1|provinces:2,3,4|villes:5,6|communes:7,8,9"
 */
export function stringToLocationSelection(str: string): LocationSelection {
  if (!str) return {};
  
  try {
    const parts = str.split('|');
    const selection: LocationSelection = {};
    
    parts.forEach(part => {
      const [key, value] = part.split(':');
      if (!key || !value) return;
      
      switch (key) {
        case 'pays':
          selection.paysId = parseInt(value);
          selection.pays_id = parseInt(value);
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
 * Récupère les IDs sous forme de tableau pour un type donné
 */
export function getLocationIds(
  selection: LocationSelection, 
  type: 'provinces' | 'villes' | 'communes'
): number[] {
  switch (type) {
    case 'provinces':
      return selection.provinceIds || [];
    case 'villes':
      return selection.villeIds || [];
    case 'communes':
      return selection.communeIds || [];
    default:
      return [];
  }
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
