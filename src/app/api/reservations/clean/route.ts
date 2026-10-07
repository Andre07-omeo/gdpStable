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
// 🎯 RÈGLES DE NETTOYAGE
// ============================================
/**
 * ✅ RÈGLE 1 : Jamais validée + échéance dépassée → Expirée
 *    - id_chef_validation IS NULL/0
 *    - date_expiration IS NOT NULL
 *    - NOW() > date_expiration
 *
 * ✅ RÈGLE 2 : Campagne terminée + photo + validée → Terminée
 *    - photoCampagneUrl valide
 *    - id_chef_validation > 0
 *    - date_fin_campagne IS NOT NULL
 *    - CURDATE() > date_fin_campagne
 *
 * ⚠️ AUCUNE comparaison à '0000-00-00' (interdit en mode STRICT MySQL 8+)
 */
const CLEANUP_WHERE_CLAUSE = `
  (
    (id_chef_validation IS NULL OR id_chef_validation = 0)
    AND date_expiration IS NOT NULL
    AND NOW() > date_expiration
  )
  OR
  (
    photoCampagneUrl IS NOT NULL
    AND TRIM(photoCampagneUrl) <> ''
    AND LOWER(TRIM(photoCampagneUrl)) <> 'null'
    AND LOWER(TRIM(photoCampagneUrl)) <> 'undefined'
    AND id_chef_validation IS NOT NULL
    AND id_chef_validation > 0
    AND date_fin_campagne IS NOT NULL
    AND CURDATE() > date_fin_campagne
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
        const aPhoto =
          r.photoCampagneUrl &&
          String(r.photoCampagneUrl).trim() !== '' &&
          String(r.photoCampagneUrl).toLowerCase() !== 'null' &&
          String(r.photoCampagneUrl).toLowerCase() !== 'undefined';

        const aValidation =
          r.id_chef_validation !== null &&
          r.id_chef_validation !== undefined &&
          Number(r.id_chef_validation) > 0;

        // ✅ Vérifie juste que la date existe et est valide côté JS
        const expirationDepassee =
          r.date_expiration && new Date(r.date_expiration) < new Date();

        const campagneTerminee =
          r.date_fin_campagne && new Date(r.date_fin_campagne) < new Date();

        let motifComplet: string;
        let statutFinal: string;

        if (!aValidation && expirationDepassee) {
          motifComplet = 'Échéance expirée — aucune validation comptable';
          statutFinal = 'Expirée';
        } else if (aPhoto && aValidation && campagneTerminee) {
          motifComplet = 'Campagne terminée — validée avec photo';
          statutFinal = 'Terminée';
        } else {
          console.warn(
            `⚠️ Réservation ${r.id_reservation} matchée mais ne respecte pas les règles — SKIP`
          );
          continue;
        }

        // ============================================
        // 1. INSERT dans l'historique
        //    ⚠️ PAS de NULLIF, PAS de '0000-00-00'
        //    ⚠️ On ne copie PAS date_deplacement/motif_deplacement/ancien_statut/nouveau_statut
        //       car ces colonnes n'existent QUE dans historique_reservation.
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
          [motifComplet, statutFinal, r.id_reservation]
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
          motif: motifComplet,
          statut_final: statutFinal,
          a_photo: !!aPhoto,
          a_validation: !!aValidation,
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
      `SELECT id_reservation, numero_commande, statut, photoCampagneUrl,
              id_chef_validation, validation_chef_commercial, validation_superviseur,
              date_debut_campagne, date_fin_campagne, date_expiration
       FROM reservation
       WHERE ${CLEANUP_WHERE_CLAUSE}`
    );

    // Réservations EN ATTENTE
    const [enAttente] = await connection.query<RowDataPacket[]>(
      `SELECT id_reservation, numero_commande, statut, photoCampagneUrl,
              id_chef_validation, validation_chef_commercial, validation_superviseur,
              date_fin_campagne, date_expiration
       FROM reservation
       WHERE NOT (${CLEANUP_WHERE_CLAUSE})
         AND (
           (
             (id_chef_validation IS NULL OR id_chef_validation = 0)
             AND date_expiration IS NOT NULL
             AND NOW() <= date_expiration
           )
           OR
           (
             photoCampagneUrl IS NOT NULL
             AND TRIM(photoCampagneUrl) <> ''
             AND LOWER(TRIM(photoCampagneUrl)) <> 'null'
             AND id_chef_validation IS NOT NULL
             AND id_chef_validation > 0
             AND date_fin_campagne IS NOT NULL
             AND CURDATE() <= date_fin_campagne
           )
         )`
    );

    const formatDetails = (rows: RowDataPacket[]) =>
      rows.map((r: any) => {
        const aPhoto =
          r.photoCampagneUrl &&
          String(r.photoCampagneUrl).trim() !== '' &&
          String(r.photoCampagneUrl).toLowerCase() !== 'null';
        const aValidation =
          r.id_chef_validation !== null &&
          r.id_chef_validation !== undefined &&
          Number(r.id_chef_validation) > 0;

        let raison = '';
        if (!aValidation && r.date_expiration) {
          raison = `Pas de validation — expiration le ${r.date_expiration}`;
        } else if (aPhoto && aValidation && r.date_fin_campagne) {
          raison = `Validée avec photo — campagne termine le ${r.date_fin_campagne}`;
        } else {
          raison = 'Aucune règle de nettoyage applicable';
        }

        return {
          id: r.id_reservation,
          commande: r.numero_commande,
          statut: r.statut,
          a_photo: !!aPhoto,
          a_validation: !!aValidation,
          date_expiration: r.date_expiration,
          date_fin_campagne: r.date_fin_campagne,
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
          'NON validée par la compta (id_chef_validation NULL/0) + échéance dépassée → nettoyage direct',
        cas2:
          'Campagne terminée + photo présente + validée (id_chef_validation > 0) → nettoyage',
        protection:
          'Les statuts ne sont PLUS pris en compte : uniquement dates + validations',
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