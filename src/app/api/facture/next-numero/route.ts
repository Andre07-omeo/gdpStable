// src/app/api/facture/next-numero/route.ts
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

// ============================================
// GET - Prochain numéro de proformat disponible (MAX + 1)
// ============================================
export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || 'PRO';

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefixFull = `${prefix}-${year}${month}${day}`;

    // ✅ Chercher le PLUS GRAND numéro existant pour ce préfixe (MAX + 1)
    const [rows] = await connection.query(
      `SELECT numero_facture 
       FROM facture 
       WHERE numero_facture LIKE ? 
       ORDER BY numero_facture DESC 
       LIMIT 1`,
      [`${prefixFull}-%`]
    );

    let prochainNumero = 1;
    let dernierNumero: string | null = null;

    if ((rows as any[]).length > 0) {
      dernierNumero = (rows as any[])[0].numero_facture as string;
      const match = dernierNumero.match(/-(\d+)$/);
      if (match) {
        prochainNumero = parseInt(match[1], 10) + 1;
      }
    }

    const nextNumero = `${prefixFull}-${String(prochainNumero).padStart(4, '0')}`;

    connection.release();

    return NextResponse.json({
      success: true,
      numero: nextNumero,
      dernier_numero: dernierNumero,
      prochain_numero: prochainNumero,
      prefix_utilise: prefixFull,
    });
  } catch (error) {
    connection.release();
    console.error('❌ Erreur next-numero:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du calcul du numéro' },
      { status: 500 }
    );
  }
}