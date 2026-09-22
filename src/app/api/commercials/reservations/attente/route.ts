// src/app/api/commercials/reservations/attente/route.ts

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
  queueLimit: 0
});

// ✅ Fonction pour extraire l'ID utilisateur du token
function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret') as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // ✅ 1. Récupérer l'ID de l'utilisateur connecté
    const userId = getUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const connection = await pool.getConnection();

    // ✅ 2. Récupérer UNIQUEMENT les réservations de l'utilisateur connecté
    const [reservations] = await connection.query(`
      SELECT 
        r.id_reservation,
        r.numero_commande,
        r.date_debut_campagne,
        r.date_fin_campagne,
        r.statut,
        r.photoCampagneUrl,
        r.notes,
        r.created_at,
        r.date_expiration,
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
        lr.id_ligne,
        lr.statut_diffusion,
        lr.date_debut as ligne_date_debut,
        lr.date_fin as ligne_date_fin,
        DATEDIFF(r.date_expiration, CURDATE()) as jours_restants
      FROM reservation r
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      LEFT JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      LEFT JOIN face f ON lr.id_face = f.id_face
      LEFT JOIN panneau p ON f.id_panneau = p.id_panneau
      LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
      WHERE r.statut IN ('En attente', 'En attente de validation')
        AND r.id_commercial = ?  -- ✅ FILTRE PAR L'UTILISATEUR CONNECTÉ
        AND (r.date_expiration IS NULL OR DATE(r.date_expiration) >= CURDATE())
      ORDER BY r.date_expiration ASC, r.created_at DESC
    `, [userId]);

    connection.release();

    console.log(`📊 ${(reservations as any[]).length} réservations en attente pour l'utilisateur ${userId}`);

    // ✅ Grouper par réservation
    const grouped: any = {};
    (reservations as any[]).forEach((row: any) => {
      const id = row.id_reservation;
      if (!grouped[id]) {
        grouped[id] = {
          id_reservation: row.id_reservation,
          numero_commande: row.numero_commande,
          date_debut_campagne: row.date_debut_campagne,
          date_fin_campagne: row.date_fin_campagne,
          statut: row.statut,
          photoCampagneUrl: row.photoCampagneUrl,
          notes: row.notes,
          created_at: row.created_at,
          date_expiration: row.date_expiration,
          jours_restants: row.jours_restants,
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
        grouped[id].lignes.push({
          id_ligne: row.id_ligne,
          id_face: row.id_face,
          id_panneau: row.id_panneau,
          orientation: row.face_orientation || 'N/A',
          type_face: row.type_face_libelle || 'N/A',
          statut_diffusion: row.statut_diffusion,
          date_debut: row.ligne_date_debut,
          date_fin: row.ligne_date_fin,
          panneau: {
            id: row.id_panneau,
            nom: row.panneau_nom,
            adresse: row.panneau_adresse
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.values(grouped),
      total: Object.keys(grouped).length
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des réservations en attente' },
      { status: 500 }
    );
  }
}