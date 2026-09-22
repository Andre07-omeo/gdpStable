// src/app/api/facture/check-duplicate/route.ts
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservations = searchParams.get('reservations');
    
    if (!reservations) {
      return NextResponse.json({ 
        isDuplicate: false, 
        message: 'Aucune réservation spécifiée' 
      });
    }

    const reservationIds = reservations.split(',').map(id => parseInt(id.trim()));
    
    if (reservationIds.length === 0) {
      return NextResponse.json({ 
        isDuplicate: false, 
        message: 'Aucune réservation valide' 
      });
    }

    const connection = await pool.getConnection();

    // Vérifier si une facture existe déjà pour ces réservations
    const placeholders = reservationIds.map(() => '?').join(',');
    const [rows] = await connection.query(
      `SELECT DISTINCT f.id_facture, f.numero_facture, f.statut, f.created_at
       FROM facture f
       JOIN facture_ligne fl ON f.id_facture = fl.id_facture
       WHERE fl.id_reservation IN (${placeholders})
       AND f.statut NOT IN ('ANNULEE', 'BROUILLON')`,
      reservationIds
    );

    connection.release();

    if ((rows as any[]).length > 0) {
      const facture = (rows as any[])[0];
      return NextResponse.json({
        isDuplicate: true,
        message: `Une facture existe déjà (N°: ${facture.numero_facture}, Statut: ${facture.statut}, Date: ${new Date(facture.created_at).toLocaleDateString('fr-FR')})`,
        facture: facture
      });
    }

    return NextResponse.json({
      isDuplicate: false,
      message: 'Aucune facture existante pour ces réservations'
    });

  } catch (error) {
    console.error('Erreur vérification doublon:', error);
    return NextResponse.json(
      { isDuplicate: false, message: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}