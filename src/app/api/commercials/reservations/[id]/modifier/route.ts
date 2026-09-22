// src/app/api/commercials/reservations/[id]/modifier/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

function getUserFromToken(request: NextRequest): {
  userId: number;
  profil: string;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;

    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
    };
  } catch {
    return null;
  }
}

// ============================================
// PUT : Modifier une réservation
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = getUserFromToken(request);
    if (!currentUser) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const id_reservation = parseInt(params.id);
    if (isNaN(id_reservation)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'ID réservation invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      id_client,
      date_debut_campagne,
      date_fin_campagne,
      prix_vente_net,
      notes,
    } = body;

    // ✅ 1. Récupérer la réservation
    const [resaRows] = await connection.query(
      `SELECT 
        r.*,
        lr.id_ligne,
        lr.id_face
      FROM reservation r
      INNER JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      WHERE r.id_reservation = ?`,
      [id_reservation]
    );

    if ((resaRows as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    const reservation = (resaRows as any[])[0];

    // ✅ 2. Vérifier que la réservation n'est pas verrouillée
    if (reservation.est_verrouille === 1 && reservation.statut === 'ACTIVE') {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Cette réservation est verrouillée et ne peut plus être modifiée' },
        { status: 403 }
      );
    }

    // ✅ 3. Vérifier les chevauchements si les dates changent
    if (date_debut_campagne && date_fin_campagne) {
      const [overlapCheck] = await connection.query(
        `SELECT id_ligne 
         FROM ligne_reservation 
         WHERE id_face = ? 
           AND id_reservation != ?
           AND statut_diffusion IN ('En attente', 'Validée', 'ACTIVE', 'Confirmée')
           AND (
             (date_debut <= ? AND date_fin >= ?) OR
             (date_debut <= ? AND date_fin >= ?) OR
             (date_debut >= ? AND date_fin <= ?)
           )`,
        [
          reservation.id_face,
          id_reservation,
          date_debut_campagne,
          date_debut_campagne,
          date_fin_campagne,
          date_fin_campagne,
          date_debut_campagne,
          date_fin_campagne,
        ]
      );

      if ((overlapCheck as any[]).length > 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Les nouvelles dates chevauchent une autre réservation' },
          { status: 409 }
        );
      }
    }

    // ✅ 4. Préparer les mises à jour
    const updates: string[] = [];
    const values: any[] = [];

    if (id_client !== undefined) {
      updates.push('id_client = ?');
      values.push(id_client);
    }
    if (date_debut_campagne) {
      updates.push('date_debut_campagne = ?');
      values.push(date_debut_campagne);
    }
    if (date_fin_campagne) {
      updates.push('date_fin_campagne = ?');
      values.push(date_fin_campagne);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    updates.push('updated_at = NOW()');
    values.push(id_reservation);

    // ✅ 5. Mettre à jour la réservation
    await connection.query(
      `UPDATE reservation SET ${updates.join(', ')} WHERE id_reservation = ?`,
      values
    );

    // ✅ 6. Mettre à jour la ligne de réservation
    const ligneUpdates: string[] = [];
    const ligneValues: any[] = [];

    if (date_debut_campagne) {
      ligneUpdates.push('date_debut = ?');
      ligneValues.push(date_debut_campagne);
    }
    if (date_fin_campagne) {
      ligneUpdates.push('date_fin = ?');
      ligneValues.push(date_fin_campagne);
    }
    if (prix_vente_net !== undefined) {
      ligneUpdates.push('prix_vente_net = ?');
      ligneValues.push(prix_vente_net);
    }

    if (ligneUpdates.length > 0) {
      ligneUpdates.push('updated_at = NOW()');
      ligneValues.push(reservation.id_ligne);

      await connection.query(
        `UPDATE ligne_reservation SET ${ligneUpdates.join(', ')} WHERE id_ligne = ?`,
        ligneValues
      );
    }

    // ✅ 7. Mettre à jour la facture si elle existe
    if (date_debut_campagne || date_fin_campagne || prix_vente_net !== undefined) {
      const factureUpdates: string[] = [];
      const factureValues: any[] = [];

      if (date_debut_campagne) {
        factureUpdates.push('date_debut = ?');
        factureValues.push(date_debut_campagne);
      }
      if (date_fin_campagne) {
        factureUpdates.push('date_fin = ?');
        factureValues.push(date_fin_campagne);
      }
      if (prix_vente_net !== undefined) {
        factureUpdates.push('prix_unitaire = ?');
        factureUpdates.push('total_ligne = ?');
        factureValues.push(prix_vente_net);
        factureValues.push(prix_vente_net);
      }

      if (factureUpdates.length > 0) {
        factureValues.push(id_reservation);
        await connection.query(
          `UPDATE facture_ligne SET ${factureUpdates.join(', ')} WHERE id_reservation = ?`,
          factureValues
        );
      }
    }

    await connection.commit();
    connection.release();

    console.log(`✅ Réservation ${id_reservation} modifiée`);

    return NextResponse.json({
      success: true,
      message: 'Réservation modifiée avec succès',
      data: { id_reservation },
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur PUT modifier:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}