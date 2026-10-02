// src/app/dashboard/admin/users/types/user.types.ts
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
  ville_nom: string | null;
  derniere_connexion?: string | null;
  province_id?: number | null;
  ville_id?: number | null;
  commune_id?: number | null;
  pays_id?: number | null;
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
  ville_nom?: string;
  ville?: string;
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
  ville?: string;
  ville_nom?: string;
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
// SÉCURITÉ — RÈGLES MÉTIER
// ============================================
// ⚠️ RÈGLES APPLIQUÉES DANS TOUT LE SYSTÈME :
//   1. Le fondateur (omeongaandre2@gmail.com) est INTOUCHABLE
//      sauf par lui-même.
//   2. Un ADMIN ne peut PAS toucher un SUPER_ADMIN ni un autre ADMIN.
//   3. Personne ne peut se supprimer / désactiver soi-même.
//   4. Seul le fondateur peut attribuer le rôle SUPER_ADMIN.
// ============================================

/**
 * Email du compte fondateur — INTOUCHABLE sauf par lui-même
 */
export const FOUNDER_EMAIL = 'omeongaandre2@gmail.com';

/**
 * Rôles "protégés" qu'un ADMIN ne peut pas modifier
 */
export const PROTECTED_ROLES_FOR_ADMIN = ['SUPER_ADMIN', 'ADMIN'];

/**
 * Vérifie si un utilisateur est le fondateur
 */
export function isFounder(user: { email?: string } | null | undefined): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase().trim() === FOUNDER_EMAIL;
}

/**
 * Vérifie si l'utilisateur courant EST le fondateur
 */
export function isCurrentUserFounder(
  currentUser: { email?: string } | null | undefined
): boolean {
  return isFounder(currentUser);
}

/**
 * Vérifie si l'utilisateur courant est SUPER_ADMIN (fondateur ou non)
 */
export function isCurrentUserSuperAdmin(
  currentUser: { profil?: string } | null | undefined
): boolean {
  return String(currentUser?.profil || '').toUpperCase() === 'SUPER_ADMIN';
}

/**
 * Règles de sécurité pour les actions sur un utilisateur cible
 */
export function canPerformAction(
  action: 'edit' | 'delete' | 'toggle' | 'assign-super-admin',
  currentUser: { id_user?: number; id?: number; email?: string; profil?: string } | null | undefined,
  targetUser?: { id_user?: number; email?: string; profil?: string } | null
): { allowed: boolean; reason?: string } {
  if (!currentUser) {
    return { allowed: false, reason: 'Non authentifié' };
  }

  const currentProfil = String(currentUser.profil || '').toUpperCase();
  const currentIsFounder = isCurrentUserFounder(currentUser);
  const currentIsSuperAdmin = currentProfil === 'SUPER_ADMIN';

  const targetProfil = String(targetUser?.profil || '').toUpperCase();
  const targetIsFounder = targetUser ? isFounder(targetUser) : false;
  const targetIsSuperAdmin = targetProfil === 'SUPER_ADMIN';
  const targetIsAdmin = targetProfil === 'ADMIN';

  // 🔒 Règle 1 : Le fondateur est intouchable sauf par lui-même
  if (targetIsFounder && !currentIsFounder) {
    return {
      allowed: false,
      reason: 'Ce compte fondateur est protégé et ne peut pas être modifié.',
    };
  }

  // 🔒 Règle 2 : Un ADMIN ne peut PAS toucher un SUPER_ADMIN
  if (targetIsSuperAdmin && !currentIsSuperAdmin) {
    return {
      allowed: false,
      reason: 'Seul un SUPER_ADMIN peut modifier un SUPER_ADMIN.',
    };
  }

  // 🔒 Règle 3 : Un ADMIN ne peut PAS toucher un autre ADMIN
  //    (seul un SUPER_ADMIN peut modifier un ADMIN)
  if (targetIsAdmin && !currentIsSuperAdmin) {
    return {
      allowed: false,
      reason: 'Seul un SUPER_ADMIN peut modifier un autre ADMIN.',
    };
  }

  // 🔒 Règle 4 : On ne peut pas se désactiver / supprimer soi-même
  const currentId = currentUser.id_user ?? currentUser.id;
  const targetId = targetUser?.id_user;
  if (
    (action === 'delete' || action === 'toggle') &&
    targetUser &&
    currentId === targetId
  ) {
    return {
      allowed: false,
      reason: 'Vous ne pouvez pas effectuer cette action sur vous-même.',
    };
  }

  // 🔒 Règle 5 : Attribution SUPER_ADMIN réservée au fondateur
  if (action === 'assign-super-admin' && !currentIsFounder) {
    return {
      allowed: false,
      reason: 'Seul le fondateur peut attribuer le rôle SUPER_ADMIN.',
    };
  }

  return { allowed: true };
}

