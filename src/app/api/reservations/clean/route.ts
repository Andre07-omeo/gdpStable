// src/app/api/reservations/clean/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const CLEANUP_TOKEN =
  process.env.CLEANUP_API_TOKEN || 'mon-token-securise-123456';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// ============================================
// 🔐 AUTORISATION
// ============================================
function isAuthorized(request: NextRequest): boolean {
  const headerToken =
    request.headers.get('x-cleanup-token') ||
    request.headers.get('X-Cleanup-Token');

  if (headerToken && headerToken === CLEANUP_TOKEN) {
    console.log('✅ Nettoyage autorisé via header');
    return true;
  }

  try {
    const authToken = request.cookies.get('auth_token')?.value;
    if (authToken) {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (JWT_SECRET) {
        const decoded: any = jwt.verify(authToken, JWT_SECRET);
        const allowed = ['CHEF_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN', 'PDG', 'DG'];
        if (decoded && allowed.includes(decoded.profil)) {
          console.log(`✅ Nettoyage autorisé via session (${decoded.email})`);
          return true;
        }
      }
    }
  } catch {}
  return false;
}

// ============================================
// 🎯 RÈGLES DE NETTOYAGE (simplifiées)
// ============================================
/**
 * ✅ RÈGLE 1 : Échéance dépassée + non validée par la comptabilité
 *    - id_chef_validation IS NULL OR = 0
 *    - date_expiration < CURDATE()
 *
 * ✅ RÈGLE 2 : Campagne terminée
 *    - date_fin_campagne < CURDATE()
 *
 * ⚠️ Pas de condition sur photo ni sur validation_chef_commercial/superviseur.
 */
const CLEANUP_WHERE_CLAUSE = `
  (
    (id_chef_validation IS NULL OR id_chef_validation = 0)
    AND date_expiration IS NOT NULL
    AND DATE(date_expiration) < CURDATE()
  )
  OR
  (
    date_fin_campagne IS NOT NULL
    AND DATE(date_fin_campagne) < CURDATE()
  )
`;

