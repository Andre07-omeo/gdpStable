// src/app/api/facture/check-duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
});

export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const reservations = searchParams.get('reservations');

    if (!reservations) {
      connection.release();
      return NextResponse.json({ isDuplicate: false });
    }

    const ids = reservations
      .split(',')
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id) && id > 0);

    if (ids.length === 0) {
      connection.release();
      return NextResponse.json({ isDuplicate: false });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT DISTINCT 
         f.id_facture, 
         f.numero_facture, 
         f.statut, 
         f.date_creation,
         f.type_document
       FROM facture f
       INNER JOIN facture_ligne fl ON fl.id_facture = f.id_facture
       WHERE fl.id_reservation IN (${placeholders})
       ORDER BY f.date_creation DESC
       LIMIT 1`,
      ids
    );

    connection.release();

    if ((rows as any[]).length > 0) {
      const facture = (rows as any[])[0];
      const dateStr = facture.date_creation
        ? new Date(facture.date_creation).toLocaleDateString('fr-FR')
        : '';

      return NextResponse.json({
        isDuplicate: true,
        message: `Une facture existe déjà (N°: ${facture.numero_facture}, Statut: ${facture.statut || 'N/A'}, Date: ${dateStr})`,
        numero_facture: facture.numero_facture,
        id_facture: facture.id_facture,
        statut: facture.statut,
        date_creation: facture.date_creation,
        type_document: facture.type_document,
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error) {
    connection.release();
    console.error('❌ Erreur check-duplicate:', error);
    return NextResponse.json({ isDuplicate: false });
  }
}