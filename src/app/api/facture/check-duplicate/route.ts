// src/app/api/facture/check-duplicate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ============================================
// GET : Vérifier doublons + conflits de faces
// ============================================
export async function GET(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const reservations = searchParams.get('reservations');
    const dateDebut = searchParams.get('date_debut');
    const dateFin = searchParams.get('date_fin');

    if (!reservations) {
      return NextResponse.json({
        isDuplicate: false,
        hasConflict: false,
        message: 'Aucune réservation spécifiée',
      });
    }

    const reservationIds = reservations
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (reservationIds.length === 0) {
      return NextResponse.json({
        isDuplicate: false,
        hasConflict: false,
        message: 'Aucune réservation valide',
      });
    }

    connection = await pool.getConnection();
    const placeholders = reservationIds.map(() => '?').join(',');

    // ============================================
    // ✅ 1. Vérifier les DOUBLONS de factures
    // ============================================
    const [facturesRows] = await connection.query<RowDataPacket[]>(
      `SELECT DISTINCT f.id_facture, f.numero_facture, f.statut, f.created_at
       FROM facture f
       JOIN facture_ligne fl ON f.id_facture = fl.id_facture
       WHERE fl.id_reservation IN (${placeholders})
       AND f.statut NOT IN ('ANNULEE', 'BROUILLON')`,
      reservationIds
    );

    // ============================================
    // ✅ 2. Vérifier les CONFLITS de faces (Option B)
    //     Conflit si une AUTRE réservation ACTIVE a son date_debut
    //     qui tombe DANS la période de la nouvelle
    // ============================================
    let conflits: any[] = [];

    if (dateDebut && dateFin) {
      // ✅ Étape 1 : récupérer les faces + dates des réservations demandées
      const [resaFaces] = await connection.query<RowDataPacket[]>(
        `SELECT 
           lr.id_reservation,
           lr.id_face,
           lr.date_debut,
           lr.date_fin
         FROM ligne_reservation lr
         WHERE lr.id_reservation IN (${placeholders})`,
        reservationIds
      );

      // ✅ Étape 2 : pour chaque face, chercher un conflit
      for (const rf of resaFaces) {
        const [conflitRows] = await connection.query<RowDataPacket[]>(
          `SELECT 
             lr2.id_face,
             r2.id_reservation,
             r2.numero_commande,
             r2.date_debut_campagne,
             r2.date_fin_campagne,
             r2.statut
           FROM ligne_reservation lr2
           JOIN reservation r2 ON r2.id_reservation = lr2.id_reservation
           WHERE lr2.id_face = ?
             AND r2.id_reservation NOT IN (${placeholders})
             AND r2.statut IN ('ACTIVE', 'Confirmée', 'En cours')
             AND ? >= lr2.date_debut
             AND ? <  lr2.date_fin`,
          [rf.id_face, ...reservationIds, dateDebut, dateDebut]
        );

        if (conflitRows.length > 0) {
          conflits.push({
            id_face: rf.id_face,
            id_reservation_demande: rf.id_reservation,
            conflits: conflitRows,
          });
        }
      }
    }

    const isDuplicate = facturesRows.length > 0;
    const hasConflict = conflits.length > 0;

    // Réponse prioritaire : doublon
    if (isDuplicate) {
      const facture = facturesRows[0];
      return NextResponse.json({
        isDuplicate: true,
        hasConflict,
        message: `Une facture existe déjà (N°: ${facture.numero_facture}, Statut: ${facture.statut}, Date: ${new Date(facture.created_at).toLocaleDateString('fr-FR')})`,
        facture,
        conflits,
      });
    }

    // Réponse : conflit
    if (hasConflict) {
      const detailsConflits = conflits
        .map((c) => `Face ${c.id_face} (${c.conflits.length} conflit)`)
        .join(', ');
      return NextResponse.json({
        isDuplicate: false,
        hasConflict: true,
        message: `❌ Conflit(s) de disponibilité détecté(s) : ${detailsConflits}`,
        conflits,
      });
    }

    // Tout est OK
    return NextResponse.json({
      isDuplicate: false,
      hasConflict: false,
      message: '✅ Aucune facture existante et aucune conflit de disponibilité',
    });
  } catch (error) {
    console.error('Erreur vérification doublon/conflit:', error);
    return NextResponse.json(
      {
        isDuplicate: false,
        hasConflict: false,
        message: 'Erreur lors de la vérification',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}