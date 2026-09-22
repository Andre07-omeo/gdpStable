// src/app/api/panneaux/route.ts

import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    // ✅ Récupérer tous les panneaux avec SQL brut
    const [panneaux] = await connection.query(`
      SELECT 
        id_panneau,
        nom,
        adresse,
        latitude,
        longitude,
        etat,
        commune,
        province,
        ville,
        date_probleme,
        raison_probleme,
        created_at,
        updated_at
      FROM panneau
      ORDER BY nom
    `);

    // ✅ Récupérer les faces pour chaque panneau
    const [faces] = await connection.query(`
      SELECT 
        id_face,
        id_panneau,
        id_type_face,
        orientation,
        est_active,
        a_probleme,
        raison_probleme,
        date_probleme,
        created_at,
        updated_at
      FROM face
    `);

    connection.release();

    // ✅ Grouper les faces par panneau
    const facesByPanneau = (faces as any[]).reduce((acc, face) => {
      if (!acc[face.id_panneau]) {
        acc[face.id_panneau] = [];
      }
      acc[face.id_panneau].push({
        id_face: face.id_face,
        id_panneau: face.id_panneau,
        id_type_face: face.id_type_face,
        orientation: face.orientation,
        est_active: face.est_active === 1,
        a_probleme: face.a_probleme === 1,
        raison_probleme: face.raison_probleme,
        date_probleme: face.date_probleme,
        created_at: face.created_at,
        updated_at: face.updated_at
      });
      return acc;
    }, {});

    // ✅ Formater la réponse
    const formatted = (panneaux as any[]).map((p) => ({
      id_panneau: p.id_panneau,
      idPan: p.nom || `Panneau #${p.id_panneau}`,
      nom: p.nom || 'Sans nom',
      adresse: p.adresse || 'Adresse non définie',
      latitude: Number(p.latitude) || 0,
      longitude: Number(p.longitude) || 0,
      etat: p.etat || 'Actif',
      commune: p.commune || '',
      province: p.province || '',
      ville: p.ville || '',
      nbFaces: facesByPanneau[p.id_panneau]?.length || 0,
      faces: facesByPanneau[p.id_panneau] || [],
      raison_probleme: p.raison_probleme,
      date_probleme: p.date_probleme,
      created_at: p.created_at,
      updated_at: p.updated_at
    }));

    console.log(`✅ ${formatted.length} panneaux chargés`);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('❌ Erreur GET /api/panneaux:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des panneaux' },
      { status: 500 }
    );
  }
}