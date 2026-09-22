// src/app/api/locations/route.ts
import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const parentId = searchParams.get('parentId');

    const connection = await pool.getConnection();
    let query = '';
    let params: any[] = [];

    switch (type) {
      case 'pays':
        query = 'SELECT id_pays as id, code, nom FROM pays ORDER BY nom';
        break;
      case 'provinces':
        query = 'SELECT id_province as id, code, nom, pays_id FROM province WHERE pays_id = ? ORDER BY nom';
        params = [parentId];
        break;
      case 'villes':
        query = 'SELECT id_ville as id, code, nom, province_id FROM ville WHERE province_id = ? ORDER BY nom';
        params = [parentId];
        break;
      case 'communes':
        query = 'SELECT id_commune as id, code, nom, ville_id FROM commune WHERE ville_id = ? ORDER BY nom';
        params = [parentId];
        break;
      default:
        connection.release();
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }

    const [rows] = await connection.query(query, params);
    connection.release();

    // ✅ Retourner avec la structure { success: true, data: rows }
    return NextResponse.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('❌ Erreur localisation:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des données' },
      { status: 500 }
    );
  }
}