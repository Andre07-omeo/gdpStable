// src/app/api/map-panneaux/route.ts (version simplifiée)
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

export async function GET(request: NextRequest) {
  try {
    const connection = await pool.getConnection();

    // ✅ Requête simplifiée avec jointures
    const [rows] = await connection.query(`
      SELECT 
        p.id_panneau,
        p.nom,
        p.adresse,
        p.latitude,
        p.longitude,
        p.etat,
        p.commune,
        p.province,
        p.ville,
        p.pays_id,
        p.province_id,
        p.ville_id,
        p.commune_id,
        p.created_by,
        p.precision_gps,
        p.date_creation,
        -- ✅ Informations des faces
        f.id_face,
        f.id_type_face,
        f.orientation,
        f.est_active,
        f.a_probleme,
        f.date_probleme,
        f.raison_probleme,
        f.created_at as face_created_at,
        f.updated_at as face_updated_at,
        -- ✅ Dimensions du type de face
        tf.libelle as type_face_libelle,
        tf.hauteur_cm,
        tf.largeur_cm,
        tf.est_scroller
      FROM panneau p
      LEFT JOIN face f ON p.id_panneau = f.id_panneau AND f.est_active = 1
      LEFT JOIN type_face tf ON f.id_type_face = tf.id_type_face
      WHERE p.etat = 'Actif'
      ORDER BY p.id_panneau DESC, f.id_face ASC
    `);

    connection.release();

    // ✅ Grouper les données par panneau
    const panneauxMap = new Map();

    (rows as any[]).forEach((row) => {
      const panneauId = row.id_panneau;
      
      if (!panneauxMap.has(panneauId)) {
        panneauxMap.set(panneauId, {
          id: panneauId.toString(),
          id_panneau: panneauId,
          nom: row.nom || 'Sans nom',
          adresse: row.adresse || 'Adresse non définie',
          latitude: row.latitude,
          longitude: row.longitude,
          etat: row.etat || 'Actif',
          etatPanneau: row.etat || 'Actif',
          commune: row.commune,
          province: row.province,
          ville: row.ville,
          pays_id: row.pays_id,
          province_id: row.province_id,
          ville_id: row.ville_id,
          commune_id: row.commune_id,
          created_by: row.created_by,
          precision_gps: row.precision_gps,
          date_creation: row.date_creation,
          faces: []
        });
      }

      // ✅ Ajouter la face si elle existe
      if (row.id_face) {
        const panneau = panneauxMap.get(panneauId);
        panneau.faces.push({
          id: row.id_face.toString(),
          id_face: row.id_face,
          id_panneau: row.id_panneau,
          id_type_face: row.id_type_face,
          orientation: row.orientation || 'N/A',
          est_active: row.est_active,
          a_probleme: row.a_probleme,
          date_probleme: row.date_probleme,
          raison_probleme: row.raison_probleme,
          created_at: row.face_created_at,
          updated_at: row.face_updated_at,
          // ✅ Dimensions IMPORTANTES
          hauteur_cm: row.hauteur_cm || 0,
          largeur_cm: row.largeur_cm || 0,
          hauteur: row.hauteur_cm || 0,
          largeur: row.largeur_cm || 0,
          type_face_libelle: row.type_face_libelle,
          est_scroller: row.est_scroller,
          // ✅ Réservations (à récupérer séparément si besoin)
          reservations: []
        });
      }
    });

    const processedPanneaux = Array.from(panneauxMap.values());

    return NextResponse.json({
      success: true,
      data: processedPanneaux,
      total: processedPanneaux.length
    });

  } catch (error) {
    console.error('❌ Erreur récupération panneaux:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des panneaux: ' + (error as Error).message },
      { status: 500 }
    );
  }
}