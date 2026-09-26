// src/app/api/superviseurs/affichages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ─────────────────────────────────────────────
// Helper : extraire l'utilisateur depuis le token
// ─────────────────────────────────────────────
function getUserIdFromRequest(request: NextRequest): number | null {
  try {
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '') || null;

    if (!token) {
      const cookie = request.headers.get('cookie') || '';
      const match = cookie.match(/auth_token=([^;]+)/);
      if (match) token = match[1];
    }
    if (!token) return null;

    const payload: any = jwt.verify(token, JWT_SECRET);
    return (
      payload?.id ||
      payload?.userId ||
      payload?.id_user ||
      payload?.id_utilisateur ||
      null
    );
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const connection = await pool.getConnection();

    const sql =
      'SELECT ' +
      'r.id_reservation, r.id_client, r.id_commercial, r.id_chef_validation, ' +
      'r.id_chef_commercial, r.id_superviseur, ' +
      'r.validation_chef_commercial, r.validation_superviseur, ' +
      'r.date_validation_chef, r.date_validation_superviseur, ' +
      'r.numero_commande, r.date_creation, ' +
      'r.date_debut_campagne, r.date_fin_campagne, ' +
      'r.statut, r.est_verrouille, r.date_verrouillage, r.notes, ' +
      'r.created_at, r.updated_at, r.date_expiration, ' +
      'r.photoCampagneUrl, r.photo_metadata, r.photo_latitude, ' +
      'r.photo_longitude, r.date_upload_photo, ' +
      'c.raison_sociale AS client_raison_sociale, ' +
      'c.email_facturation AS client_email, ' +
      'c.telephone AS client_telephone, ' +
      'com.nom AS commercial_nom, ' +
      'com.prenom AS commercial_prenom, ' +
      'chef.nom AS chef_nom, ' +
      'chef.prenom AS chef_prenom, ' +
      'sup.nom AS superviseur_nom, ' +
      'sup.prenom AS superviseur_prenom ' +
      'FROM reservation r ' +
      'LEFT JOIN client c ON r.id_client = c.id_client ' +
      'LEFT JOIN user com ON r.id_commercial = com.id_user ' +
      'LEFT JOIN user chef ON r.id_chef_commercial = chef.id_user ' +
      'LEFT JOIN user sup ON r.id_superviseur = sup.id_user ' +
      'WHERE r.validation_chef_commercial = 1 ' +
      'ORDER BY r.date_validation_chef DESC, r.id_reservation DESC';

    const [rows] = await connection.query(sql);
    connection.release();

    const data = (rows as any[]).map((r) => ({
      ...r,
      validation_chef_commercial: !!r.validation_chef_commercial,
      validation_superviseur: !!r.validation_superviseur,
      est_verrouille: !!r.est_verrouille,
      client: {
        id: r.id_client,
        raison_sociale: r.client_raison_sociale,
        email: r.client_email,
        telephone: r.client_telephone,
      },
      commercial: r.id_commercial
        ? {
            id: r.id_commercial,
            nom: r.commercial_nom,
            prenom: r.commercial_prenom,
          }
        : null,
      chef_commercial: r.id_chef_commercial
        ? {
            id: r.id_chef_commercial,
            nom: r.chef_nom,
            prenom: r.chef_prenom,
          }
        : null,
      superviseur: r.id_superviseur
        ? {
            id: r.id_superviseur,
            nom: r.superviseur_nom,
            prenom: r.superviseur_prenom,
          }
        : null,
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('❌ GET /api/superviseurs/affichages:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      connection.release();
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const reservationIds: number[] = Array.isArray(body?.reservationIds)
      ? body.reservationIds.filter((n: any) => Number.isInteger(n))
      : [];
    const notes: string | null = body?.notes ?? null;

    if (reservationIds.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Aucune réservation sélectionnée' },
        { status: 400 }
      );
    }

    // Vérification rôle superviseur
    const [userRows] = await connection.query(
      'SELECT u.id_user, p.libelle AS profil_libelle ' +
        'FROM user u ' +
        'LEFT JOIN profil p ON u.id_profil = p.id_profil ' +
        'WHERE u.id_user = ? LIMIT 1',
      [userId]
    );
    const me = (userRows as any[])[0];
    const libelle = (me?.profil_libelle || '').toLowerCase();
    if (
      !me ||
      (!libelle.includes('superviseur') && !libelle.includes('admin'))
    ) {
      connection.release();
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await connection.beginTransaction();

    const placeholders = reservationIds.map(() => '?').join(',');

    let updateSql =
      'UPDATE reservation ' +
      'SET validation_superviseur = 1, ' +
      'id_superviseur = ?, ' +
      'date_validation_superviseur = NOW(), ' +
      'statut = \'Validée superviseur\', ' +
      'updated_at = NOW() ';

    let params: any[];

    if (notes) {
      updateSql +=
        ', notes = CONCAT(COALESCE(notes, \'\'), \'\\n[Superviseur] \', ?) ';
      params = [userId, notes, ...reservationIds];
    } else {
      params = [userId, ...reservationIds];
    }

    updateSql +=
      'WHERE id_reservation IN (' +
      placeholders +
      ') AND validation_chef_commercial = 1';

    await connection.query(updateSql, params);

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: reservationIds.length + ' réservation(s) validée(s)',
      reservationIds,
    });
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}
    connection.release();
    console.error('❌ POST /api/superviseurs/affichages:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}