/**
 * Filtre les rôles qu'un utilisateur peut attribuer
 * - Fondateur / SUPER_ADMIN : tous les rôles
 * - ADMIN : tous SAUF SUPER_ADMIN
 */
export function getAllowedRoles<T extends { code: string }>(
  currentUser: { email?: string; profil?: string } | null | undefined,
  allRoles: T[]
): T[] {
  const currentProfil = String(currentUser?.profil || '').toUpperCase();
  const isSuperAdmin = currentProfil === 'SUPER_ADMIN';

  if (isSuperAdmin) {
    return allRoles; // SUPER_ADMIN peut tout attribuer (sauf SUPER_ADMIN si pas fondateur)
  }

  // ADMIN → ne peut attribuer que les rôles non-protégés
  return allRoles.filter((r) => !PROTECTED_ROLES_FOR_ADMIN.includes(r.code));
}

// ============================================
// ZONES
// ============================================

export interface LocationSelection {
  pays_id?: number;
  province_id?: number;
  ville_id?: number;
  commune_id?: number;
  paysId?: number;
  provinceIds?: number[];
  villeIds?: number[];
  communeIds?: number[];
}

export function locationSelectionToString(selection: LocationSelection): string {
  if (!selection.paysId && !selection.pays_id) return '';
  const paysId = selection.paysId || selection.pays_id;
  const parts = [`pays:${paysId}`];
  if (selection.provinceIds?.length) parts.push(`provinces:${selection.provinceIds.join(',')}`);
  if (selection.villeIds?.length) parts.push(`villes:${selection.villeIds.join(',')}`);
  if (selection.communeIds?.length) parts.push(`communes:${selection.communeIds.join(',')}`);
  return parts.join('|');
}

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
          selection.provinceIds = value.split(',').map(Number).filter(n => !isNaN(n));
          break;
        case 'villes':
          selection.villeIds = value.split(',').map(Number).filter(n => !isNaN(n));
          break;
        case 'communes':
          selection.communeIds = value.split(',').map(Number).filter(n => !isNaN(n));
          break;
      }
    });
    return selection;
  } catch {
    return {};
  }
}

export function isLocationSelectionEmpty(selection: LocationSelection): boolean {
  return !selection.paysId && !selection.pays_id;
}

export function getLocationSummary(selection: LocationSelection): string {
  const parts: string[] = [];
  if (selection.paysId || selection.pays_id) parts.push('Pays sélectionné');
  if (selection.provinceIds?.length) parts.push(`${selection.provinceIds.length} province(s)`);
  if (selection.villeIds?.length) parts.push(`${selection.villeIds.length} ville(s)`);
  if (selection.communeIds?.length) parts.push(`${selection.communeIds.length} commune(s)`);
  return parts.length > 0 ? parts.join(' • ') : 'Aucune zone sélectionnée';
}

export function extractLocationIds(selection: LocationSelection): {
  provinceIds: number[];
  villeIds: number[];
  communeIds: number[];
} {
  return {
    provinceIds: selection.provinceIds || [],
    villeIds: selection.villeIds || [],
    communeIds: selection.communeIds || [],
  };
}

export function createLocationSelectionFromPays(paysId: number): LocationSelection {
  return { paysId, pays_id: paysId, provinceIds: [], villeIds: [], communeIds: [] };
}

// ============================================
// RÔLES
// ============================================

export interface Role {
  id: number;
  code: string;
  libelle: string;
  niveauHierarchique: number;
  permissions?: any;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  DG: 'DG',
  PDG: 'PDG',
  CHEF_COMMERCIAL: 'CHEF_COMMERCIAL',
  SUPERVISEUR: 'SUPERVISEUR',
  COMPTABLE: 'COMPTABLE',
  COMMERCIAL: 'COMMERCIAL',
  CAISSIER: 'CAISSIER',
} as const;

export const ZONE_NIVEAUX = {
  NATIONAL: 'National',
  PROVINCIAL: 'Provincial',
  LOCAL: 'Local',
} as const;

export const SEXE = {
  HOMME: 'Homme',
  FEMME: 'Femme',
  AUTRE: 'Autre',
  NON_SPECIFIE: 'Non spécifié',
} as const;