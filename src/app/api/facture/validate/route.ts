// src/app/api/facture/validate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'default',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function getUserIdFromToken(request: NextRequest): number | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;
    return decoded.userId || decoded.id || null;
  } catch {
    return null;
  }
}

// ============================================================
// ✅ NORMALISATION DES STATUTS
// ============================================================

/** facture.statut → 'brouillon' | 'envoye' | 'paye' | 'annule' */
function normaliserStatutFacture(valeur: any, defaut: 'brouillon' | 'envoye' | 'paye' | 'annule' = 'brouillon'): 'brouillon' | 'envoye' | 'paye' | 'annule' {
  const val = String(valeur || defaut).trim().toLowerCase();
  const alias: Record<string, 'brouillon' | 'envoye' | 'paye' | 'annule'> = {
    brouillon: 'brouillon',
    envoye: 'envoye',
    paye: 'paye',
    annule: 'annule',
    // Compatibilité anciens statuts
    en_attente: 'brouillon',
    valide: 'envoye',
    payee: 'paye',
    rejetee: 'annule',
    annulee: 'annule',
  };
  return alias[val] || defaut;
}

/** facture_tranche.statut → 'en_attente' | 'paye' | 'retard' */
function normaliserStatutTranche(valeur: any, defaut: 'en_attente' | 'paye' | 'retard' = 'en_attente'): 'en_attente' | 'paye' | 'retard' {
  const val = String(valeur || defaut).trim().toLowerCase();
  const alias: Record<string, 'en_attente' | 'paye' | 'retard'> = {
    en_attente: 'en_attente',
    paye: 'paye',
    retard: 'retard',
    // Compatibilité
    payee: 'paye',
    valide: 'paye',
  };
  return alias[val] || defaut;
}

// ============================================================
// ✅ NORMALISATION DES MODES DE PAIEMENT (2 ENUM DIFFÉRENTS !)
// ============================================================

/**
 * facture.mode_paiement → UNIQUEMENT 'comptant' | 'tranche'
 * (c'est le mode GLOBAL de la facture, pas le mode de chaque tranche)
 */
function normaliserFactureModePaiement(valeur: any, defaut: 'comptant' | 'tranche' = 'comptant'): 'comptant' | 'tranche' {
  const val = String(valeur || defaut).trim().toLowerCase();
  const alias: Record<string, 'comptant' | 'tranche'> = {
    comptant: 'comptant',
    tranche: 'tranche',
    // Si l'utilisateur envoie un mode précis, on le convertit en 'tranche'
    especes: 'tranche',
    espece: 'tranche',
    cheque: 'tranche',
    virement: 'tranche',
    carte: 'tranche',
    mobile_money: 'tranche',
    credit: 'tranche',
  };
  return alias[val] || defaut;
}

/**
 * facture_tranche.mode_paiement → UNIQUEMENT les modes PRÉCIS
 * 'especes' | 'cheque' | 'virement' | 'carte' | 'mobile_money'
 */
function normaliserTrancheModePaiement(valeur: any, defaut: 'especes' | 'cheque' | 'virement' | 'carte' | 'mobile_money' = 'especes'): 'especes' | 'cheque' | 'virement' | 'carte' | 'mobile_money' {
  const val = String(valeur || defaut).trim().toLowerCase();
  const alias: Record<string, 'especes' | 'cheque' | 'virement' | 'carte' | 'mobile_money'> = {
    especes: 'especes',
    espece: 'especes',
    cheque: 'cheque',
    virement: 'virement',
    carte: 'carte',
    mobile_money: 'mobile_money',
    mobilemoney: 'mobile_money',
    // ⚠️ Si on reçoit 'comptant' ou 'tranche', on ne peut PAS les mettre ici
    // On utilise 'especes' par défaut (paiement le plus courant en RDC)
  };
  return alias[val] || defaut;
}

