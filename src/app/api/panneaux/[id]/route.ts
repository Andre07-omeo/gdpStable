// src/app/api/panneaux/[id]/route.ts

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

// ================= GET : récupérer un panneau avec ses faces =================
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const [panneaux] = await pool.query(
      `SELECT * FROM panneau WHERE id_panneau = ?`,
      [id]
    );
    const panneau = (panneaux as any[])[0];
    if (!panneau) {
      return NextResponse.json({ error: 'Panneau introuvable' }, { status: 404 });
    }

    const [faces] = await pool.query(
      `SELECT
         f.id_face,
         f.id_panneau,
         f.id_type_face,
         f.orientation,
         f.est_active,
         tf.libelle AS type_face_libelle,
         tf.hauteur_cm,
         tf.largeur_cm,
         tf.est_scroller
       FROM face f
       LEFT JOIN type_face tf ON tf.id_type_face = f.id_type_face
       WHERE f.id_panneau = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...panneau,
        faces: faces as any[],
      },
    });
  } catch (error) {
    console.error('❌ Erreur GET panneau:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// ================= PUT : mettre à jour un panneau + ses faces =================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const id = parseInt(params.id, 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

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
      hauteur,
      largeur,
      dimension,
      faces,
      precision_gps,
    } = body;

    if (!nom) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ 1. Vérifier que le panneau existe
    const [exists] = await connection.query(
      'SELECT id_panneau FROM panneau WHERE id_panneau = ?',
      [id]
    );
    if ((exists as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'Panneau introuvable' }, { status: 404 });
    }

    // ✅ 2. Construire l'adresse complète si pas fournie
    let adresseComplete = adresse;
    if (!adresseComplete && pays_id && province_id && ville_id && commune_id) {
      const [paysResult] = await connection.query('SELECT nom FROM pays WHERE id_pays = ?', [pays_id]);
      const [provinceResult] = await connection.query('SELECT nom FROM province WHERE id_province = ?', [province_id]);
      const [villeResult] = await connection.query('SELECT nom FROM ville WHERE id_ville = ?', [ville_id]);
      const [communeResult] = await connection.query('SELECT nom FROM commune WHERE id_commune = ?', [commune_id]);

      const paysNom = (paysResult as any[])[0]?.nom || '';
      const provinceNom = (provinceResult as any[])[0]?.nom || '';
      const villeNom = (villeResult as any[])[0]?.nom || '';
      const communeNom = (communeResult as any[])[0]?.nom || '';
      adresseComplete = `${communeNom} / ${villeNom} / ${provinceNom} / ${paysNom}`;
    }

    const latVal = latitude != null && latitude !== '' ? latitude : null;
    const lngVal = longitude != null && longitude !== '' ? longitude : null;

    // ✅ 3. Mise à jour du panneau
    await connection.query(
      `UPDATE panneau SET
        nom = ?,
        adresse = ?,
        latitude = ?,
        longitude = ?,
        pays_id = ?,
        province_id = ?,
        ville_id = ?,
        commune_id = ?,
        precision_gps = ?,
        dimension = ?,
        updated_at = NOW()
       WHERE id_panneau = ?`,
      [
        nom,
        adresseComplete || null,
        latVal,
        lngVal,
        pays_id || null,
        province_id || null,
        ville_id || null,
        commune_id || null,
        precision_gps || 0,
        dimension || null,
        id,
      ]
    );

    // ✅ 4. Gestion des faces : UPDATE les existantes, INSERT les nouvelles, DELETE les retirées
    const incomingFaces = Array.isArray(faces) ? faces : [];

    // 4a. Récupérer les faces existantes en BD
    const [existingFaces] = await connection.query(
      'SELECT id_face FROM face WHERE id_panneau = ?',
      [id]
    );
    const existingIds = (existingFaces as any[]).map(f => f.id_face);

    // 4b. IDs des faces envoyées (celles qui existent déjà → à update)
    const incomingExistingIds = incomingFaces
      .filter(f => f.id_face != null)
      .map(f => f.id_face);

    // 4c. Supprimer les faces qui ne sont plus dans la liste
    const idsToDelete = existingIds.filter(fid => !incomingExistingIds.includes(fid));
    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => '?').join(',');
      await connection.query(
        `DELETE FROM face WHERE id_face IN (${placeholders})`,
        idsToDelete
      );
    }

    // 4d. UPDATE ou INSERT chaque face
    for (const face of incomingFaces) {
      const typeFaceId = face.type_face_id;
      if (!typeFaceId) continue;

      const orientation = face.orientation || 'NORD';

      if (face.id_face) {
        // UPDATE
        await connection.query(
          `UPDATE face SET
            id_type_face = ?,
            orientation = ?,
            est_active = 1
           WHERE id_face = ? AND id_panneau = ?`,
          [typeFaceId, orientation, face.id_face, id]
        );
      } else {
        // INSERT nouvelle face
        await connection.query(
          `INSERT INTO face
           (id_panneau, id_type_face, orientation, est_active)
           VALUES (?, ?, ?, 1)`,
          [id, typeFaceId, orientation]
        );
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      panneauId: id,
      message: 'Panneau mis à jour avec succès',
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur PUT panneau:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ================= DELETE : supprimer un panneau =================
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const id = parseInt(params.id, 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Supprimer d'abord les faces (contrainte FK)
    await connection.query('DELETE FROM face WHERE id_panneau = ?', [id]);
    await connection.query('DELETE FROM panneau WHERE id_panneau = ?', [id]);

    await connection.commit();
    connection.release();

    return NextResponse.json({ success: true, message: 'Panneau supprimé' });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur DELETE panneau:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}