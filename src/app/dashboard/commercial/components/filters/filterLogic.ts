// src/app/dashboard/commercial/components/filters/filterLogic.ts

import { PanneauMap, FaceMap } from '../map/types';
import { PanneauFiltersState } from './types';
import { ReservationInfo, ReservationsMap } from './reservationsLoader';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const toDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

// ✅ Normalisation string ↔ number
function normalizeId(id: any): number {
  if (typeof id === 'number') return id;
  const parsed = parseInt(String(id), 10);
  return isNaN(parsed) ? 0 : parsed;
}

// ✅ Récupération robuste des résas d'une face
function getFaceReservations(faceId: any, map: ReservationsMap): ReservationInfo[] {
  const numId = normalizeId(faceId);
  if (map.has(numId)) return map.get(numId) || [];
  const strId = String(faceId);
  if (map.has(strId as any)) return map.get(strId as any) || [];
  return [];
}

// ============================================
// ✅ FACE : CATÉGORISATION STRICTE
// ============================================

export function isFaceEnPanne(face: FaceMap): boolean {
  return face.est_active === 0 && face.a_probleme === 1;
}

/**
 * ✅ OCCUPÉE = au moins une résa ACTIVE **avec photo**
 */
export function isFaceOccupee(face: FaceMap, map: ReservationsMap): boolean {
  return getFaceReservations(face.id_face, map).some((r) => r.hasPhoto === true);
}

/**
 * ✅ RÉSERVÉE = au moins une résa ACTIVE **sans photo**
 * (ne compte PAS les faces déjà occupées)
 */
export function isFaceReservee(face: FaceMap, map: ReservationsMap): boolean {
  const reservations = getFaceReservations(face.id_face, map);
  const aPhoto = reservations.some((r) => r.hasPhoto === true);
  const sansPhoto = reservations.some((r) => r.hasPhoto === false);
  // Si elle a une résa AVEC photo → elle est occupée, pas réservée
  return !aPhoto && sansPhoto;
}

/**
 * ✅ LIBRE = aucune résa + pas en panne
 */
export function isFaceLibre(face: FaceMap, map: ReservationsMap): boolean {
  if (isFaceEnPanne(face)) return false;
  return getFaceReservations(face.id_face, map).length === 0;
}

// ============================================
// ✅ PANNEAU : SITUATION
// ============================================

export function isPanneauTotalementOccupe(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  return faces.every((f) => isFaceOccupee(f, map));
}

export function isPanneauPartiellementOccupe(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  const nb = faces.filter((f) => isFaceOccupee(f, map)).length;
  return nb > 0 && nb < faces.length;
}

export function isPanneauTotalementReserve(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  return faces.every((f) => isFaceReservee(f, map));
}

export function isPanneauPartiellementReserve(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  const nb = faces.filter((f) => isFaceReservee(f, map)).length;
  return nb > 0 && nb < faces.length;
}

export function isPanneauTotalementLibre(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  return faces.every((f) => isFaceLibre(f, map));
}

export function isPanneauPartiellementLibre(p: PanneauMap, map: ReservationsMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  const nb = faces.filter((f) => isFaceLibre(f, map)).length;
  return nb > 0 && nb < faces.length;
}

export function isPanneauTotalementEnPanne(p: PanneauMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  return faces.every((f) => isFaceEnPanne(f));
}

export function isPanneauPartiellementEnPanne(p: PanneauMap): boolean {
  const faces = p.faces || [];
  if (faces.length === 0) return false;
  const nb = faces.filter((f) => isFaceEnPanne(f)).length;
  return nb > 0 && nb < faces.length;
}

// ============================================
// ✅ ÉCHÉANCE (3 cas)
// ============================================

/**
 * ✅ Vérifie si une face a une résa qui chevauche la période
 * - debut === null → "depuis le début"
 * - fin === null → "jusqu'à la fin"
 */
export function isFaceDansPeriode(
  face: FaceMap,
  map: ReservationsMap,
  debut: Date | null,
  fin: Date | null
): boolean {
  const reservations = getFaceReservations(face.id_face, map);

  return reservations.some((r) => {
    const rDebut = toDate(r.date_debut);
    const rFin = toDate(r.date_fin);
    if (!rDebut || !rFin) return false;

    // Cas 1 : début ET fin
    if (debut && fin) {
      return rDebut <= fin && rFin >= debut;
    }
    // Cas 2 : début seul → résas à partir de cette date
    if (debut && !fin) {
      return rFin >= debut;
    }
    // Cas 3 : fin seul → résas jusqu'à cette date
    if (!debut && fin) {
      return rDebut <= fin;
    }
    // Cas 4 : aucun → toutes les résas
    return true;
  });
}

export function isPanneauDansPeriode(
  p: PanneauMap,
  map: ReservationsMap,
  debut: Date | null,
  fin: Date | null
): boolean {
  const faces = p.faces || [];
  return faces.some((f) => isFaceDansPeriode(f, map, debut, fin));
}

// ============================================
// ✅ APPLIQUER LES FILTRES
// ============================================
export function applyFilters(
  panneau: PanneauMap,
  filters: PanneauFiltersState,
  map: ReservationsMap
): boolean {
  // 🔍 Recherche
  if (filters.search.trim() !== '') {
    const q = filters.search.toLowerCase().trim();
    if (!(panneau.nom || '').toLowerCase().includes(q)) return false;
  }

  // 📊 Situation du panneau
  switch (filters.situation) {
    case 'totalement_occupe':
      if (!isPanneauTotalementOccupe(panneau, map)) return false;
      break;
    case 'partiellement_occupe':
      if (!isPanneauPartiellementOccupe(panneau, map)) return false;
      break;
    case 'totalement_reserve':
      if (!isPanneauTotalementReserve(panneau, map)) return false;
      break;
    case 'partiellement_reserve':
      if (!isPanneauPartiellementReserve(panneau, map)) return false;
      break;
    case 'totalement_libre':
      if (!isPanneauTotalementLibre(panneau, map)) return false;
      break;
    case 'partiellement_libre':
      if (!isPanneauPartiellementLibre(panneau, map)) return false;
      break;
    case 'totalement_en_panne':
      if (!isPanneauTotalementEnPanne(panneau)) return false;
      break;
    case 'partiellement_en_panne':
      if (!isPanneauPartiellementEnPanne(panneau)) return false;
      break;
    default:
      break;
  }

  // 📅 Échéance
  if (filters.echeanceActive) {
    const debut = toDate(filters.echeanceDebut);
    const fin = toDate(filters.echeanceFin);

    // Si au moins une date est renseignée
    if (debut || fin) {
      if (!isPanneauDansPeriode(panneau, map, debut, fin)) return false;
    }
  }

  return true;
}

export function filterPanneaux(
  panneaux: PanneauMap[],
  filters: PanneauFiltersState,
  map: ReservationsMap
): PanneauMap[] {
  return panneaux.filter((p) => applyFilters(p, filters, map));
}