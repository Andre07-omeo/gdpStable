// src/app/api/type-face/route.ts

import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function GET() {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id_type_face, libelle, hauteur_cm, largeur_cm, est_scroller FROM type_face ORDER BY libelle'
    );
    connection.release();
    return NextResponse.json(rows);
  } catch (error) {
    console.error('❌ Erreur GET /api/type-face:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des types de faces' },
      { status: 500 }
    );
  }
}