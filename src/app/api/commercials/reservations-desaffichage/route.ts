// src/app/api/commercials/reservations-desaffichage/route.ts

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
  connectionLimit: 20,
  queueLimit: 0,
});

function getUserFromToken(request: NextRequest): {
  userId: number;
  profil: string;
  id_profil: number;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;

    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
      id_profil: decoded.id_profil,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('search');

    const connection = await pool.getConnection();

    // ✅ REQUÊTE CORRIGÉE
    // RÈGLE STRICTE : jours_restants < 16 (strictement inférieur)
    let query = `
      SELECT 
        r.id_reservation,
        r.numero_commande,
        r.date_creation,
        r.date_debut_campagne,
        r.date_fin_campagne,
        r.statut,
        r.notes,
        r.date_expiration,
        r.est_verrouille,
        r.date_verrouillage,
        r.photoCampagneUrl,
        COALESCE(r.validation_chef_commercial, 0) AS validation_chef_commercial,
        r.date_validation_chef,
        c.id_client,
        c.raison_sociale AS client_nom,
        c.email_facturation AS client_email,
        c.telephone AS client_telephone,
        c.ville AS client_ville,
        u.id_user AS commercial_id,
        u.nom AS commercial_nom,
        u.prenom AS commercial_prenom,
        u.email AS commercial_email,
        lr.id_ligne,
        lr.id_face,
        lr.date_debut AS ligne_date_debut,
        lr.date_fin AS ligne_date_fin,
        lr.prix_vente_net,
        lr.statut_diffusion,
        f.orientation AS face_orientation,
        f.id_panneau,
        p.nom AS panneau_nom,
        p.adresse AS panneau_adresse,
        p.ville AS panneau_ville,
        p.commune AS panneau_commune,
        p.province AS panneau_province,
        p.etat AS panneau_etat,
        DATEDIFF(r.date_fin_campagne, CURDATE()) AS jours_restants,
        CASE 
          WHEN DATEDIFF(r.date_fin_campagne, CURDATE()) <= 0 THEN 'echu'
          ELSE 'alerte'
        END AS categorie
      FROM reservation r
      INNER JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      INNER JOIN face f ON lr.id_face = f.id_face
      INNER JOIN panneau p ON f.id_panneau = p.id_panneau
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      WHERE 
        DATEDIFF(r.date_fin_campagne, CURDATE()) < 16
        AND COALESCE(r.validation_chef_commercial, 0) = 0
    `;

    const params: any[] = [];

    if (currentUser.profil === 'COMMERCIAL') {
      query += ` AND r.id_commercial = ?`;
      params.push(currentUser.userId);
    } else if (currentUser.profil === 'CHEF_COMMERCIAL') {
      query += ` AND (
        r.id_commercial = ? 
        OR r.id_commercial IN (
          SELECT id_user FROM user 
          WHERE id_manager = ? 
          AND id_profil IN (SELECT id_profil FROM profil WHERE code = 'COMMERCIAL')
        )
      )`;
      params.push(currentUser.userId, currentUser.userId);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      query += ` AND (
        r.numero_commande LIKE ? 
        OR c.raison_sociale LIKE ?
        OR p.nom LIKE ?
        OR p.adresse LIKE ?
      )`;
      const searchPattern = `%${searchTerm.trim()}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY jours_restants ASC, r.date_creation DESC`;

    const [rows] = await connection.query(query, params);
    connection.release();

    const reservations = Array.isArray(rows) ? rows : [];

    // Log pour diagnostic
    console.log('📊 Réservations désaffichage:', reservations.map((r: any) => ({
      commande: r.numero_commande,
      date_fin: r.date_fin_campagne,
      jours: r.jours_restants,
    })));

    const echu = reservations.filter((r: any) => Number(r.jours_restants) <= 0);
    const alerte = reservations.filter((r: any) => Number(r.jours_restants) > 0);

    return NextResponse.json({
      success: true,
      data: reservations,
      total: reservations.length,
      stats: {
        echu: echu.length,
        alerte: alerte.length,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur GET reservations-desaffichage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}