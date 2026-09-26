// src/app/api/superviseurs/localisation/provinces/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';

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

function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '')
    || request.cookies.get('auth_token')?.value
    || request.cookies.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// GET - Liste des provinces
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const paysId = searchParams.get('pays_id');

    let sql = `
      SELECT p.*, pa.nom AS pays_nom, pa.code AS pays_code
      FROM province p
      LEFT JOIN pays pa ON pa.id_pays = p.pays_id
    `;
    const params: any[] = [];

    if (paysId) {
      sql += ' WHERE p.pays_id = ?';
      params.push(paysId);
    }
    sql += ' ORDER BY p.nom ASC';

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('❌ GET provinces:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer une province
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { nom, code, pays_id } = await request.json();

    if (!nom?.trim() || !code?.trim() || !pays_id) {
      return NextResponse.json({ success: false, error: 'Nom, code et pays obligatoires' }, { status: 400 });
    }

    const [paysExists]: any = await pool.query('SELECT id_pays FROM pays WHERE id_pays = ?', [pays_id]);
    if (paysExists.length === 0) {
      return NextResponse.json({ success: false, error: 'Pays introuvable' }, { status: 404 });
    }

    const [dup]: any = await pool.query(
      'SELECT id_province FROM province WHERE LOWER(code) = LOWER(?)',
      [code.trim()]
    );
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }

    const [result]: any = await pool.query(
      `INSERT INTO province (nom, code, pays_id, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [nom.trim(), code.trim().toUpperCase(), pays_id]
    );

    return NextResponse.json(
      { success: true, data: { id_province: result.insertId, nom: nom.trim(), code: code.trim().toUpperCase(), pays_id }, message: 'Province créée' },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}