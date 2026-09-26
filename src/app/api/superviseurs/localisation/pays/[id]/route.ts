// src/app/api/superviseurs/localisation/pays/[id]/route.ts
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

// GET - Détail d'un pays
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows]: any = await pool.query('SELECT * FROM pays WHERE id_pays = ?', [params.id]);
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Pays introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier un pays
export async function PUT(request: NextRequest, { params }: Params) {
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

    const [result]: any = await pool.query(
      `UPDATE pays SET nom = ?, code = ?, updated_at = NOW()
       WHERE id_pays = ?`,
      [nom.trim(), code.trim().toUpperCase(), params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Pays introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Pays modifié avec succès' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer un pays
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    const [deps]: any = await pool.query(
      'SELECT COUNT(*) as count FROM province WHERE pays_id = ?',
      [params.id]
    );
    if (deps[0].count > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible : ${deps[0].count} province(s) dépendent de ce pays` },
        { status: 409 }
      );
    }

    const [result]: any = await pool.query('DELETE FROM pays WHERE id_pays = ?', [params.id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Pays introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Pays supprimé avec succès' });
  } catch (error: any) {
    console.error('❌ DELETE pays:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}