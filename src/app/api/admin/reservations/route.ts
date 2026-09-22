// src/app/api/admin/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // ✅ Récupérer toutes les réservations avec les infos en utilisant mysql2
    const reservations = await query(`
      SELECT 
        lr.id_ligne,
        lr.id_face,
        lr.date_debut,
        lr.date_fin,
        lr.prix_vente_net,
        lr.statut_diffusion,
        lr.created_at,
        f.id_panneau,
        p.nom as panneau_nom,
        f.orientation as face_orientation,
        r.id_reservation,
        r.statut as reservation_statut,
        r.est_verrouille,
        r.photoCampagneUrl,
        c.raison_sociale as client_nom
      FROM ligne_reservation lr
      LEFT JOIN face f ON lr.id_face = f.id_face
      LEFT JOIN panneau p ON f.id_panneau = p.id_panneau
      LEFT JOIN reservation r ON lr.id_reservation = r.id_reservation
      LEFT JOIN client c ON r.id_client = c.id_client
      ORDER BY lr.created_at DESC
      LIMIT 50
    `);

    const formatted = (reservations as any[]).map((r: any) => ({
      id: r.id_ligne?.toString() || 'N/A',
      societeLocatrice: r.client_nom || 'N/A',
      panneau: r.panneau_nom || 'N/A',
      panneauId: r.id_panneau?.toString() || 'N/A',
      faceId: r.id_face?.toString() || 'N/A',
      faceOrientation: r.face_orientation || 'N/A',
      dateDebut: r.date_debut,
      dateFin: r.date_fin,
      prix: r.prix_vente_net || 0,
      statut: r.statut_diffusion || 'A venir',
      statutPaiement: r.reservation_statut || 'En attente',
      validationComptable: r.est_verrouille === 1,
      photoCampagneUrl: r.photoCampagneUrl || null,
      createdAt: r.created_at
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('❌ Erreur GET /api/admin/reservations:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des réservations' },
      { status: 500 }
    );
  }
}