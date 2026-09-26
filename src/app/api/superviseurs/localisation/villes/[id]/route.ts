// src/app/api/superviseurs/localisation/villes/[id]/route.ts
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

// GET - Détail d'une ville
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });

    const [rows]: any = await pool.query(
      `SELECT v.*, p.nom AS province_nom
       FROM ville v LEFT JOIN province p ON p.id_province = v.province_id
       WHERE v.id_ville = ?`,
      [params.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Ville introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Modifier une ville
export async function PUT(request: NextRequest, { params }: Params) {
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

    const [result]: any = await pool.query(
      `UPDATE ville SET nom = ?, code = ?, province_id = ?, updated_at = NOW()
       WHERE id_ville = ?`,
      [nom.trim(), code?.trim().toUpperCase() || null, province_id, params.id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Ville introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Ville modifiée' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer une ville
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
    if (!canEdit(user.profil)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier les communes
    const [depsCommune]: any = await pool.query(
      'SELECT COUNT(*) as count FROM commune WHERE ville_id = ?',
      [params.id]
    );
    if (depsCommune[0].count > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible : ${depsCommune[0].count} commune(s) dépendent de cette ville` },
        { status: 409 }
      );
    }

    // Vérifier les utilisateurs
    try {
      const [depsUser]: any = await pool.query(
        'SELECT COUNT(*) as count FROM `user` WHERE ville_id = ?',
        [params.id]
      );
      if (depsUser[0].count > 0) {
        return NextResponse.json(
          { success: false, error: `Impossible : ${depsUser[0].count} utilisateur(s) dépendent de cette ville` },
          { status: 409 }
        );
      }
    } catch (e) { /* Colonne peut ne pas exister */ }

    const [result]: any = await pool.query('DELETE FROM ville WHERE id_ville = ?', [params.id]);
    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Ville introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Ville supprimée' });
  } catch (error: any) {
    console.error('❌ DELETE ville:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}