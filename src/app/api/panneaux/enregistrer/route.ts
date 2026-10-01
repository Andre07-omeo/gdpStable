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
  queueLimit: 0,
});

export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const {
      nom,
      adresse,
      latitude,        // ✅ optionnel (peut être null)
      longitude,       // ✅ optionnel (peut être null)
      pays_id,
      province_id,
      ville_id,
      commune_id,
      hauteur,         // ✅ nouveau
      largeur,         // ✅ nouveau
      dimension,       // ✅ calculée côté front ("9 X 6")
      faces,
      created_by,
      precision_gps,
    } = body;

    // ✅ Vérification des champs obligatoires (GPS non requis)
    if (!nom) {
      return NextResponse.json(
        { error: 'Le nom est requis' },
        { status: 400 }
      );
    }

    if (!pays_id || !province_id || !ville_id || !commune_id) {
      return NextResponse.json(
        { error: 'Pays, province, ville et commune sont requis' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ 1. Récupérer les noms des localisations
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

    const adresseComplete = adresse ||
      `${communeNom} / ${villeNom} / ${provinceNom} / ${paysNom}`;

    // ✅ 2. Insérer le panneau (GPS + dimension peuvent être null)
    const latVal = latitude != null && latitude !== '' ? latitude : null;
    const lngVal = longitude != null && longitude !== '' ? longitude : null;

    // ✅ CORRECTION : on remplit AUSSI created_at et updated_at
    const [panneauResult] = await connection.query(
      `INSERT INTO panneau
       (nom, adresse, latitude, longitude, etat,
        pays_id, province_id, ville_id, commune_id,
        created_by, precision_gps, date_creation, dimension,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Actif', ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
      [
        nom,
        adresseComplete,
        latVal,
        lngVal,
        pays_id,
        province_id,
        ville_id,
        commune_id,
        created_by || null,
        precision_gps || 0,
        dimension || null,
      ]
    );

    const panneauId = (panneauResult as any).insertId;

    // ✅ 3. Insérer les faces
    let facesInserted = 0;

    if (Array.isArray(faces) && faces.length > 0) {
      for (const face of faces) {
        const typeFaceId = face.type_face_id;
        if (!typeFaceId) continue;

        // Vérifier que le type existe
        const [verifyType] = await connection.query(
          `SELECT id_type_face FROM type_face WHERE id_type_face = ?`,
          [typeFaceId]
        );
        if ((verifyType as any[]).length === 0) continue;

        const orientation = face.orientation || 'NORD';

        // ✅ CORRECTION : created_at et updated_at aussi pour les faces
        await connection.query(
          `INSERT INTO face
           (id_panneau, id_type_face, orientation, est_active,
            created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [panneauId, typeFaceId, orientation]
        );
        facesInserted++;
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      panneauId,
      facesInserted,
      dimension: dimension || null,
      message: `Panneau enregistré avec ${facesInserted} face(s)`,
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