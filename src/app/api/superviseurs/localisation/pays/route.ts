// src/app/api/superviseurs/localisation/pays/route.ts
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

// GET - Liste des pays
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows] = await pool.query('SELECT * FROM pays ORDER BY nom ASC');
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('❌ GET pays:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer un pays
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { nom, code } = await request.json();

    if (!nom?.trim() || !code?.trim()) {
      return NextResponse.json({ success: false, error: 'Nom et code obligatoires' }, { status: 400 });
    }

    const [dup]: any = await pool.query(
      'SELECT id_pays FROM pays WHERE LOWER(nom) = LOWER(?) OR LOWER(code) = LOWER(?)',
      [nom.trim(), code.trim()]
    );
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: 'Ce pays ou code existe déjà' }, { status: 409 });
    }

    const [result]: any = await pool.query(
      `INSERT INTO pays (nom, code, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
      [nom.trim(), code.trim().toUpperCase()]
    );

    return NextResponse.json(
      { success: true, data: { id_pays: result.insertId, nom: nom.trim(), code: code.trim().toUpperCase() }, message: 'Pays créé avec succès' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ POST pays:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}