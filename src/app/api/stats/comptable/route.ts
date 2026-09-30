// src/app/api/comptable/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

function getUserFromToken(request: NextRequest): {
  userId: number;
  profil: string;
  id_profil: number;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;

    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
      id_profil: decoded.id_profil,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromToken(request);

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const connection = await pool.getConnection();

    // ============================================================
    // 1. STATISTIQUES GLOBALES DES FACTURES
    // ============================================================
    const [statsGlobales] = await connection.query(`
      SELECT 
        COUNT(*) AS total_factures,
        COALESCE(SUM(CASE WHEN statut = 'brouillon' THEN 1 ELSE 0 END), 0) AS en_attente,
        COALESCE(SUM(CASE WHEN statut = 'envoye' THEN 1 ELSE 0 END), 0) AS validees,
        COALESCE(SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END), 0) AS rejetees,
        COALESCE(SUM(CASE WHEN statut = 'paye' THEN 1 ELSE 0 END), 0) AS payees,
        COALESCE(SUM(total_ttc), 0) AS total_ttc_global,
        COALESCE(SUM(CASE WHEN statut = 'paye' THEN total_ttc ELSE 0 END), 0) AS total_paye_global,
        COALESCE(SUM(CASE WHEN statut IN ('brouillon', 'envoye') THEN total_ttc ELSE 0 END), 0) AS total_restant_global
      FROM facture
    `);

    // ============================================================
    // 2. STATISTIQUES DU MOIS EN COURS
    // ============================================================
    const [statsMois] = await connection.query(`
      SELECT 
        COUNT(*) AS total_factures_mois,
        COALESCE(SUM(CASE WHEN statut = 'paye' THEN 1 ELSE 0 END), 0) AS payees_mois,
        COALESCE(SUM(CASE WHEN statut = 'envoye' THEN 1 ELSE 0 END), 0) AS validees_mois,
        COALESCE(SUM(CASE WHEN statut = 'brouillon' THEN 1 ELSE 0 END), 0) AS en_attente_mois,
        COALESCE(SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END), 0) AS rejetees_mois,
        COALESCE(SUM(total_ttc), 0) AS total_ttc_mois,
        COALESCE(SUM(CASE WHEN statut = 'paye' THEN total_ttc ELSE 0 END), 0) AS total_paye_mois,
        COALESCE(SUM(CASE WHEN statut IN ('brouillon', 'envoye') THEN total_ttc ELSE 0 END), 0) AS total_restant_mois
      FROM facture
      WHERE MONTH(date_creation) = MONTH(CURDATE())
        AND YEAR(date_creation) = YEAR(CURDATE())
    `);

    // ============================================================
    // 3. STATISTIQUES PAR DEVISE (FC et USD)
    // On sépare selon le champ 'notes' ou une colonne dédiée
    // Pour l'instant, on considère que tout est en FC par défaut
    // À adapter selon votre structure réelle
    // ============================================================
    
    // Récupérer les totaux par devise depuis les tranches payées
    const [statsDevise] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN f.notes LIKE '%USD%' OR f.notes LIKE '%dollar%' THEN ft.montant ELSE 0 END), 0) AS total_usd,
        COALESCE(SUM(CASE WHEN f.notes NOT LIKE '%USD%' AND f.notes NOT LIKE '%dollar%' THEN ft.montant ELSE 0 END), 0) AS total_fc
      FROM facture_tranche ft
      INNER JOIN facture f ON ft.id_facture = f.id_facture
      WHERE ft.statut = 'paye'
    `);

    // ============================================================
    // 4. DERNIÈRES FACTURES (5 plus récentes)
    // ============================================================
    const [dernieresFactures] = await connection.query(`
      SELECT 
        f.id_facture,
        f.numero_facture,
        f.statut,
        f.total_ttc,
        f.total_ht,
        f.date_creation,
        f.created_at,
        f.date_echeance,
        f.motif_rejet,
        c.raison_sociale AS client_nom,
        u.nom AS commercial_nom,
        u.prenom AS commercial_prenom,
        COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) AS montant_paye
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      LEFT JOIN user u ON f.id_commercial = u.id_user
      ORDER BY f.date_creation DESC
      LIMIT 5
    `);

    // ============================================================
    // 5. FACTURES EN ATTENTE DE PAIEMENT (pour l'onglet dédié)
    // ============================================================
    const [facturesEnAttente] = await connection.query(`
      SELECT 
        f.id_facture,
        f.numero_facture,
        f.statut,
        f.total_ttc,
        f.total_ht,
        f.date_creation,
        f.created_at,
        f.date_echeance,
        f.motif_rejet,
        c.raison_sociale AS client_nom,
        u.nom AS commercial_nom,
        u.prenom AS commercial_prenom,
        COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) AS montant_paye
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      LEFT JOIN user u ON f.id_commercial = u.id_user
      WHERE f.statut IN ('brouillon', 'envoye')
        AND COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) < f.total_ttc
      ORDER BY f.date_creation DESC
    `);

    // ============================================================
    // 6. TOUTES LES FACTURES (pour l'onglet dédié)
    // ============================================================
    const [toutesFactures] = await connection.query(`
      SELECT 
        f.id_facture,
        f.numero_facture,
        f.statut,
        f.total_ttc,
        f.total_ht,
        f.date_creation,
        f.created_at,
        f.date_echeance,
        f.motif_rejet,
        c.raison_sociale AS client_nom,
        u.nom AS commercial_nom,
        u.prenom AS commercial_prenom,
        COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) AS montant_paye
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      LEFT JOIN user u ON f.id_commercial = u.id_user
      ORDER BY f.date_creation DESC
    `);

    connection.release();

    const stats = statsGlobales as any[];
    const statsM = statsMois as any[];
    const statsD = statsDevise as any[];

    return NextResponse.json({
      success: true,
      data: {
        // Statistiques globales
        global: {
          total_factures: Number(stats[0]?.total_factures || 0),
          en_attente: Number(stats[0]?.en_attente || 0),
          validees: Number(stats[0]?.validees || 0),
          rejetees: Number(stats[0]?.rejetees || 0),
          payees: Number(stats[0]?.payees || 0),
          total_ttc: Number(stats[0]?.total_ttc_global || 0),
          total_paye: Number(stats[0]?.total_paye_global || 0),
          total_restant: Number(stats[0]?.total_restant_global || 0),
        },
        // Statistiques du mois en cours
        mois: {
          total_factures: Number(statsM[0]?.total_factures_mois || 0),
          payees: Number(statsM[0]?.payees_mois || 0),
          validees: Number(statsM[0]?.validees_mois || 0),
          en_attente: Number(statsM[0]?.en_attente_mois || 0),
          rejetees: Number(statsM[0]?.rejetees_mois || 0),
          total_ttc: Number(statsM[0]?.total_ttc_mois || 0),
          total_paye: Number(statsM[0]?.total_paye_mois || 0),
          total_restant: Number(statsM[0]?.total_restant_mois || 0),
        },
        // Statistiques par devise
        devise: {
          total_fc: Number(statsD[0]?.total_fc || 0),
          total_usd: Number(statsD[0]?.total_usd || 0),
        },
        // Listes
        dernieresFactures: Array.isArray(dernieresFactures) ? dernieresFactures : [],
        facturesEnAttente: Array.isArray(facturesEnAttente) ? facturesEnAttente : [],
        toutesFactures: Array.isArray(toutesFactures) ? toutesFactures : [],
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur GET stats comptable:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}