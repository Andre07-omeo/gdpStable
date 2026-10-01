// src/app/api/commercials/catalogue-photos/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // ✅ 1) On récupère d'abord UNIQUEMENT les réservations ayant une photo valide
    //    (pagination propre sur les réservations, pas sur les lignes)
    const reservationsQuery = `
      SELECT
        r.id_reservation,
        r.numero_commande,
        r.date_debut_campagne,
        r.date_fin_campagne,
        r.statut,
        r.photoCampagneUrl,
        r.photo_latitude,
        r.photo_longitude,
        r.date_upload_photo,
        r.notes,
        c.raison_sociale AS client_nom,
        c.email_facturation AS client_email,
        u.nom AS commercial_nom,
        u.prenom AS commercial_prenom,
        u.email AS commercial_email
      FROM reservation r
      LEFT JOIN client c ON c.id_client = r.id_client
      LEFT JOIN user u ON u.id_user = r.id_commercial
      WHERE r.photoCampagneUrl IS NOT NULL
        AND TRIM(r.photoCampagneUrl) <> ''
        AND LOWER(TRIM(r.photoCampagneUrl)) <> 'null'
      ORDER BY r.date_upload_photo DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM reservation r
      WHERE r.photoCampagneUrl IS NOT NULL
        AND TRIM(r.photoCampagneUrl) <> ''
        AND LOWER(TRIM(r.photoCampagneUrl)) <> 'null'
    `;

    console.log('📸 Chargement du catalogue photos...');

    const [reservationRows] = await pool.query(reservationsQuery, [limit, offset]);
    const [countResult] = await pool.query(countQuery);

    const reservations = reservationRows as any[];
    const total = (countResult as any[])[0]?.total ?? 0;
    console.log(`📊 ${reservations.length} réservations trouvées (total: ${total})`);

    // ✅ 2) Si aucune réservation, on retourne directement
    if (reservations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total,
        limit,
        offset,
      });
    }

    // ✅ 3) On récupère TOUTES les lignes de réservation pour ces réservations
    const ids = reservations.map((r) => r.id_reservation);
    const placeholders = ids.map(() => '?').join(',');

    const lignesQuery = `
      SELECT
        lr.id_ligne AS id_ligne_reservation,
        lr.id_reservation,
        lr.statut_diffusion,
        lr.date_debut AS ligne_date_debut,
        lr.date_fin AS ligne_date_fin,
        DATEDIFF(lr.date_fin, CURDATE()) AS jours_restants,
        f.id_face,
        f.orientation AS face_orientation,
        tf.id_type_face,
        tf.libelle AS type_face_libelle,
        p.id_panneau,
        p.nom AS panneau_nom,
        p.adresse AS panneau_adresse,
        p.latitude AS panneau_latitude,
        p.longitude AS panneau_longitude
      FROM ligne_reservation lr
      LEFT JOIN face f ON f.id_face = lr.id_face
      LEFT JOIN panneau p ON p.id_panneau = f.id_panneau
      LEFT JOIN type_face tf ON tf.id_type_face = f.id_type_face
      WHERE lr.id_reservation IN (${placeholders})
    `;

    const [lignesRows] = await pool.query(lignesQuery, ids);
    const lignes = lignesRows as any[];

    // ✅ 4) On regroupe les lignes par réservation
    const lignesParReservation = new Map<number, any[]>();
    for (const l of lignes) {
      if (!lignesParReservation.has(l.id_reservation)) {
        lignesParReservation.set(l.id_reservation, []);
      }
      lignesParReservation.get(l.id_reservation)!.push({
        id_ligne: l.id_ligne_reservation,
        id_face: l.id_face,
        id_panneau: l.id_panneau,
        orientation: l.face_orientation || 'N/A',
        type_face: l.type_face_libelle || 'Standard',
        statut_diffusion: l.statut_diffusion || 'En attente',
        date_debut: l.ligne_date_debut,
        date_fin: l.ligne_date_fin,
        jours_restants: l.jours_restants,
        panneau: {
          id: l.id_panneau,
          nom: l.panneau_nom || 'Panneau non spécifié',
          adresse: l.panneau_adresse || 'Adresse non définie',
          latitude: l.panneau_latitude,
          longitude: l.panneau_longitude,
        },
      });
    }

    // ✅ 5) On construit la réponse finale
    const data = reservations.map((row) => {
      const lignesResa = lignesParReservation.get(row.id_reservation) || [];
      const premiereLigne = lignesResa[0];

      return {
        id_reservation: row.id_reservation,
        numero_commande: row.numero_commande || 'N/A',
        date_debut_campagne: row.date_debut_campagne,
        date_fin_campagne: row.date_fin_campagne,
        statut: row.statut || 'En attente',
        photoCampagneUrl: row.photoCampagneUrl,
        photo_latitude: row.photo_latitude,
        photo_longitude: row.photo_longitude,
        date_upload_photo: row.date_upload_photo,
        notes: row.notes,
        client: {
          nom: row.client_nom || 'Client non spécifié',
          email: row.client_email || '',
        },
        commercial: {
          nom: row.commercial_nom || 'N/A',
          prenom: row.commercial_prenom || '',
          email: row.commercial_email || '',
          nom_complet:
            row.commercial_prenom && row.commercial_nom
              ? `${row.commercial_prenom} ${row.commercial_nom}`
              : row.commercial_nom || 'N/A',
        },
        // ✅ On expose le premier panneau/face pour compatibilité front
        panneau: {
          id: premiereLigne?.id_panneau || null,
          nom: premiereLigne?.panneau?.nom || 'Panneau non spécifié',
          adresse: premiereLigne?.panneau?.adresse || 'Adresse non définie',
          latitude: premiereLigne?.panneau?.latitude || null,
          longitude: premiereLigne?.panneau?.longitude || null,
        },
        face: {
          id: premiereLigne?.id_face || null,
          orientation: premiereLigne?.orientation || 'N/A',
          type: premiereLigne?.type_face || 'Standard',
        },
        // ✅ Toutes les lignes de la réservation
        lignes: lignesResa,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('❌ Erreur catalogue photos:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Erreur lors du chargement',
        error: error.toString(),
      },
      { status: 500 }
    );
  }
}