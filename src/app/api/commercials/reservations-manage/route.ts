// src/app/api/commercials/reservations-manage/route.ts

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

// ============================================
// HELPER : DÉCODER LE TOKEN
// ============================================
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

// ============================================
// GET : LISTER LES RÉSERVATIONS
// ============================================
export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('👤 Utilisateur connecté:', currentUser);

    const searchParams = request.nextUrl.searchParams;
    const statutFilter = searchParams.get('statut');
    const searchTerm = searchParams.get('search');

    const connection = await pool.getConnection();

    // ✅ Construction de la requête de base
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
        DATEDIFF(lr.date_fin, CURDATE()) AS jours_restants
      FROM reservation r
      INNER JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      INNER JOIN face f ON lr.id_face = f.id_face
      INNER JOIN panneau p ON f.id_panneau = p.id_panneau
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      WHERE 1=1
    `;

    const params: any[] = [];

    // ✅ Filtrage par rôle
    // COMMERCIAL → uniquement SES réservations
    // CHEF_COMMERCIAL → réservations de son équipe
    // SUPER_ADMIN / DG / PDG → toutes les réservations
    if (
      currentUser.profil === 'COMMERCIAL'
    ) {
      query += ` AND r.id_commercial = ?`;
      params.push(currentUser.userId);
    } else if (
      currentUser.profil === 'CHEF_COMMERCIAL'
    ) {
      // ✅ Voir les réservations de son équipe + les siennes
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
    // Sinon (SUPER_ADMIN, ADMIN, DG, PDG) → toutes

    // ✅ Filtre par statut
    if (statutFilter && statutFilter !== 'TOUS') {
      query += ` AND r.statut = ?`;
      params.push(statutFilter);
    }

    // ✅ Filtre par recherche
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

    query += ` ORDER BY r.date_creation DESC`;

    const [rows] = await connection.query(query, params);
    connection.release();

    const reservations = Array.isArray(rows) ? rows : [];

    console.log(`✅ ${reservations.length} réservation(s) trouvée(s)`);

    return NextResponse.json({
      success: true,
      data: reservations,
      total: reservations.length,
    });
  } catch (error: any) {
    console.error('❌ Erreur GET reservations-manage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT : METTRE À JOUR UNE RÉSERVATION
// ============================================
export async function PUT(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id_reservation, action, motif_annulation, nouvelle_date_debut, nouvelle_date_fin } = body;

    if (!id_reservation || !action) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'id_reservation et action requis' },
        { status: 400 }
      );
    }

    // ✅ Vérifier que la réservation existe
    const [reservationCheck] = await connection.query(
      `SELECT r.*, lr.id_ligne, lr.id_face 
       FROM reservation r
       INNER JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
       WHERE r.id_reservation = ?`,
      [id_reservation]
    );

    if ((reservationCheck as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    const reservation = (reservationCheck as any[])[0];

    // ✅ Vérifier les permissions
    const canModify =
      currentUser.profil === 'SUPER_ADMIN' ||
      currentUser.profil === 'ADMIN_SYSTEM' ||
      currentUser.profil === 'DG' ||
      currentUser.profil === 'PDG' ||
      currentUser.profil === 'CHEF_COMMERCIAL' ||
      reservation.id_commercial === currentUser.userId;

    if (!canModify) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    // ✅ Traiter l'action
    if (action === 'annuler') {
      await connection.query(
        `UPDATE reservation SET statut = 'Annulée', notes = CONCAT(IFNULL(notes, ''), '\n[ANNULÉE] ', ?) WHERE id_reservation = ?`,
        [motif_annulation || 'Annulée par l\'utilisateur', id_reservation]
      );

      await connection.query(
        `UPDATE ligne_reservation SET statut_diffusion = 'Annulée' WHERE id_reservation = ?`,
        [id_reservation]
      );

      console.log(`✅ Réservation ${id_reservation} annulée`);
    } else if (action === 'modifier_dates') {
      if (!nouvelle_date_debut || !nouvelle_date_fin) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, error: 'Nouvelles dates requises' },
          { status: 400 }
        );
      }

      await connection.query(
        `UPDATE reservation SET date_debut_campagne = ?, date_fin_campagne = ? WHERE id_reservation = ?`,
        [nouvelle_date_debut, nouvelle_date_fin, id_reservation]
      );

      await connection.query(
        `UPDATE ligne_reservation SET date_debut = ?, date_fin = ? WHERE id_reservation = ?`,
        [nouvelle_date_debut, nouvelle_date_fin, id_reservation]
      );

      console.log(`✅ Dates modifiées pour ${id_reservation}`);
    } else if (action === 'valider') {
      await connection.query(
        `UPDATE reservation SET statut = 'ACTIVE', est_verrouille = 1, date_verrouillage = NOW() WHERE id_reservation = ?`,
        [id_reservation]
      );

      await connection.query(
        `UPDATE ligne_reservation SET statut_diffusion = 'ACTIVE' WHERE id_reservation = ?`,
        [id_reservation]
      );

      console.log(`✅ Réservation ${id_reservation} validée`);
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur PUT reservations-manage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE : SUPPRIMER UNE RÉSERVATION
// ============================================
export async function DELETE(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id_reservation = searchParams.get('id_reservation');

    if (!id_reservation) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'id_reservation requis' },
        { status: 400 }
      );
    }

    // ✅ Seuls admin/DG/PDG peuvent supprimer
    if (
      currentUser.profil !== 'SUPER_ADMIN' &&
      currentUser.profil !== 'ADMIN_SYSTEM' &&
      currentUser.profil !== 'DG' &&
      currentUser.profil !== 'PDG'
    ) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Seuls les administrateurs peuvent supprimer' },
        { status: 403 }
      );
    }

    // ✅ Supprimer la ligne puis la réservation
    await connection.query(
      `DELETE FROM ligne_reservation WHERE id_reservation = ?`,
      [id_reservation]
    );

    await connection.query(
      `DELETE FROM reservation WHERE id_reservation = ?`,
      [id_reservation]
    );

    await connection.commit();
    connection.release();

    console.log(`✅ Réservation ${id_reservation} supprimée`);

    return NextResponse.json({
      success: true,
      message: 'Réservation supprimée avec succès',
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur DELETE reservations-manage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}