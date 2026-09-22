// src/app/api/commercial/reservations/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

// POST: Valider une réservation
export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { id_reservation, id_chef_validation } = body;

    if (!id_reservation) {
      return NextResponse.json(
        { error: 'ID de réservation requis' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ Vérifier que la réservation existe et est en attente
    const [reservationCheck] = await connection.query(
      `SELECT id_reservation, statut FROM reservation WHERE id_reservation = ?`,
      [id_reservation]
    );

    if ((reservationCheck as any[]).length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    const reservation = (reservationCheck as any[])[0];
    if (reservation.statut !== 'En attente') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Seules les réservations en attente peuvent être validées' },
        { status: 400 }
      );
    }

    // ✅ Mettre à jour le statut de la réservation
    await connection.query(
      `UPDATE reservation SET statut = 'Validée', id_chef_validation = ? WHERE id_reservation = ?`,
      [id_chef_validation || null, id_reservation]
    );

    // ✅ Mettre à jour le statut des lignes
    await connection.query(
      `UPDATE ligne_reservation SET statut_diffusion = 'Validée' WHERE id_reservation = ?`,
      [id_reservation]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Réservation validée avec succès'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur validation réservation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation de la réservation' },
      { status: 500 }
    );
  }
}