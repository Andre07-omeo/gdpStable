// src/app/api/superviseurs/localisation/districts/[id]/route.ts
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

// GET - Détail d'un district
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows]: any = await pool.query(
      `SELECT d.*, p.nom AS province_nom
       FROM districts d LEFT JOIN province p ON p.id_province = d.province_id
       WHERE d.id_district = ?`,
      [params.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'District introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier un district
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const { nom, code, province_id } = await request.json();
    if (!nom?.trim() || !code?.trim() || !province_id) {
      return NextResponse.json({ success: false, error: 'Nom, code et province obligatoires' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      `UPDATE districts SET nom = ?, code = ?, province_id = ?, updated_at = NOW()
       WHERE id_district = ?`,
      [nom.trim(), code.trim().toUpperCase(), province_id, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'District introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'District modifié' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer un district
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const [deps]: any = await pool.query('SELECT COUNT(*) as count FROM commune WHERE district_id = ?', [params.id]);
    if (deps[0].count > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible : ${deps[0].count} commune(s) dépendent de ce district` },
        { status: 409 }
      );
    }

    const [result]: any = await pool.query('DELETE FROM districts WHERE id_district = ?', [params.id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'District introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'District supprimé' });
  } catch (error: any) {
    console.error('❌ DELETE district:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}