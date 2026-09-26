// src/app/api/superviseurs/localisation/villes/route.ts
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

// GET - Liste des villes
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const provinceId = searchParams.get('province_id');
    const paysId = searchParams.get('pays_id');

    let sql = `
      SELECT v.*, p.nom AS province_nom, p.code AS province_code,
             pa.nom AS pays_nom, pa.code AS pays_code
      FROM ville v
      LEFT JOIN province p ON p.id_province = v.province_id
      LEFT JOIN pays pa ON pa.id_pays = p.pays_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (provinceId) {
      conditions.push('v.province_id = ?');
      params.push(provinceId);
    }
    if (paysId) {
      conditions.push('p.pays_id = ?');
      params.push(paysId);
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY v.nom ASC';

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('❌ GET villes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer une ville
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { nom, code, province_id } = await request.json();

    if (!nom?.trim() || !province_id) {
      return NextResponse.json({ success: false, error: 'Nom et province obligatoires' }, { status: 400 });
    }

    const [provExists]: any = await pool.query('SELECT id_province FROM province WHERE id_province = ?', [province_id]);
    if (provExists.length === 0) {
      return NextResponse.json({ success: false, error: 'Province introuvable' }, { status: 404 });
    }

    const [result]: any = await pool.query(
      `INSERT INTO ville (nom, code, province_id, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [nom.trim(), code?.trim().toUpperCase() || null, province_id]
    );

    return NextResponse.json(
      { success: true, data: { id_ville: result.insertId, nom: nom.trim(), code: code?.trim().toUpperCase() || null, province_id }, message: 'Ville créée' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}