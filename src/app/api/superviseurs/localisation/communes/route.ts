// src/app/api/superviseurs/localisation/communes/route.ts
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

// GET - Liste des communes
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const villeId = searchParams.get('ville_id');
    const districtId = searchParams.get('district_id');
    const provinceId = searchParams.get('province_id');

    let sql = `
      SELECT c.*,
             v.nom AS ville_nom,
             d.nom AS district_nom, d.code AS district_code,
             p.nom AS province_nom
      FROM commune c
      LEFT JOIN ville v ON v.id_ville = c.ville_id
      LEFT JOIN districts d ON d.id_district = c.district_id
      LEFT JOIN province p ON p.id_province = v.province_id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (villeId) {
      conditions.push('c.ville_id = ?');
      params.push(villeId);
    }
    if (districtId) {
      conditions.push('c.district_id = ?');
      params.push(districtId);
    }
    if (provinceId) {
      conditions.push('v.province_id = ?');
      params.push(provinceId);
    }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY c.nom ASC';

    const [rows] = await pool.query(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('❌ GET communes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Créer une commune
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { nom, code, ville_id, district_id } = await request.json();

    if (!nom?.trim() || !code?.trim() || !ville_id) {
      return NextResponse.json({ success: false, error: 'Nom, code et ville obligatoires' }, { status: 400 });
    }

    const [villeExists]: any = await pool.query('SELECT id_ville FROM ville WHERE id_ville = ?', [ville_id]);
    if (villeExists.length === 0) {
      return NextResponse.json({ success: false, error: 'Ville introuvable' }, { status: 404 });
    }

    if (district_id) {
      const [dExists]: any = await pool.query('SELECT id_district FROM districts WHERE id_district = ?', [district_id]);
      if (dExists.length === 0) {
        return NextResponse.json({ success: false, error: 'District introuvable' }, { status: 404 });
      }
    }

    const [dup]: any = await pool.query('SELECT id_commune FROM commune WHERE LOWER(code) = LOWER(?)', [code.trim()]);
    if (dup.length > 0) {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }

    const [result]: any = await pool.query(
      `INSERT INTO commune (nom, code, ville_id, district_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [nom.trim(), code.trim().toUpperCase(), ville_id, district_id || null]
    );

    return NextResponse.json(
      { success: true, data: { id_commune: result.insertId, nom: nom.trim(), code: code.trim().toUpperCase(), ville_id, district_id: district_id || null }, message: 'Commune créée' },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}