export async function POST(request: NextRequest) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const comptableId = getUserIdFromToken(request);
    console.log('🔑 Comptable ID:', comptableId);

    if (!comptableId) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Non authentifié' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id_facture,
      action,
      motif_rejet,
      montant_recu,
      mode_paiement,
      nombre_tranches,
    } = body;

    console.log('📥 Body reçu:', body);

    if (!id_facture) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'ID facture requis' },
        { status: 400 }
      );
    }

    if (!action || !['valider', 'rejeter'].includes(action)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Action non valide' },
        { status: 400 }
      );
    }

    // ✅ 1. Récupérer la facture
    const [factureRows] = await connection.query(
      `SELECT * FROM facture WHERE id_facture = ?`,
      [id_facture]
    );

    if ((factureRows as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, message: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    const facture = (factureRows as any[])[0];
    const statutActuel = facture.statut || '';
    const totalFacture = Number(facture.total_ttc || facture.total_ht || 0);

    // ✅ 2. Récupérer les réservations et faces liées
    const [lignesRows] = await connection.query(
      `SELECT id_reservation, id_face FROM facture_ligne WHERE id_facture = ?`,
      [id_facture]
    );

    const reservationIds = (lignesRows as any[])
      .map((l) => Number(l.id_reservation))
      .filter((id) => id > 0);
    const faceIds = (lignesRows as any[])
      .map((l) => Number(l.id_face))
      .filter((id) => id > 0);

    const uniqueReservationIds = [...new Set(reservationIds)];
    const uniqueFaceIds = [...new Set(faceIds)];

    console.log(`📋 Facture ${facture.numero_facture}`);
    console.log(`💰 Total: ${totalFacture}`);
    console.log(`📊 Réservations: ${uniqueReservationIds.length}`, uniqueReservationIds);
    console.log(`📊 Faces: ${uniqueFaceIds.length}`, uniqueFaceIds);

    // ============================================
    // ACTION : VALIDER
    // ============================================
    if (action === 'valider') {
      const montantPaye = Number(montant_recu) || 0;

      // ✅ Séparer les deux normalisations !
      const modePaiementFacture = normaliserFactureModePaiement(mode_paiement);
      const modePaiementTranche = normaliserTrancheModePaiement(mode_paiement);

      console.log(`💳 Mode paiement reçu: "${mode_paiement}"`);
      console.log(`   → facture.mode_paiement = "${modePaiementFacture}"`);
      console.log(`   → facture_tranche.mode_paiement = "${modePaiementTranche}"`);

      if (montantPaye <= 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, message: 'Montant reçu invalide' },
          { status: 400 }
        );
      }

      if (montantPaye > totalFacture) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, message: 'Le montant dépasse le total' },
          { status: 400 }
        );
      }

      // 1️⃣ Calcul du total déjà payé
      const [paymentsRows] = await connection.query(
        `SELECT COALESCE(SUM(montant), 0) as deja_paye FROM facture_tranche WHERE id_facture = ?`,
        [id_facture]
      );
      const dejaPaye = Number((paymentsRows as any[])[0]?.deja_paye || 0);
      const totalPayeApres = dejaPaye + montantPaye;

      // ✅ Normaliser le statut (facture) — 'paye' si totalement payé, sinon 'envoye'
      const statutBrut: 'paye' | 'envoye' = totalPayeApres >= totalFacture ? 'paye' : 'envoye';
      const nouveauStatut = normaliserStatutFacture(statutBrut);

      // ✅ Normaliser le statut (tranche) — toujours 'paye' car c'est un paiement effectué
      const statutTranche = normaliserStatutTranche('paye');

      console.log(
        `💰 Déjà payé: ${dejaPaye}, nouveau paiement: ${montantPaye}, total: ${totalPayeApres}, statut facture: ${nouveauStatut}, statut tranche: ${statutTranche}`
      );

      // 2️⃣ Enregistrer le paiement — AVEC LES BONNES VALEURS
      const [maxTranche] = await connection.query(
        `SELECT COALESCE(MAX(numero_tranche), 0) as max_num FROM facture_tranche WHERE id_facture = ?`,
        [id_facture]
      );
      const numeroTranche = Number((maxTranche as any[])[0]?.max_num || 0) + 1;

      await connection.query(
        `INSERT INTO facture_tranche 
         (id_facture, numero_tranche, montant, date_paiement, mode_paiement, statut, created_at)
         VALUES (?, ?, ?, NOW(), ?, ?, NOW())`,
        [
          id_facture,
          numeroTranche,
          montantPaye,
          modePaiementTranche,  // ✅ 'especes' | 'cheque' | ...
          statutTranche,         // ✅ 'en_attente' | 'paye' | 'retard'
        ]
      );
      console.log(`✅ Tranche ${numeroTranche} enregistrée avec mode "${modePaiementTranche}"`);

      // 3️⃣ Mettre à jour la facture — mode GLOBAL
      await connection.query(
        `UPDATE facture 
         SET statut = ?,
             mode_paiement = COALESCE(?, mode_paiement),
             nombre_tranches = COALESCE(?, nombre_tranches),
             id_comptable_validation = ?,
             date_validation = NOW(),
             updated_at = NOW()
         WHERE id_facture = ?`,
        [
          nouveauStatut,
          modePaiementFacture,  // ✅ 'comptant' | 'tranche'
          nombre_tranches,
          comptableId,
          id_facture,
        ]
      );
      console.log(`✅ Facture passée à ${nouveauStatut} (mode=${modePaiementFacture})`);

      // 4️⃣ ACTIVER les réservations
      if (uniqueReservationIds.length > 0) {
        const placeholders = uniqueReservationIds.map(() => '?').join(',');

        await connection.query(
          `UPDATE reservation 
           SET statut = 'ACTIVE',
               est_verrouille = 1,
               date_verrouillage = NOW(),
               id_chef_validation = ?,
               updated_at = NOW()
           WHERE id_reservation IN (${placeholders})`,
          [comptableId, ...uniqueReservationIds]
        );
        console.log(`✅ ${uniqueReservationIds.length} réservation(s) activée(s)`);

        await connection.query(
          `UPDATE ligne_reservation 
           SET statut_diffusion = 'ACTIVE',
               updated_at = NOW()
           WHERE id_reservation IN (${placeholders})`,
          uniqueReservationIds
        );
        console.log(`✅ Lignes de réservation activées`);

        if (uniqueFaceIds.length > 0) {
          const facePlaceholders = uniqueFaceIds.map(() => '?').join(',');
          await connection.query(
            `UPDATE face 
             SET est_active = 1,
                 updated_at = NOW()
             WHERE id_face IN (${facePlaceholders})`,
            uniqueFaceIds
          );
          console.log(`✅ ${uniqueFaceIds.length} face(s) activée(s)`);
        }
      }

      // 5️⃣ Historique facture
      await connection.query(
        `INSERT INTO facture_historique 
         (id_facture, action, ancien_statut, nouveau_statut, description, id_utilisateur, date_action)
         VALUES (?, 'VALIDATION', ?, ?, ?, ?, NOW())`,
        [
          id_facture,
          statutActuel || 'brouillon',
          nouveauStatut,
          `Facture ${nouveauStatut} - Paiement ${montantPaye} FC (${modePaiementTranche}) - ${uniqueReservationIds.length} résa activée(s)`,
          comptableId,
        ]
      );
      console.log(`✅ Historique enregistré`);

      // 6️⃣ Notifications
      try {
        await connection.query(
          `INSERT INTO notifications 
           (id_utilisateur, type, message, lien, est_lu, created_at)
           VALUES (?, 'facture_validee', ?, ?, 0, NOW())`,
          [
            facture.id_commercial,
            `✅ Facture ${facture.numero_facture} validée. ${uniqueReservationIds.length} réservation(s) activée(s).`,
            `/dashboard/commercial/factures/${id_facture}`,
          ]
        );
      } catch {
        console.log('⚠️ Table notifications non trouvée');
      }

      await connection.commit();
      connection.release();

      console.log('✅ VALIDATION RÉUSSIE');

      return NextResponse.json({
        success: true,
        message: `Facture ${facture.numero_facture} ${nouveauStatut}`,
        data: {
          id_facture,
          numero_facture: facture.numero_facture,
          statut: nouveauStatut,
          mode_paiement_facture: modePaiementFacture,
          mode_paiement_tranche: modePaiementTranche,
          montant_paye: montantPaye,
          total_paye: totalPayeApres,
          montant_total: totalFacture,
          reservations_activees: uniqueReservationIds.length,
          faces_activees: uniqueFaceIds.length,
        },
      });
    }

    // ============================================
    // ACTION : REJETER
    // ============================================
    if (action === 'rejeter') {
      if (!motif_rejet || motif_rejet.trim() === '') {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { success: false, message: 'Motif de rejet requis' },
          { status: 400 }
        );
      }

      // ✅ Normaliser le statut REJETEE
      const statutRejet = normaliserStatutFacture('annule');

      await connection.query(
        `UPDATE facture 
         SET statut = ?,
             id_comptable_validation = ?,
             motif_rejet = ?,
             date_rejet = NOW(),
             updated_at = NOW()
         WHERE id_facture = ?`,
        [statutRejet, comptableId, motif_rejet, id_facture]
      );

      if (uniqueReservationIds.length > 0) {
        const placeholders = uniqueReservationIds.map(() => '?').join(',');
        await connection.query(
          `UPDATE reservation 
           SET statut = 'brouillon',
               est_verrouille = 0,
               date_verrouillage = NULL,
               updated_at = NOW()
           WHERE id_reservation IN (${placeholders})`,
          uniqueReservationIds
        );
      }

      await connection.query(
        `INSERT INTO facture_historique 
         (id_facture, action, ancien_statut, nouveau_statut, description, id_utilisateur, date_action)
         VALUES (?, 'REJET', ?, ?, ?, ?, NOW())`,
        [
          id_facture,
          statutActuel || 'brouillon',
          statutRejet,
          `Facture rejetée: ${motif_rejet}`,
          comptableId,
        ]
      );

      await connection.commit();
      connection.release();

      return NextResponse.json({
        success: true,
        message: `Facture ${facture.numero_facture} rejetée`,
        data: {
          id_facture,
          numero_facture: facture.numero_facture,
          statut: statutRejet,
          motif_rejet,
        },
      });
    }

    await connection.rollback();
    connection.release();
    return NextResponse.json(
      { success: false, message: 'Action non traitée' },
      { status: 400 }
    );
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}
    connection.release();
    console.error('❌ Erreur validate:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Erreur lors de la validation',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}