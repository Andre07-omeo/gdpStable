// src/lib/notifications/triggers/onCampaignStarted.ts

import { query } from '@/lib/db';
import { notify } from '../notifier';

export async function checkCampaignsStarted() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    const lignes = await query<any>(
      `SELECT 
        lr.id_ligne,
        lr.id_reservation,
        lr.id_face,
        lr.date_debut,
        r.id_commercial,
        c.raison_sociale AS client_nom,
        f.orientation AS face_orientation,
        p.nom AS panneau_nom
      FROM ligne_reservation lr
      INNER JOIN reservation r ON r.id_reservation = lr.id_reservation
      LEFT JOIN client c ON c.id_client = r.id_client
      LEFT JOIN face f ON f.id_face = lr.id_face
      LEFT JOIN panneau p ON p.id_panneau = f.id_panneau
      WHERE lr.statut_diffusion = 'ACTIVE'
        AND lr.date_debut >= ?
        AND lr.date_debut < ?`,
      [today, tomorrow]
    );

    for (const ligne of lignes) {
      if (!ligne.id_commercial) continue;

      await notify({
        userId: ligne.id_commercial,
        type: 'campaign_started',
        title: '🚀 Campagne démarrée',
        message: `La campagne de ${ligne.client_nom || 'client'} sur "${ligne.panneau_nom || 'N/A'}" (face ${ligne.face_orientation || 'N/A'}) a commencé aujourd'hui. Vérifiez que le visuel est bien posé.`,
        lien: `/dashboard/commercial/reservations/${ligne.id_reservation}`,
        metadata: {
          id_reservation: ligne.id_reservation,
          societeLocatrice: ligne.client_nom,
          panneauNom: ligne.panneau_nom,
          faceOrientation: ligne.face_orientation,
          priorite: 'normal',
        },
      });
    }
  } catch (error) {
    console.error('❌ checkCampaignsStarted:', error);
  }
}