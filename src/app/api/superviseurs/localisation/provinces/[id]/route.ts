// src/app/api/superviseurs/localisation/provinces/[id]/route.ts
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

type Params = { params: { id: string } };

// GET - Détail d'une province
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows]: any = await pool.query(
      `SELECT p.*, pa.nom AS pays_nom
       FROM province p LEFT JOIN pays pa ON pa.id_pays = p.pays_id
       WHERE p.id_province = ?`,
      [params.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Province introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier une province
export async function PUT(request: NextRequest, { params }: Params) {
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

    const [result]: any = await pool.query(
      `UPDATE province SET nom = ?, code = ?, pays_id = ?, updated_at = NOW()
       WHERE id_province = ?`,
      [nom.trim(), code.trim().toUpperCase(), pays_id, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Province introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Province modifiée' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une province
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const [depsD]: any = await pool.query('SELECT COUNT(*) as count FROM districts WHERE province_id = ?', [params.id]);
    const [depsV]: any = await pool.query('SELECT COUNT(*) as count FROM ville WHERE province_id = ?', [params.id]);
    const total = depsD[0].count + depsV[0].count;

    if (total > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible : ${depsD[0].count} district(s) + ${depsV[0].count} ville(s) dépendent` },
        { status: 409 }
      );
    }

    const [result]: any = await pool.query('DELETE FROM province WHERE id_province = ?', [params.id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Province introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Province supprimée' });
  } catch (error: any) {
    console.error('❌ DELETE province:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}