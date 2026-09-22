// src/app/dashboard/commercial/components/map/markerLogic.ts

import { PanneauMap, FaceMap, MarkerColor } from './types';

/**
 * Vérifie si une face est occupée (réservation en cours)
 * Échéance = aujourd'hui >= date_debut && aujourd'hui <= date_fin
 */
export function isFaceOccupee(face: FaceMap): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Vérifier via réservations
  if (face.reservations && face.reservations.length > 0) {
    return face.reservations.some((r) => {
      const debut = new Date(r.date_debut);
      const fin = new Date(r.date_fin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(0, 0, 0, 0);
      return today >= debut && today <= fin;
    });
  }

  // Fallback sur date_debut/date_fin
  if (face.date_debut && face.date_fin) {
    const debut = new Date(face.date_debut);
    const fin = new Date(face.date_fin);
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    return today >= debut && today <= fin;
  }

  return false;
}

/**
 * Vérifie si une face a une image de campagne
 */
export function hasCampagneImage(face: FaceMap): boolean {
  if (face.reservations && face.reservations.length > 0) {
    return face.reservations.some(
      (r) => r.photoCampagneUrl && r.photoCampagneUrl.trim() !== ''
    );
  }
  return false;
}

/**
 * Vérifie si une face a un problème
 * Règles : est_active === 0 && a_probleme === 1 && date_probleme existe && raison_probleme existe
 */
export function isFaceEnProbleme(face: FaceMap): boolean {
  return (
    face.est_active === 0 &&
    face.a_probleme === 1 &&
    !!face.date_probleme &&
    !!face.raison_probleme
  );
}

/**
 * Vérifie si un panneau a un problème
 * Règles : date_probleme existe && raison_probleme existe
 */
export function isPanneauEnProbleme(panneau: PanneauMap): boolean {
  return (
    panneau.etat === 'EnMaintenance' ||
    panneau.etat === 'En panne' ||
    (!!panneau.date_probleme && !!panneau.raison_probleme)
  );
}

/**
 * Détermine la couleur du marqueur selon les règles métier
 */
export function getMarkerColorAndStatus(panneau: PanneauMap): {
  color: MarkerColor;
  label: string;
  clickable: boolean;
} {
  // 🔴 RÈGLE 1 : Panneau en panne → rouge, non cliquable
  if (isPanneauEnProbleme(panneau)) {
    return { color: 'red', label: '⚠', clickable: false };
  }

  const faces = panneau.faces || [];

  // ⚫ RÈGLE 2 : Aucune face → gris
  if (faces.length === 0) {
    return { color: 'gray', label: '○', clickable: true };
  }

  // Filtrer les faces "actives" (non en problème)
  const facesActives = faces.filter((f) => !isFaceEnProbleme(f));

  // 🟡🟦 RÈGLE 3 : Toutes les faces actives sont occupées
  const toutesOccupees =
    facesActives.length > 0 && facesActives.every((f) => isFaceOccupee(f));

  if (toutesOccupees) {
    const toutesAvecImage = facesActives.every((f) => hasCampagneImage(f));
    if (toutesAvecImage) {
      return { color: 'blue', label: '●', clickable: true };
    }
    return { color: 'yellow', label: '●', clickable: true };
  }

  // 🟢 RÈGLE 4 : Au moins une face libre
  return { color: 'green', label: '○', clickable: true };
}

/**
 * Palette des couleurs
 */
export const MARKER_COLORS: Record<MarkerColor, { main: string; dark: string; glow: string }> = {
  red:    { main: '#EF4444', dark: '#B91C1C', glow: 'rgba(239,68,68,0.4)' },
  yellow: { main: '#F59E0B', dark: '#B45309', glow: 'rgba(245,158,11,0.4)' },
  blue:   { main: '#3B82F6', dark: '#1D4ED8', glow: 'rgba(59,130,246,0.4)' },
  green:  { main: '#10B981', dark: '#047857', glow: 'rgba(16,185,129,0.4)' },
  gray:   { main: '#6B7280', dark: '#374151', glow: 'rgba(107,114,128,0.4)' },
};