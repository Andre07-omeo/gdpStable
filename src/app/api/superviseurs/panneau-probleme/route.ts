// src/app/api/superviseurs/panneau-probleme/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

// Configuration MySQL
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
    const { panneauId, faceId, raison, type } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (type === 'panneau') {
      // ✅ Mettre à jour le panneau
      await connection.query(
        `UPDATE panneau 
         SET raison_probleme = ?, 
             date_probleme = NOW() 
         WHERE id_panneau = ?`,
        [raison, panneauId]
      );
      
      // ✅ Marquer toutes les faces comme en problème
      await connection.query(
        `UPDATE face 
         SET est_active = 0, 
             a_probleme = 1, 
             raison_probleme = ?, 
             date_probleme = NOW() 
         WHERE id_panneau = ?`,
        [raison, panneauId]
      );
    } else if (type === 'face' && faceId) {
      // ✅ Marquer une face spécifique
      await connection.query(
        `UPDATE face 
         SET est_active = 0, 
             a_probleme = 1, 
             raison_probleme = ?, 
             date_probleme = NOW() 
         WHERE id_face = ?`,
        [raison, faceId]
      );
      
      // ✅ Vérifier si toutes les faces sont inactives
      const [faces] = await connection.query(
        `SELECT COUNT(*) as total, 
                SUM(est_active) as actives 
         FROM face 
         WHERE id_panneau = ?`,
        [panneauId]
      );
      
      const result = (faces as any[])[0];
      if (result && result.actives === 0 && result.total > 0) {
        await connection.query(
          `UPDATE panneau 
           SET raison_probleme = ?, 
               date_probleme = NOW() 
           WHERE id_panneau = ?`,
          [raison, panneauId]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function DELETE(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const { panneauId, faceId } = body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    if (faceId) {
      // ✅ Réactiver une face
      await connection.query(
        `UPDATE face 
         SET est_active = 1, 
             a_probleme = 0, 
             raison_probleme = NULL, 
             date_probleme = NULL 
         WHERE id_face = ?`,
        [faceId]
      );
      
      // ✅ Vérifier si toutes les faces sont actives
      const [faces] = await connection.query(
        `SELECT COUNT(*) as total, 
                SUM(est_active) as actives 
         FROM face 
         WHERE id_panneau = ?`,
        [panneauId]
      );
      
      const result = (faces as any[])[0];
      if (result && result.actives === result.total && result.total > 0) {
        await connection.query(
          `UPDATE panneau 
           SET raison_probleme = NULL, 
               date_probleme = NULL 
           WHERE id_panneau = ?`,
          [panneauId]
        );
      }
    } else {
      // ✅ Réactiver tout le panneau
      await connection.query(
        `UPDATE panneau 
         SET raison_probleme = NULL, 
             date_probleme = NULL 
         WHERE id_panneau = ?`,
        [panneauId]
      );
      
      await connection.query(
        `UPDATE face 
         SET est_active = 1, 
             a_probleme = 0, 
             raison_probleme = NULL, 
             date_probleme = NULL 
         WHERE id_panneau = ?`,
        [panneauId]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la résolution' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}