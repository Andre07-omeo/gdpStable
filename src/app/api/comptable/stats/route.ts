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
  userId: number; profil: string; id_profil: number;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret') as any;
    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
      id_profil: decoded.id_profil,
    };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getUserFromToken(request);
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const connection = await pool.getConnection();

    // ══════════════════════════════════════════════════════════
    // 1. STATISTIQUES GLOBALES
    // ══════════════════════════════════════════════════════════
    const [statsGlobales] = await connection.query(`
      SELECT 
        COUNT(*) AS total_factures,
        COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS en_attente,
        COALESCE(SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END), 0) AS validees,
        COALESCE(SUM(CASE WHEN statut = 'REJETEE' THEN 1 ELSE 0 END), 0) AS rejetees,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN 1 ELSE 0 END), 0) AS payees,
        COALESCE(SUM(total_ttc), 0) AS total_ttc_global,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN total_ttc ELSE 0 END), 0) AS total_paye_global,
        COALESCE(SUM(CASE WHEN statut IN ('EN_ATTENTE', 'VALIDE') THEN total_ttc ELSE 0 END), 0) AS total_restant_global
      FROM facture
    `);

    // ══════════════════════════════════════════════════════════
    // 2. STATISTIQUES DU MOIS
    // ══════════════════════════════════════════════════════════
    const [statsMois] = await connection.query(`
      SELECT 
        COUNT(*) AS total_factures_mois,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN 1 ELSE 0 END), 0) AS payees_mois,
        COALESCE(SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END), 0) AS validees_mois,
        COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS en_attente_mois,
        COALESCE(SUM(CASE WHEN statut = 'REJETEE' THEN 1 ELSE 0 END), 0) AS rejetees_mois,
        COALESCE(SUM(total_ttc), 0) AS total_ttc_mois,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN total_ttc ELSE 0 END), 0) AS total_paye_mois,
        COALESCE(SUM(CASE WHEN statut IN ('EN_ATTENTE', 'VALIDE') THEN total_ttc ELSE 0 END), 0) AS total_restant_mois
      FROM facture
      WHERE MONTH(date_creation) = MONTH(CURDATE()) AND YEAR(date_creation) = YEAR(CURDATE())
    `);

    // ══════════════════════════════════════════════════════════
    // 3. DEVISE
    // ══════════════════════════════════════════════════════════
    const [statsDevise] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN f.notes LIKE '%USD%' OR f.notes LIKE '%dollar%' THEN ft.montant ELSE 0 END), 0) AS total_usd,
        COALESCE(SUM(CASE WHEN f.notes NOT LIKE '%USD%' AND f.notes NOT LIKE '%dollar%' THEN ft.montant ELSE 0 END), 0) AS total_fc
      FROM facture_tranche ft
      INNER JOIN facture f ON ft.id_facture = f.id_facture
      WHERE ft.statut = 'paye'
    `);

    // ══════════════════════════════════════════════════════════
    // 4. 📈 ÉVOLUTION MENSUELLE (12 derniers mois)
    // ══════════════════════════════════════════════════════════
    const [evolutionMensuelle] = await connection.query(`
      SELECT 
        DATE_FORMAT(date_creation, '%Y-%m') AS mois,
        DATE_FORMAT(date_creation, '%b %Y') AS mois_label,
        COUNT(*) AS total_factures,
        COALESCE(SUM(total_ttc), 0) AS total_ttc,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN total_ttc ELSE 0 END), 0) AS total_paye,
        COALESCE(SUM(CASE WHEN statut IN ('EN_ATTENTE', 'VALIDE') THEN total_ttc ELSE 0 END), 0) AS total_restant,
        COALESCE(SUM(CASE WHEN statut = 'PAYEE' THEN 1 ELSE 0 END), 0) AS nb_payees,
        COALESCE(SUM(CASE WHEN statut = 'VALIDE' THEN 1 ELSE 0 END), 0) AS nb_validees,
        COALESCE(SUM(CASE WHEN statut = 'REJETEE' THEN 1 ELSE 0 END), 0) AS nb_rejetees,
        COALESCE(SUM(CASE WHEN statut = 'EN_ATTENTE' THEN 1 ELSE 0 END), 0) AS nb_en_attente
      FROM facture
      WHERE date_creation >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(date_creation, '%Y-%m'), DATE_FORMAT(date_creation, '%b %Y')
      ORDER BY mois ASC
    `);

    // ══════════════════════════════════════════════════════════
    // 5. 📊 RÉPARTITION PAR STATUT (pour camembert)
    // ══════════════════════════════════════════════════════════
    const [repartitionStatut] = await connection.query(`
      SELECT 
        statut,
        COUNT(*) AS nombre,
        COALESCE(SUM(total_ttc), 0) AS montant
      FROM facture
      GROUP BY statut
    `);

    // ══════════════════════════════════════════════════════════
    // 6. ☁️ NUAGE DE POINTS : Montant facture vs Délai de paiement
    // ══════════════════════════════════════════════════════════
    const [nuagePoints] = await connection.query(`
      SELECT 
        f.numero_facture,
        f.total_ttc,
        DATEDIFF(
          COALESCE(
            (SELECT MAX(ft.date_paiement) FROM facture_tranche ft 
             WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'),
            CURDATE()
          ),
          f.date_creation
        ) AS delai_jours,
        f.statut,
        c.raison_sociale AS client_nom
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      WHERE f.total_ttc > 0
      ORDER BY f.date_creation DESC
      LIMIT 100
    `);

    // ══════════════════════════════════════════════════════════
    // 7. 🏆 TOP 5 CLIENTS PAR CHIFFRE D'AFFAIRES
    // ══════════════════════════════════════════════════════════
    const [topClients] = await connection.query(`
      SELECT 
        c.raison_sociale AS client,
        COUNT(*) AS nb_factures,
        COALESCE(SUM(f.total_ttc), 0) AS total_ttc,
        COALESCE(SUM(CASE WHEN f.statut = 'PAYEE' THEN f.total_ttc ELSE 0 END), 0) AS total_paye
      FROM facture f
      INNER JOIN client c ON f.id_client = c.id_client
      GROUP BY c.id_client, c.raison_sociale
      ORDER BY total_ttc DESC
      LIMIT 5
    `);

    // ══════════════════════════════════════════════════════════
    // 8. 📅 ÉCHÉANCES À VENIR (7/15/30 jours)
    // ══════════════════════════════════════════════════════════
    const [echeancesAVenir] = await connection.query(`
      SELECT 
        CASE 
          WHEN DATEDIFF(date_echeance, CURDATE()) <= 0 THEN 'En retard'
          WHEN DATEDIFF(date_echeance, CURDATE()) <= 7 THEN '0-7 jours'
          WHEN DATEDIFF(date_echeance, CURDATE()) <= 15 THEN '8-15 jours'
          WHEN DATEDIFF(date_echeance, CURDATE()) <= 30 THEN '16-30 jours'
          ELSE '> 30 jours'
        END AS tranche,
        COUNT(*) AS nombre,
        COALESCE(SUM(total_ttc), 0) AS montant
      FROM facture
      WHERE statut IN ('EN_ATTENTE', 'VALIDE')
      GROUP BY tranche
    `);

    // ══════════════════════════════════════════════════════════
    // 9. LISTES (dernières factures / en attente / toutes)
    // ══════════════════════════════════════════════════════════
    const factureSelectQuery = `
      SELECT 
        f.id_facture, f.numero_facture, f.statut, f.total_ttc, f.total_ht,
        f.date_creation, f.created_at, f.date_echeance, f.motif_rejet,
        c.raison_sociale AS client_nom,
        u.nom AS commercial_nom, u.prenom AS commercial_prenom,
        COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) AS montant_paye
      FROM facture f
      LEFT JOIN client c ON f.id_client = c.id_client
      LEFT JOIN user u ON f.id_commercial = u.id_user
    `;

    const [dernieresFactures] = await connection.query(
      `${factureSelectQuery} ORDER BY f.date_creation DESC LIMIT 5`
    );

    const [facturesEnAttente] = await connection.query(`
      ${factureSelectQuery}
      WHERE f.statut IN ('EN_ATTENTE', 'VALIDE')
        AND COALESCE(
          (SELECT SUM(ft.montant) FROM facture_tranche ft 
           WHERE ft.id_facture = f.id_facture AND ft.statut = 'paye'), 0
        ) < f.total_ttc
      ORDER BY f.date_creation DESC
    `);

    const [toutesFactures] = await connection.query(
      `${factureSelectQuery} ORDER BY f.date_creation DESC`
    );

    connection.release();

    const stats = statsGlobales as any[];
    const statsM = statsMois as any[];
    const statsD = statsDevise as any[];

    return NextResponse.json({
      success: true,
      data: {
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
        devise: {
          total_fc: Number(statsD[0]?.total_fc || 0),
          total_usd: Number(statsD[0]?.total_usd || 0),
        },
        // ✅ Nouvelles données pour graphiques
        evolutionMensuelle: Array.isArray(evolutionMensuelle) ? evolutionMensuelle : [],
        repartitionStatut: Array.isArray(repartitionStatut) ? repartitionStatut : [],
        nuagePoints: Array.isArray(nuagePoints) ? nuagePoints : [],
        topClients: Array.isArray(topClients) ? topClients : [],
        echeancesAVenir: Array.isArray(echeancesAVenir) ? echeancesAVenir : [],
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