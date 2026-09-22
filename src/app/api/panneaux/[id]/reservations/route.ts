// src/app/api/commercials/panneaux/[id]/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const panneauId = parseInt(params.id);
    console.log(`🔍 Récupération des réservations du panneau ID: ${panneauId}`);

    const connection = await pool.getConnection();

    // ✅ Récupérer toutes les réservations de toutes les faces du panneau
    const [reservations] = await connection.query(
      `SELECT 
        r.id_reservation,
        r.numero_commande,
        r.date_debut_campagne as dateDebut,
        r.date_fin_campagne as dateFin,
        r.statut,
        r.notes,
        r.date_creation as dateCreation,
        r.date_expiration,
        r.est_verrouille,
        r.date_verrouillage,
        r.photoCampagneUrl,
        cl.raison_sociale as client_nom,
        cl.id_client,
        cl.telephone as client_telephone,
        CONCAT(u.nom, ' ', u.prenom) as commercial_nom,
        u.id_user as commercial_id,
        u.email as commercial_email,
        lr.id_ligne,
        lr.id_face,
        lr.prix_vente_net,
        lr.statut_diffusion,
        f.orientation,
        f.id_panneau
      FROM reservation r
      JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      JOIN face f ON lr.id_face = f.id_face
      LEFT JOIN client cl ON r.id_client = cl.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      WHERE f.id_panneau = ?
      ORDER BY f.id_face ASC, r.date_creation DESC`,
      [panneauId]
    );

    connection.release();

    // ✅ Grouper les réservations par face
    const reservationsByFace = (reservations as any[]).reduce((acc: any, r: any) => {
      const faceId = r.id_face;
      if (!acc[faceId]) {
        acc[faceId] = {
          face_id: faceId,
          orientation: r.orientation,
          reservations: []
        };
      }
      acc[faceId].reservations.push(r);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        panneau_id: panneauId,
        total_reservations: (reservations as any[]).length,
        reservations: reservations || [],
        reservations_by_face: Object.values(reservationsByFace)
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération réservations du panneau:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    );
  }
}