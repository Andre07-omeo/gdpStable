// src/app/api/reservations/status/route.ts

import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    const [total] = await connection.query('SELECT COUNT(*) as count FROM reservation');
    const [enAttente] = await connection.query('SELECT COUNT(*) as count FROM reservation WHERE statut = ?', ['En attente']);
    const [confirmees] = await connection.query('SELECT COUNT(*) as count FROM reservation WHERE statut = ?', ['Confirmée']);
    const [terminees] = await connection.query('SELECT COUNT(*) as count FROM reservation WHERE statut = ?', ['Terminée']);
    const [expirees] = await connection.query('SELECT COUNT(*) as count FROM reservation WHERE statut = ?', ['Expirée']);
    const [historique] = await connection.query('SELECT COUNT(*) as count FROM historique_reservation');

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        total: (total as any[])[0].count,
        en_attente: (enAttente as any[])[0].count,
        confirmees: (confirmees as any[])[0].count,
        terminees: (terminees as any[])[0].count,
        expirees: (expirees as any[])[0].count,
        historique: (historique as any[])[0].count,
        date: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Erreur' },
      { status: 500 }
    );
  }
}