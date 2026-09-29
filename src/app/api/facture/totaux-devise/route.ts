// src/app/api/facture/totaux-devise/route.ts
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
// GET - Totaux par devise
// ============================================
export async function GET(request: NextRequest) {
  const connection = await pool.getConnection();
  try {
    const { searchParams } = new URL(request.url);
    const commercialId = searchParams.get('commercial_id');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');

    // ✅ Totaux par devise (factures)
    let queryFactures = `
      SELECT 
        devise,
        COUNT(*) as nombre_factures,
        SUM(total_ht) as total_ht,
        SUM(total_ttc) as total_ttc
      FROM facture
      WHERE 1=1
    `;
    const paramsFactures: any[] = [];

    if (commercialId) {
      queryFactures += ` AND id_commercial = ?`;
      paramsFactures.push(parseInt(commercialId));
    }
    if (clientId) {
      queryFactures += ` AND id_client = ?`;
      paramsFactures.push(parseInt(clientId));
    }
    if (status) {
      queryFactures += ` AND statut = ?`;
      paramsFactures.push(status);
    }
    queryFactures += ` GROUP BY devise ORDER BY devise`;

    const [totauxFactures] = await connection.query(queryFactures, paramsFactures);

    // ✅ Totaux par devise (lignes)
    let queryLignes = `
      SELECT 
        fl.devise,
        COUNT(*) as nombre_lignes,
        SUM(fl.total_ligne) as total_lignes
      FROM facture_ligne fl
      INNER JOIN facture f ON fl.id_facture = f.id_facture
      WHERE 1=1
    `;
    const paramsLignes: any[] = [];

    if (commercialId) {
      queryLignes += ` AND f.id_commercial = ?`;
      paramsLignes.push(parseInt(commercialId));
    }
    if (clientId) {
      queryLignes += ` AND f.id_client = ?`;
      paramsLignes.push(parseInt(clientId));
    }
    if (status) {
      queryLignes += ` AND f.statut = ?`;
      paramsLignes.push(status);
    }
    queryLignes += ` GROUP BY fl.devise ORDER BY fl.devise`;

    const [totauxLignes] = await connection.query(queryLignes, paramsLignes);

    // ✅ Totaux combinés (colonnes séparées facture)
    let queryGlobal = `
      SELECT 
        COUNT(*) as nombre_total_factures,
        SUM(total_ht_cdf) as somme_ht_cdf,
        SUM(total_ht_usd) as somme_ht_usd,
        SUM(total_ttc_cdf) as somme_ttc_cdf,
        SUM(total_ttc_usd) as somme_ttc_usd
      FROM facture
      WHERE 1=1
    `;
    const paramsGlobal: any[] = [];

    if (commercialId) {
      queryGlobal += ` AND id_commercial = ?`;
      paramsGlobal.push(parseInt(commercialId));
    }
    if (clientId) {
      queryGlobal += ` AND id_client = ?`;
      paramsGlobal.push(parseInt(clientId));
    }
    if (status) {
      queryGlobal += ` AND statut = ?`;
      paramsGlobal.push(status);
    }

    const [totauxGlobal] = await connection.query(queryGlobal, paramsGlobal);

    connection.release();

    return NextResponse.json({
      success: true,
      data: {
        par_facture: totauxFactures,
        par_ligne: totauxLignes,
        global: (totauxGlobal as any[])[0] || {
          nombre_total_factures: 0,
          somme_ht_cdf: 0,
          somme_ht_usd: 0,
          somme_ttc_cdf: 0,
          somme_ttc_usd: 0,
        },
      },
    });
  } catch (error) {
    connection.release();
    console.error('❌ Erreur totaux-devise:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur lors du calcul des totaux' },
      { status: 500 }
    );
  }
}