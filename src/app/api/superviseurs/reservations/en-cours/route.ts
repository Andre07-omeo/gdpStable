// src/app/api/superviseurs/reservations/en-cours/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const panneauId = searchParams.get('panneauId');
    const type = searchParams.get('type') || 'all';

    console.log('📡 API appelée - panneauId:', panneauId, 'type:', type);

    const connection = await pool.getConnection();

    // ✅ Requête avec les bonnes colonnes de la table client
    let query = `
      SELECT 
        r.id_reservation,
        r.numero_commande,
        r.date_debut_campagne,
        r.date_fin_campagne,
        r.statut,
        r.photoCampagneUrl,
        r.created_at,
        r.notes,
        c.raison_sociale as client_nom,
        c.email_facturation as client_email,
        c.telephone as client_telephone,
        u.nom as commercial_nom,
        u.prenom as commercial_prenom,
        u.email as commercial_email,
        p.id_panneau,
        p.nom as panneau_nom,
        p.adresse as panneau_adresse,
        f.id_face,
        f.orientation as face_orientation,
        tf.libelle as type_face_libelle,
        lr.id_ligne as id_ligne_reservation,
        lr.statut_diffusion,
        lr.date_debut as ligne_date_debut,
        lr.date_fin as ligne_date_fin,
        DATEDIFF(lr.date_fin, CURDATE()) as jours_restants,
        DATEDIFF(lr.date_debut, CURDATE()) as jours_avant_debut
      FROM reservation r
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      LEFT JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      LEFT JOIN face f ON lr.id_face = f.id_face
      LEFT JOIN panneau p ON f.id_panneau = p.id_panneau
      LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
      WHERE r.statut IN ('Confirmée', 'Diffusée','ACTIVE')
    `;

    const params: any[] = [];

    if (panneauId) {
      query += ' AND p.id_panneau = ?';
      params.push(parseInt(panneauId));
    }

    if (type === 'en_cours') {
      query += ' AND DATE(lr.date_debut) <= CURDATE() AND DATE(lr.date_fin) >= CURDATE()';
    } else if (type === 'futur') {
      query += ' AND DATE(lr.date_debut) > CURDATE()';
    }

    query += ' ORDER BY lr.date_debut ASC';

    console.log('📝 Query:', query);
    console.log('📝 Params:', params);

    const [reservations] = await connection.query(query, params);
    connection.release();

    const count = (reservations as any[]).length;
    console.log('📊 Nombre de réservations confirmées trouvées:', count);

    if (count === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          total: 0,
          en_cours: 0,
          futur: 0
        },
        message: 'Aucune réservation confirmée par la comptabilité pour ce panneau'
      });
    }

    const groupedReservations: any = {};
    (reservations as any[]).forEach((row: any) => {
      const id = row.id_reservation;
      if (!groupedReservations[id]) {
        groupedReservations[id] = {
          id_reservation: row.id_reservation,
          numero_commande: row.numero_commande,
          date_debut_campagne: row.date_debut_campagne,
          date_fin_campagne: row.date_fin_campagne,
          statut: row.statut,
          photoCampagneUrl: row.photoCampagneUrl,
          notes: row.notes,
          client: {
            nom: row.client_nom || 'Client non spécifié',
            email: row.client_email || '',
            telephone: row.client_telephone || ''
          },
          commercial: {
            nom: row.commercial_nom || 'N/A',
            prenom: row.commercial_prenom || '',
            email: row.commercial_email || ''
          },
          lignes: []
        };
      }
      
      if (row.id_face) {
        let statutLigne = row.statut_diffusion || 'En attente';
        if (row.jours_restants >= 0 && row.jours_avant_debut <= 0) {
          statutLigne = 'En cours';
        } else if (row.jours_avant_debut > 0) {
          statutLigne = 'À venir';
        }

        groupedReservations[id].lignes.push({
          id_ligne_reservation: row.id_ligne_reservation,
          id_face: row.id_face,
          id_panneau: row.id_panneau,
          orientation: row.face_orientation || 'N/A',
          type_face: row.type_face_libelle || 'N/A',
          statut_diffusion: statutLigne,
          date_debut: row.ligne_date_debut,
          date_fin: row.ligne_date_fin,
          jours_restants: row.jours_restants,
          jours_avant_debut: row.jours_avant_debut,
          panneau: {
            id: row.id_panneau,
            nom: row.panneau_nom,
            adresse: row.panneau_adresse
          }
        });
      }
    });

    const result = Object.values(groupedReservations);

    const totalEnCours = result.filter((r: any) => 
      r.lignes.some((l: any) => l.statut_diffusion === 'En cours')
    ).length;

    const totalFutur = result.filter((r: any) => 
      r.lignes.some((l: any) => l.statut_diffusion === 'À venir')
    ).length;

    return NextResponse.json({
      success: true,
      data: result,
      stats: {
        total: result.length,
        en_cours: totalEnCours,
        futur: totalFutur
      },
      message: result.length > 0 ? 'Réservations confirmées trouvées' : 'Aucune réservation confirmée'
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des réservations: ' + (error as Error).message },
      { status: 500 }
    );
  }
}