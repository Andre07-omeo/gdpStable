import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const {
    id_panneau,
    face_ids,
    date_debut,
    date_fin,
    notes,
    id_commercial,
    id_client,
    new_client,
  } = body;

  // ============================================
  // ✅ VALIDATIONS
  // ============================================
  if (!id_panneau) {
    return NextResponse.json({ error: 'id_panneau requis' }, { status: 400 });
  }
  if (!face_ids || !Array.isArray(face_ids) || face_ids.length === 0) {
    return NextResponse.json({ error: 'Au moins une face requise' }, { status: 400 });
  }
  if (!date_debut || !date_fin) {
    return NextResponse.json({ error: 'Dates requises' }, { status: 400 });
  }
  if (!id_client && !new_client) {
    return NextResponse.json({ error: 'Client requis' }, { status: 400 });
  }
  if (!id_commercial) {
    return NextResponse.json(
      { error: "Impossible d'identifier l'utilisateur connecté" },
      { status: 400 }
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ============================================
    // 1️⃣ CLIENT (créé une seule fois si nouveau)
    // ============================================
    let clientId = id_client;

    if (!clientId && new_client) {
      const [clientResult]: any = await connection.query(
        `INSERT INTO client (
          raison_sociale, siret, adresse, code_postal, ville,
          telephone, email_facturation, created_at, updated_at, province
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)`,
        [
          new_client.raison_sociale,
          new_client.siret || `SIRET-${Date.now()}`,
          new_client.adresse || 'Adresse non renseignée',
          '0000',
          new_client.ville || 'Ville non renseignée',
          new_client.telephone || null,
          new_client.email_facturation || 'email@exemple.com',
          'Province non renseignée',
        ]
      );
      clientId = clientResult.insertId;
    }

    // ============================================
    // 2️⃣ NUMÉRO DE COMMANDE DE DÉPART
    // ============================================
    const [lastCmd]: any = await connection.query(
      `SELECT numero_commande FROM reservation 
       WHERE numero_commande LIKE 'CMD-%' 
       ORDER BY id_reservation DESC LIMIT 1`
    );
    let nextNum = 1;
    if (lastCmd.length > 0) {
      const match = lastCmd[0].numero_commande.match(/CMD-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    // ============================================
    // 3️⃣ BOUCLE : 1 face = 1 réservation
    // ============================================
    const dateExpiration = new Date();
    dateExpiration.setDate(dateExpiration.getDate() + 5);

    const createdReservations: Array<{
      id_reservation: number;
      numero_commande: string;
      id_face: number;
    }> = [];

    for (const faceId of face_ids) {
      const numeroCommande = `CMD-${String(nextNum).padStart(4, '0')}`;
      nextNum++;

      // ---- CRÉER LA RÉSERVATION ----
      // ✅ date_verrouillage = NOW()  (date du jour)
      // ✅ created_at = NOW()          (date du jour)
      // ✅ updated_at = NOW()          (date du jour)
      const [reservationResult]: any = await connection.query(
        `INSERT INTO reservation (
          id_client, id_commercial,
          id_chef_validation, id_chef_commercial, id_superviseur,
          validation_chef_commercial, validation_superviseur,
          date_validation_chef, date_validation_superviseur,
          numero_commande, date_creation,
          date_debut_campagne, date_fin_campagne,
          statut, est_verrouille, date_verrouillage,
          notes, date_expiration,
          created_at, updated_at
        ) VALUES (
          ?, ?,
          ?, ?, ?,
          0, 0,
          NULL, NULL,
          ?, NOW(),
          ?, ?,
          'ACTIVE', 1, NOW(),
          ?, ?,
          NOW(), NOW()
        )`,
        [
          clientId,
          id_commercial,
          id_commercial,
          id_commercial,
          id_commercial,
          numeroCommande,
          date_debut,
          date_fin,
          notes || null,
          dateExpiration,
        ]
      );

      const idReservation = reservationResult.insertId;

      // ---- LIGNE DE RÉSERVATION (1 ligne, cette face uniquement) ----
      await connection.query(
        `INSERT INTO ligne_reservation (
          id_reservation, id_face, date_debut, date_fin,
          prix_vente_net, statut_diffusion, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, 'ACTIVE', NOW(), NOW())`,
        [idReservation, faceId, date_debut, date_fin]
      );

      createdReservations.push({
        id_reservation: idReservation,
        numero_commande: numeroCommande,
        id_face: faceId,
      });
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      total: createdReservations.length,
      reservations: createdReservations,
      id_client: clientId,
      id_commercial,
    });

  } catch (error: any) {
    await connection.rollback();
    console.error('❌ Erreur import réservations:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}