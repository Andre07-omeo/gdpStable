// src/app/api/superviseurs/localisation/communes/[id]/route.ts
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

// GET - Détail d'une commune
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows]: any = await pool.query(
      `SELECT c.*, v.nom AS ville_nom, d.nom AS district_nom
       FROM commune c
       LEFT JOIN ville v ON v.id_ville = c.ville_id
       LEFT JOIN districts d ON d.id_district = c.district_id
       WHERE c.id_commune = ?`,
      [params.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Commune introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier une commune
export async function PUT(request: NextRequest, { params }: Params) {
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

    const [result]: any = await pool.query(
      `UPDATE commune SET nom = ?, code = ?, ville_id = ?, district_id = ?, updated_at = NOW()
       WHERE id_commune = ?`,
      [nom.trim(), code.trim().toUpperCase(), ville_id, district_id || null, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Commune introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Commune modifiée' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ success: false, error: 'Ce code existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une commune
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier les utilisateurs
    const [depsUser]: any = await pool.query(
      'SELECT COUNT(*) as count FROM `user` WHERE commune_id = ?',
      [params.id]
    );
    if (depsUser[0].count > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible : ${depsUser[0].count} utilisateur(s) dépendent de cette commune` },
        { status: 409 }
      );
    }

    // Vérifier les panneaux (si la colonne existe)
    try {
      const [depsPanneau]: any = await pool.query(
        'SELECT COUNT(*) as count FROM panneau WHERE commune_id = ?',
        [params.id]
      );
      if (depsPanneau[0].count > 0) {
        return NextResponse.json(
          { success: false, error: `Impossible : ${depsPanneau[0].count} panneau(x) dépendent de cette commune` },
          { status: 409 }
        );
      }
    } catch (e) { /* Colonne peut ne pas exister */ }

    const [result]: any = await pool.query('DELETE FROM commune WHERE id_commune = ?', [params.id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Commune introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Commune supprimée' });
  } catch (error: any) {
    console.error('❌ DELETE commune:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}