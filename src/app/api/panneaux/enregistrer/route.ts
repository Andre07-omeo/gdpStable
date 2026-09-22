// src/app/api/panneaux/enregistrer/route.ts

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

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const {
      nom,
      adresse,
      latitude,
      longitude,
      pays_id,
      province_id,
      ville_id,
      commune_id,
      dimension,        // ✅ Nouveau champ pour la dimension
      faces,
      created_by,
      precision_gps
    } = body;

    // ✅ Vérification des champs obligatoires
    if (!nom || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Nom, latitude et longitude sont requis' },
        { status: 400 }
      );
    }

    // ✅ Vérifier que les IDs de localisation sont présents
    if (!pays_id || !province_id || !ville_id || !commune_id) {
      return NextResponse.json(
        { error: 'Pays, province, ville et commune sont requis' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ 1. Récupérer les noms des localisations pour l'adresse complète
    const [paysResult] = await connection.query(
      'SELECT nom FROM pays WHERE id_pays = ?',
      [pays_id]
    );
    const [provinceResult] = await connection.query(
      'SELECT nom FROM province WHERE id_province = ?',
      [province_id]
    );
    const [villeResult] = await connection.query(
      'SELECT nom FROM ville WHERE id_ville = ?',
      [ville_id]
    );
    const [communeResult] = await connection.query(
      'SELECT nom FROM commune WHERE id_commune = ?',
      [commune_id]
    );

    const paysNom = (paysResult as any[])[0]?.nom || '';
    const provinceNom = (provinceResult as any[])[0]?.nom || '';
    const villeNom = (villeResult as any[])[0]?.nom || '';
    const communeNom = (communeResult as any[])[0]?.nom || '';

    // ✅ Construire l'adresse complète
    const adresseComplete = adresse || 
      `${communeNom} / ${villeNom} / ${provinceNom} / ${paysNom}`;

    // ✅ 2. Insérer le panneau avec la dimension
    const [panneauResult] = await connection.query(
      `INSERT INTO panneau 
       (nom, adresse, latitude, longitude, etat, 
        pays_id, province_id, ville_id, commune_id, 
        created_by, precision_gps, date_creation, dimension) 
       VALUES (?, ?, ?, ?, 'Actif', ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [nom, adresseComplete, latitude, longitude,
        pays_id, province_id, ville_id, commune_id,
        created_by || null, precision_gps || 0,
        dimension || 'N/A']  // ✅ Enregistrer la dimension
    );

    const panneauId = (panneauResult as any).insertId;

    // ✅ 3. Insérer les faces avec référence au type_face
    let facesInserted = 0;
    
    if (faces && Array.isArray(faces) && faces.length > 0) {
      
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        
        // ✅ Récupérer le type_face_id
        let typeFaceId = face.type_face_id;
        
        // ✅ Si type_face_id n'est pas fourni, essayer de trouver par libelle
        if (!typeFaceId && face.libelle) {
          const [typeResult] = await connection.query(
            `SELECT id_type_face FROM type_face WHERE libelle = ?`,
            [face.libelle]
          );
          
          if ((typeResult as any[]).length > 0) {
            typeFaceId = (typeResult as any[])[0].id_type_face;
          } else {
            // ✅ Créer un nouveau type si pas trouvé
            const [newTypeResult] = await connection.query(
              `INSERT INTO type_face (libelle, hauteur_cm, largeur_cm, est_scroller) 
               VALUES (?, ?, ?, 0)`,
              [face.libelle, face.hauteur || 200, face.largeur || 300]
            );
            typeFaceId = (newTypeResult as any).insertId;
          }
        }
        
        // ✅ Vérifier que typeFaceId est valide
        if (!typeFaceId) {
          continue;
        }

        // ✅ Vérifier que le type existe bien dans la base
        const [verifyType] = await connection.query(
          `SELECT id_type_face FROM type_face WHERE id_type_face = ?`,
          [typeFaceId]
        );

        if ((verifyType as any[]).length === 0) {
          continue;
        }

        // ✅ Insérer la face avec référence au type_face
        const orientation = face.orientation || 'NORD';
        const [faceResult] = await connection.query(
          `INSERT INTO face 
           (id_panneau, id_type_face, orientation, est_active) 
           VALUES (?, ?, ?, 1)`,
          [panneauId, typeFaceId, orientation]
        );
        
        facesInserted++;
      }
    }

    // ✅ 4. Commit de la transaction
    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      panneauId,
      facesInserted,
      dimension: dimension || 'N/A',
      message: `Panneau enregistré avec ${facesInserted} face(s)`
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du panneau: ' + (error as Error).message },
      { status: 500 }
    );
  }
}