// ============================================
// 🧹 POST : Nettoyage effectif
// ============================================
export async function POST(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;

  try {
    if (!isAuthorized(request)) {
      console.warn('⚠️ Nettoyage refusé (401)');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = Number(body.batch) || 50;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 🔒 SÉLECTION DES CANDIDATS
    const [candidates] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM reservation
       WHERE ${CLEANUP_WHERE_CLAUSE}
       ORDER BY date_expiration ASC, date_fin_campagne ASC
       LIMIT ?`,
      [batchSize]
    );

    let terminees = 0;
    let expirees = 0;
    const details: any[] = [];
    const errors: any[] = [];

    for (const r of candidates) {
      try {
        // ============================================
        // DÉTERMINER LE MOTIF + STATUT FINAL
        // ============================================
        const valideeCompta =
          r.id_chef_validation !== null &&
          r.id_chef_validation !== undefined &&
          Number(r.id_chef_validation) > 0;

        const expirationPassee =
          r.date_expiration &&
          new Date(String(r.date_expiration).slice(0, 10)) <
            new Date(new Date().toISOString().slice(0, 10));

        const campagneTerminee =
          r.date_fin_campagne &&
          new Date(String(r.date_fin_campagne).slice(0, 10)) <
            new Date(new Date().toISOString().slice(0, 10));

        let motif: string;
        let statutFinal: string;

        // Règle 1 : non validée + expirée
        if (!valideeCompta && expirationPassee) {
          motif = 'Expirée';
          statutFinal = 'Expirée';
        }
        // Règle 2 : campagne terminée
        else if (campagneTerminee) {
          motif = 'Terminée';
          statutFinal = 'Terminée';
        } else {
          console.warn(
            `⚠️ Réservation ${r.id_reservation} matchée mais ne respecte pas les règles — SKIP`
          );
          continue;
        }

        // ============================================
        // 1. INSERT dans l'historique (SELECT direct)
        // ============================================
        await connection.query(
          `INSERT INTO historique_reservation (
            id_reservation, id_client, id_commercial, id_chef_validation,
            id_chef_commercial, id_superviseur,
            validation_chef_commercial, validation_superviseur,
            date_validation_chef, date_validation_superviseur,
            numero_commande, date_creation, date_debut_campagne, date_fin_campagne,
            date_expiration, statut, est_verrouille, date_verrouillage,
            notes, photoCampagneUrl, photo_metadata,
            photo_latitude, photo_longitude, date_upload_photo,
            date_deplacement, motif_deplacement, ancien_statut, nouveau_statut
          )
          SELECT 
            id_reservation, id_client, id_commercial, id_chef_validation,
            id_chef_commercial, id_superviseur,
            validation_chef_commercial, validation_superviseur,
            date_validation_chef, date_validation_superviseur,
            numero_commande, date_creation, date_debut_campagne, date_fin_campagne,
            date_expiration, statut, est_verrouille, date_verrouillage,
            notes, photoCampagneUrl, photo_metadata,
            photo_latitude, photo_longitude, date_upload_photo,
            NOW(), ?, statut, ?
          FROM reservation WHERE id_reservation = ?`,
          [motif, statutFinal, r.id_reservation]
        );

        // ============================================
        // 2. Supprimer les lignes liées
        // ============================================
        await connection.query(
          'DELETE FROM ligne_reservation WHERE id_reservation = ?',
          [r.id_reservation]
        );

        // ============================================
        // 3. Supprimer la réservation
        // ============================================
        await connection.query(
          'DELETE FROM reservation WHERE id_reservation = ?',
          [r.id_reservation]
        );

        // ✅ Compteurs
        if (statutFinal === 'Terminée') terminees++;
        else if (statutFinal === 'Expirée') expirees++;

        details.push({
          id: r.id_reservation,
          commande: r.numero_commande,
          motif,
          statut_final: statutFinal,
        });
      } catch (errResa: any) {
        console.error(
          `❌ Erreur nettoyage réservation ${r.id_reservation}:`,
          errResa.message || errResa
        );
        errors.push({
          id: r.id_reservation,
          numero_commande: r.numero_commande,
          error: errResa.message || String(errResa),
          code: errResa.code || null,
        });
      }
    }

    await connection.commit();

    console.log(
      `✅ Nettoyage OK — terminées: ${terminees}, expirées: ${expirees}, erreurs: ${errors.length}`
    );

    return NextResponse.json({
      success: true,
      message: 'Nettoyage effectué',
      data: {
        terminees,
        expirees,
        total: terminees + expirees,
        erreurs: errors.length,
        details,
        errors: errors.length > 0 ? errors : undefined,
        traite_a: new Date().toISOString(),
        batch: batchSize,
      },
    });
  } catch (error: any) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error('❌ Erreur nettoyage:', error.message || error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage',
        details: error.message || 'Erreur inconnue',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// ============================================
// 🔍 GET : Simulation (sans modification)
// ============================================
export async function GET(request: NextRequest) {
  let connection: mysql.PoolConnection | null = null;

  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    connection = await pool.getConnection();

    // Réservations NETTOYABLES
    const [nettoyables] = await connection.query<RowDataPacket[]>(
      `SELECT id_reservation, numero_commande, statut,
              id_chef_validation,
              date_debut_campagne, date_fin_campagne, date_expiration
       FROM reservation
       WHERE ${CLEANUP_WHERE_CLAUSE}`
    );

    // Réservations EN ATTENTE (ni expirées, ni terminées)
    const [enAttente] = await connection.query<RowDataPacket[]>(
      `SELECT id_reservation, numero_commande, statut,
              id_chef_validation,
              date_fin_campagne, date_expiration
       FROM reservation
       WHERE NOT (${CLEANUP_WHERE_CLAUSE})`
    );

    const formatDetails = (rows: RowDataPacket[]) =>
      rows.map((r: any) => {
        const valideeCompta =
          r.id_chef_validation !== null &&
          r.id_chef_validation !== undefined &&
          Number(r.id_chef_validation) > 0;

        const expirationPassee =
          r.date_expiration &&
          new Date(String(r.date_expiration).slice(0, 10)) <
            new Date(new Date().toISOString().slice(0, 10));

        const campagneTerminee =
          r.date_fin_campagne &&
          new Date(String(r.date_fin_campagne).slice(0, 10)) <
            new Date(new Date().toISOString().slice(0, 10));

        let raison = '';
        let motif = '';

        if (!valideeCompta && expirationPassee) {
          raison = `Échéance dépassée (${r.date_expiration}) et non validée`;
          motif = 'Expirée';
        } else if (campagneTerminee) {
          raison = `Campagne terminée (${r.date_fin_campagne})`;
          motif = 'Terminée';
        } else {
          raison = 'Aucune règle de nettoyage applicable';
        }

        return {
          id: r.id_reservation,
          commande: r.numero_commande,
          statut: r.statut,
          validee_compta: valideeCompta,
          date_expiration: r.date_expiration,
          date_fin_campagne: r.date_fin_campagne,
          motif,
          raison,
        };
      });

    return NextResponse.json({
      simulation: true,
      resume: {
        pretes_a_nettoyer: nettoyables.length,
        en_attente: enAttente.length,
      },
      a_nettoyer: formatDetails(nettoyables),
      en_attente: formatDetails(enAttente),
      regles: {
        cas1:
          'Expirée : date_expiration < aujourd\'hui ET non validée par la comptabilité',
        cas2:
          'Terminée : date_fin_campagne < aujourd\'hui',
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur simulation:', error.message || error);
    return NextResponse.json(
      {
        error: 'Erreur simulation',
        details: error.message || 'Erreur',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}