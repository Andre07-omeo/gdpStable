// src/app/api/commercials/faces/[id]/route.ts
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
    const faceId = parseInt(params.id);
    console.log(`🔍 Récupération des détails de la face ID: ${faceId}`);

    const connection = await pool.getConnection();

    // ✅ 1. Récupérer les informations de la face et du panneau
    const [faceData] = await connection.query(
      `SELECT 
        f.id_face,
        f.id_panneau,
        f.id_type_face,
        f.orientation,
        f.est_active,
        f.a_probleme,
        f.date_probleme,
        f.raison_probleme,
        f.created_at,
        f.updated_at,
        tf.libelle as type_face_libelle,
        tf.hauteur_cm,
        tf.largeur_cm,
        tf.est_scroller,
        p.nom as panneau_nom,
        p.adresse as panneau_adresse,
        p.latitude,
        p.longitude,
        p.etat as panneau_etat,
        p.commune,
        p.province,
        p.ville,
        p.dimension as panneau_dimension
      FROM face f
      LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
      LEFT JOIN panneau p ON f.id_panneau = p.id_panneau
      WHERE f.id_face = ?
      AND f.est_active = 1`,
      [faceId]
    );

    if ((faceData as any[]).length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'Face non trouvée' },
        { status: 404 }
      );
    }

    const face = (faceData as any[])[0];

    // ✅ 2. Récupérer toutes les réservations de cette face
    // ✅ Correction: Utiliser "user" au lieu de "users"
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
        cl.raison_sociale as client_nom,
        cl.id_client,
        cl.telephone as client_telephone,
        CONCAT(u.nom, ' ', u.prenom) as commercial_nom,
        u.id_user as commercial_id,
        u.email as commercial_email,
        lr.id_ligne,
        lr.prix_vente_net,
        lr.statut_diffusion,
        r.photoCampagneUrl
      FROM reservation r
      JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      LEFT JOIN client cl ON r.id_client = cl.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      WHERE lr.id_face = ?
      ORDER BY r.date_creation DESC`,
      [faceId]
    );

    connection.release();

    // ✅ 3. Calculer la surface en m² pour la face
    const hauteurCm = face.hauteur_cm || 0;
    const largeurCm = face.largeur_cm || 0;
    const surfaceM2 = hauteurCm && largeurCm 
      ? ((hauteurCm * largeurCm) / 10000).toFixed(2) 
      : '0';

    // ✅ 4. Construire la réponse
    const response = {
      success: true,
      data: {
        face: {
          id_face: face.id_face,
          id_panneau: face.id_panneau,
          orientation: face.orientation || 'N/A',
          est_active: face.est_active === 1,
          a_probleme: face.a_probleme === 1,
          date_probleme: face.date_probleme,
          raison_probleme: face.raison_probleme,
          type_face: {
            id: face.id_type_face,
            libelle: face.type_face_libelle || 'Standard',
            hauteur_cm: hauteurCm,
            largeur_cm: largeurCm,
            est_scroller: face.est_scroller === 1
          },
          dimension: hauteurCm && largeurCm 
            ? `${hauteurCm}×${largeurCm} cm` 
            : 'N/A',
          surface_m2: surfaceM2
        },
        panneau: {
          id_panneau: face.id_panneau,
          nom: face.panneau_nom || 'Sans nom',
          adresse: face.panneau_adresse || 'Adresse non définie',
          type: face.type_face_libelle || 'Standard',
          dimension: face.panneau_dimension || surfaceM2 + ' m²',
          latitude: face.latitude,
          longitude: face.longitude,
          etat: face.panneau_etat || 'Actif',
          commune: face.commune,
          province: face.province,
          ville: face.ville
        },
        reservations: reservations || [],
        total_reservations: (reservations as any[]).length
      }
    };

    console.log(`✅ Détails de la face ${faceId} récupérés avec ${response.data.total_reservations} réservation(s)`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur récupération détails face:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des détails de la face' },
      { status: 500 }
    );
  }
}