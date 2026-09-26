// src/lib/permissions.ts

/**
 * Vérifie si un profil a les droits d'édition (créer/modifier/supprimer)
 * Accepte les profils en MAJUSCULES et minuscules
 */
export function canEdit(profil: string | undefined | null): boolean {
  if (!profil) return false;
  const allowed = ['SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN'];
  return allowed.includes(profil.toUpperCase());
}

/**
 * Vérifie si un profil peut voir les données
 */
export function canView(profil: string | undefined | null): boolean {
  if (!profil) return false;
  const allowed = ['SUPERVISEUR', 'ADMIN', 'SUPER_ADMIN', 'COMMERCIAL', 'COMPTABLE'];
  return allowed.includes(profil.toUpperCase());
}