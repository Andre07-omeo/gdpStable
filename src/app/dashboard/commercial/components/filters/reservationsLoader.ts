// src/app/dashboard/commercial/components/filters/reservationsLoader.ts

export interface ReservationInfo {
  id_reservation: number;
  id_face: number;
  date_debut: string;
  date_fin: string;
  statut: string;
  photoCampagneUrl: string | null;
  hasPhoto: boolean;
}

export type ReservationsMap = Map<number, ReservationInfo[]>;
export const createEmptyReservationsMap = (): ReservationsMap => new Map();

export async function loadReservationsByFace(): Promise<ReservationsMap> {
  try {
    const response = await fetch('/api/commercials/reservations-by-face', {
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`Erreur ${response.status}`);

    const data = await response.json();
    const map: ReservationsMap = new Map();

    for (const r of data.reservations || []) {
      const faceId = Number(r.id_face);
      if (!faceId) continue;

      const hasPhoto =
        typeof r.photoCampagneUrl === 'string' &&
        r.photoCampagneUrl.trim() !== '';

      if (!map.has(faceId)) map.set(faceId, []);
      map.get(faceId)!.push({
        id_reservation: r.id_reservation,
        id_face: faceId,
        date_debut: r.date_debut,
        date_fin: r.date_fin,
        statut: r.statut,
        photoCampagneUrl: r.photoCampagneUrl || null,
        hasPhoto,
      });
    }

    return map;
  } catch (error) {
    console.error('❌ Erreur chargement réservations:', error);
    return new Map();
  }
}