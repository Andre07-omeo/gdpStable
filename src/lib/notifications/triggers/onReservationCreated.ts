import { notify } from '../notifier';

interface Params {
  id_reservation: number;
  id_commercial: number;
  commercialNom: string;
  clientNom: string;
  panneauNom: string;
  faceOrientation: string;
  nombreMois: number;
  numeroCommande: string;
}

export async function onReservationCreated(p: Params) {
  await notify({
    userId: p.id_commercial,
    type: 'reservation_created',
    title: '🎯 Nouvelle réservation créée',
    message: `${p.commercialNom} vient de réserver la face ${p.faceOrientation} du panneau "${p.panneauNom}" pour le client ${p.clientNom} (${p.nombreMois} mois).`,
    lien: `/dashboard/commercial/reservations/${p.id_reservation}`,
    metadata: {
      id_reservation: p.id_reservation,
      societeLocatrice: p.clientNom,
      panneauNom: p.panneauNom,
      faceOrientation: p.faceOrientation,
      nombreMois: p.nombreMois,
      commercialNom: p.commercialNom,
      priorite: 'high',
    },
  });
}