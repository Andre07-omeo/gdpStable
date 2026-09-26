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

    // 🔒 SÉLECTION SELON LA NOUVELLE LOGIQUE
    const [candidates] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM reservation
       WHERE 
         (statut = 'En attente' 
          AND date_expiration IS NOT NULL 
          AND date_expiration < NOW())
         OR
         (statut IN ('Confirmée', 'ACTIVE', 'En cours')
          AND date_fin_campagne < CURDATE()
          AND (
            (photoCampagneUrl IS NOT NULL 
             AND validation_chef_commercial = 1 
             AND validation_superviseur = 1)
            OR
            (photoCampagneUrl IS NULL 
             AND (validation_chef_commercial = 1 OR validation_superviseur = 1))
          )
         )
       LIMIT ?`,
      [batchSize]
    );

    let terminees = 0;
    let expirees = 0;
    const details: any[] = [];

    for (const r of candidates) {
      const estEnAttenteExpiree =
        r.statut === 'En attente' &&
        r.date_expiration &&
        new Date(r.date_expiration) < new Date();

      let motifComplet: string;
      let statutFinal: string;

      if (estEnAttenteExpiree) {
        motifComplet = 'Échéance expirée — aucune validation comptable';
        statutFinal = 'Expirée';
        expirees++;
      } else {
        const aPhoto = !!r.photoCampagneUrl;
        motifComplet = aPhoto
          ? 'Campagne terminée — double validation (avec photo)'
          : 'Campagne terminée — validation unique (sans photo)';
        statutFinal = 'Terminée';
        terminees++;
      }

      // 1. Insérer dans l'historique
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

      // 2. Supprimer les lignes liées
      await connection.query(
        'DELETE FROM ligne_reservation WHERE id_reservation = ?',
        [r.id_reservation]
      );

      // 3. Supprimer la réservation
      await connection.query('DELETE FROM reservation WHERE id_reservation = ?', [
        r.id_reservation,
      ]);

      details.push({
        id: r.id_reservation,
        commande: r.numero_commande,
        motif: motifComplet,
      });
    }

    await connection.commit();

    console.log(`✅ Nettoyage OK — terminées: ${terminees}, expirées: ${expirees}`);

    return NextResponse.json({
      success: true,
      message: 'Nettoyage effectué',
      data: {
        terminees,
        expirees,
        total: terminees + expirees,
        details,
        traite_a: new Date().toISOString(),
        batch: batchSize,
      },
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    console.error('❌ Erreur nettoyage:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
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
              validation_chef_commercial, validation_superviseur,
              date_fin_campagne, date_expiration
       FROM reservation
       WHERE 
         (statut = 'En attente' AND date_expiration IS NOT NULL AND date_expiration < NOW())
         OR
         (
           statut IN ('Confirmée', 'ACTIVE', 'En cours')
           AND date_fin_campagne < CURDATE()
           AND (
             (photoCampagneUrl IS NOT NULL 
              AND validation_chef_commercial = 1 
              AND validation_superviseur = 1)
             OR
             (photoCampagneUrl IS NULL 
              AND (validation_chef_commercial = 1 OR validation_superviseur = 1))
           )
         )`
    );

    // Réservations EN ATTENTE de validation
    const [enAttente] = await connection.query<RowDataPacket[]>(
      `SELECT id_reservation, numero_commande, statut, photoCampagneUrl,
              validation_chef_commercial, validation_superviseur,
              date_fin_campagne
       FROM reservation
       WHERE 
         statut IN ('Confirmée', 'ACTIVE', 'En cours')
         AND date_fin_campagne < CURDATE()
         AND NOT (
           (photoCampagneUrl IS NOT NULL 
            AND validation_chef_commercial = 1 
            AND validation_superviseur = 1)
           OR
           (photoCampagneUrl IS NULL 
            AND (validation_chef_commercial = 1 OR validation_superviseur = 1))
         )`
    );

    const formatDetails = (rows: RowDataPacket[]) =>
      rows.map((r: any) => {
        const aPhoto = !!r.photoCampagneUrl;
        const chefOk = r.validation_chef_commercial === 1;
        const supervOk = r.validation_superviseur === 1;

        let raison = '';
        if (r.statut === 'En attente') {
          raison = 'Échéance dépassée — nettoyage direct';
        } else if (aPhoto) {
          if (chefOk && supervOk) raison = 'Double validation OK';
          else if (chefOk) raison = 'Manque validation superviseur';
          else if (supervOk) raison = 'Manque validation chef commercial';
          else raison = 'Manque les 2 validations';
        } else {
          if (chefOk || supervOk) raison = 'Validation unique OK';
          else raison = "Manque au moins une validation";
        }

        return {
          id: r.id_reservation,
          commande: r.numero_commande,
          statut: r.statut,
          a_photo: aPhoto,
          validations: {
            chef: chefOk,
            superviseur: supervOk,
            requises: aPhoto ? 2 : 1,
          },
          raison,
        };
      });

    return NextResponse.json({
      simulation: true,
      resume: {
        pretes_a_nettoyer: nettoyables.length,       // ✅ OK grâce à <RowDataPacket[]>
        en_attente_validation: enAttente.length,      // ✅ OK grâce à <RowDataPacket[]>
      },
      a_nettoyer: formatDetails(nettoyables),
      en_attente: formatDetails(enAttente),
      regles: {
        cas1: "En attente + échéance expirée → nettoyage direct",
        cas2: "Campagne terminée + photo → 2 validations obligatoires",
        cas3: "Campagne terminée + sans photo → 1 validation suffit",
        protection: "Réservation validée par la comptabilité → protégée jusqu'à fin de campagne",
      },
    });
  } catch (error) {
    console.error('❌ Erreur simulation:', error);
    return NextResponse.json(
      {
        error: 'Erreur simulation',
        details: error instanceof Error ? error.message : 'Erreur',
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}