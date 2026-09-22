// src/app/api/reservations/clean/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

const CLEANUP_TOKEN = process.env.CLEANUP_API_TOKEN || 'mon-token-securise-123456';

// ✅ Pool avec les BONNES variables d'environnement (MYSQL_*)
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// ============================================
// POST : Effectuer le nettoyage
// ============================================
export async function POST(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;
  try {
    const token = request.headers.get('X-Cleanup-Token');
    if (token !== CLEANUP_TOKEN) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = Number(body.batch) || 50;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ 1. Réservations Confirmée / ACTIVE dont la campagne est terminée
    const [termineesResult] = await connection.execute(
      `UPDATE reservation 
       SET statut = 'Terminée', updated_at = NOW()
       WHERE statut IN ('Confirmée', 'ACTIVE', 'En cours')
         AND date_fin_campagne < CURDATE()`,
      []
    );

    // ✅ 2. Réservations En attente expirées
    const [expireesResult] = await connection.execute(
      `UPDATE reservation 
       SET statut = 'Expirée', updated_at = NOW()
       WHERE statut = 'En attente'
         AND date_expiration IS NOT NULL
         AND date_expiration < NOW()`,
      []
    );

    await connection.commit();

    const terminees = (termineesResult as any).affectedRows || 0;
    const expirees = (expireesResult as any).affectedRows || 0;

    return NextResponse.json({
      success: true,
      message: 'Nettoyage effectué',
      data: {
        terminees,
        expirees,
        erreurs: 0,
        traite_a: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('❌ Erreur nettoyage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// ============================================
// GET : Simulation (sans modification)
// ============================================
export async function GET(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;
  try {
    const token = request.headers.get('X-Cleanup-Token');
    if (token !== CLEANUP_TOKEN) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    connection = await pool.getConnection();

    // Réservations à terminer
    const [aTerminer] = await connection.query(
      `SELECT id_reservation, numero_commande, statut, date_fin_campagne
       FROM reservation
       WHERE statut IN ('Confirmée', 'ACTIVE', 'En cours')
         AND date_fin_campagne < CURDATE()`
    );

    // Réservations à expirer
    const [aExpirer] = await connection.query(
      `SELECT id_reservation, numero_commande, statut, date_expiration
       FROM reservation
       WHERE statut = 'En attente'
         AND date_expiration IS NOT NULL
         AND date_expiration < NOW()`
    );

    const details = [
      ...(aTerminer as any[]).map((r) => ({
        id: r.id_reservation,
        commande: r.numero_commande,
        motif: 'Campagne terminée',
      })),
      ...(aExpirer as any[]).map((r) => ({
        id: r.id_reservation,
        commande: r.numero_commande,
        motif: 'Délai expiré (En attente)',
      })),
    ];

    return NextResponse.json({
      simulation: true,
      total: details.length,
      details,
      regles: {
        terminee:
          "Statut 'Confirmée'/'ACTIVE' avec date_fin_campagne < aujourd'hui → 'Terminée'",
        expiree:
          "Statut 'En attente' avec date_expiration < maintenant → 'Expirée'",
      },
    });
  } catch (error) {
    console.error('❌ Erreur simulation:', error);
    return NextResponse.json(
      { error: 'Erreur simulation', details: error instanceof Error ? error.message : 'Erreur' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}