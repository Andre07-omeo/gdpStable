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

    // ✅ LEFT JOIN partout : on garde toutes les réservations avec photo
    //    même si les relations (face, panneau, client…) sont incomplètes
    const query = `
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
        u.email AS commercial_email,
        p.id_panneau,
        p.nom AS panneau_nom,
        p.adresse AS panneau_adresse,
        p.latitude AS panneau_latitude,
        p.longitude AS panneau_longitude,
        f.id_face,
        f.orientation AS face_orientation,
        tf.id_type_face,
        tf.libelle AS type_face_libelle,
        lr.id_ligne AS id_ligne_reservation,
        lr.statut_diffusion,
        lr.date_debut AS ligne_date_debut,
        lr.date_fin AS ligne_date_fin,
        DATEDIFF(lr.date_fin, CURDATE()) AS jours_restants
      FROM reservation r
      LEFT JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
      LEFT JOIN face f ON f.id_face = lr.id_face
      LEFT JOIN panneau p ON p.id_panneau = f.id_panneau
      LEFT JOIN type_face tf ON tf.id_type_face = f.id_type_face
      LEFT JOIN client c ON c.id_client = r.id_client
      LEFT JOIN user u ON u.id_user = r.id_commercial
      WHERE r.photoCampagneUrl IS NOT NULL
        AND TRIM(r.photoCampagneUrl) <> ''
        AND LOWER(TRIM(r.photoCampagneUrl)) <> 'null'
      ORDER BY r.date_upload_photo DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT r.id_reservation) AS total
      FROM reservation r
      WHERE r.photoCampagneUrl IS NOT NULL
        AND TRIM(r.photoCampagneUrl) <> ''
        AND LOWER(TRIM(r.photoCampagneUrl)) <> 'null'
    `;

    console.log('📸 Chargement du catalogue photos...');

    // ✅ pool.query gère lui-même l'acquisition/libération de connexion
    const [rows] = await pool.query(query, [limit, offset]);
    const [countResult] = await pool.query(countQuery);

    const total = (countResult as any[])[0]?.total ?? 0;
    console.log(`📊 ${(rows as any[]).length} lignes trouvées (total: ${total})`);

    const data = (rows as any[]).map((row) => ({
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
      panneau: {
        id: row.id_panneau,
        nom: row.panneau_nom || 'Panneau non spécifié',
        adresse: row.panneau_adresse || 'Adresse non définie',
        latitude: row.panneau_latitude,
        longitude: row.panneau_longitude,
      },
      face: {
        id: row.id_face,
        orientation: row.face_orientation || 'N/A',
        type: row.type_face_libelle || 'Standard',
      },
      lignes: [
        {
          id_ligne: row.id_ligne_reservation,
          id_face: row.id_face,
          id_panneau: row.id_panneau,
          orientation: row.face_orientation || 'N/A',
          type_face: row.type_face_libelle || 'Standard',
          statut_diffusion: row.statut_diffusion || 'En attente',
          date_debut: row.ligne_date_debut,
          date_fin: row.ligne_date_fin,
          jours_restants: row.jours_restants,
          panneau: {
            id: row.id_panneau,
            nom: row.panneau_nom || 'Panneau non spécifié',
            adresse: row.panneau_adresse || 'Adresse non définie',
          },
        },
      ],
    }));

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