// src/app/api/commercials/reservations-by-face/route.ts

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
  connectionLimit: 20,
  queueLimit: 0,
});

// ============================================
// GET : Réservations groupées par face
// ============================================
export async function GET(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeExpired = searchParams.get('include_expired') === 'true';
    const onlyActive = searchParams.get('only_active') === 'true';

    // ============================================
    // 🎯 LOGIQUE :
    //   - Par défaut : uniquement les réservations ACTIVES (campagne en cours)
    //   - On exclut les "Terminée" / "Expirée"
    //   - On inclut les "En attente" si elles ne sont pas expirées
    //   - On peut forcer l'inclusion des expirées avec ?include_expired=true
    // ============================================
    let whereClause = '';
    const params: any[] = [];

    if (onlyActive) {
      // Uniquement les campagnes en cours
      whereClause = `
        WHERE r.statut IN ('ACTIVE', 'Confirmée', 'En cours')
      `;
    } else if (includeExpired) {
      // Tout sauf les expirées/terminées
      whereClause = `
        WHERE r.statut NOT IN ('Terminée', 'Expirée')
      `;
    } else {
      // Par défaut : ce qui est visible sur la carte
      whereClause = `
        WHERE (
          r.statut IN ('ACTIVE', 'Confirmée', 'En cours')
          OR (
            r.statut = 'En attente'
            AND (r.date_expiration IS NULL OR r.date_expiration >= NOW())
          )
        )
      `;
    }

    connection = await pool.getConnection();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT 
         r.id_reservation,
         r.date_debut_campagne AS date_debut,
         r.date_fin_campagne AS date_fin,
         r.statut,
         r.photoCampagneUrl,
         r.photo_latitude,
         r.photo_longitude,
         r.validation_chef_commercial,
         r.validation_superviseur,
         lr.id_face,
         lr.statut_diffusion
       FROM reservation r
       INNER JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
       ${whereClause}
       ORDER BY r.date_debut_campagne ASC`,
      params
    );

    const reservations = rows.map((r) => ({
      id_reservation: Number(r.id_reservation),
      id_face: Number(r.id_face),
      date_debut: r.date_debut,
      date_fin: r.date_fin,
      statut: r.statut,
      statut_diffusion: r.statut_diffusion,
      photoCampagneUrl: r.photoCampagneUrl || null,
      photo_latitude: r.photo_latitude || null,
      photo_longitude: r.photo_longitude || null,
      validation_chef_commercial: r.validation_chef_commercial === 1,
      validation_superviseur: r.validation_superviseur === 1,
    }));

    return NextResponse.json({
      success: true,
      reservations,
      total: reservations.length,
    });
  } catch (error) {
    console.error('❌ Erreur API reservations-by-face:', error);
    return NextResponse.json(
      {
        success: false,
        reservations: [],
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}