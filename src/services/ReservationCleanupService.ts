// src/services/ReservationCleanupService.ts

import mysql from 'mysql2/promise';

// ============================================
// CONFIGURATION BASE DE DONNÉES
// ============================================
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000,
});

// ============================================
// TYPES
// ============================================
export interface CleanupResult {
  terminees: number;
  expirees: number;
  en_attente_validation: number;
  erreurs: number;
  details: Array<{
    id: number;
    commande: string;
    motif: string;
    raison?: string;
  }>;
}

export type CleanupCase = 1 | 2 | 3 | null;

interface CleanupCheck {
  ok: boolean;
  cas: CleanupCase;
  motif: string;
  raison: string;
}

// ============================================
// SERVICE
// ============================================
export class ReservationCleanupService {
  // ============================================
  // 🔍 HELPERS DE DATE
  // ============================================
  isCampaignFinished(dateFinCampagne: Date | string | null): boolean {
    if (!dateFinCampagne) return false;
    return new Date(dateFinCampagne) < new Date();
  }

  isExpirationPassed(dateExpiration: Date | string | null): boolean {
    if (!dateExpiration) return false;
    return new Date(dateExpiration) < new Date();
  }

  // ============================================
  // 🔒 RÈGLE MÉTIER : Peut-on nettoyer ?
  // ============================================
  /**
   * CAS 1 : Réservation "En attente" + échéance expirée
   *         → Nettoyage direct (jamais validée par la comptabilité)
   *
   * CAS 2 : Campagne terminée + AVEC photo
   *         → 2 validations obligatoires (chef ET superviseur)
   *
   * CAS 3 : Campagne terminée + SANS photo
   *         → 1 validation suffit (chef OU superviseur)
   *
   * ⚠️ Une réservation validée par la comptabilité (ACTIVE / Confirmée / En cours)
   *    ne peut être nettoyée QUE si la campagne est terminée.
   */
  canBeCleaned(reservation: any): CleanupCheck {
    const statut = reservation.statut;
    const aPhoto = !!reservation.photoCampagneUrl;
    const chefOk = reservation.validation_chef_commercial === 1;
    const supervOk = reservation.validation_superviseur === 1;
    const expirationPassee = this.isExpirationPassed(reservation.date_expiration);
    const campagneFinie = this.isCampaignFinished(reservation.date_fin_campagne);

    // ═══════════════════════════════════════════════════════
    // CAS 1 : En attente + échéance expirée
    //         → Nettoyage direct (non validée par la comptabilité)
    // ═══════════════════════════════════════════════════════
    if (statut === 'En attente' && expirationPassee) {
      return {
        ok: true,
        cas: 1,
        motif: 'expirée',
        raison: 'Échéance dépassée — non validée par la comptabilité',
      };
    }

    // ═══════════════════════════════════════════════════════
    // 🛡️ PROTECTION : Si la réservation a été validée par la
    //    comptabilité (ACTIVE / Confirmée / En cours), on ne la
    //    touche QUE si la campagne est terminée.
    // ═══════════════════════════════════════════════════════
    const estValideeComptable = ['Confirmée', 'ACTIVE', 'En cours'].includes(statut);

    if (!estValideeComptable) {
      return {
        ok: false,
        cas: null,
        motif: '',
        raison: `Statut "${statut}" non éligible au nettoyage`,
      };
    }

    // Si la campagne n'est pas encore terminée → on ne touche pas
    if (!campagneFinie) {
      return {
        ok: false,
        cas: null,
        motif: '',
        raison: 'Campagne encore active',
      };
    }

    // ═══════════════════════════════════════════════════════
    // CAS 2 : Campagne terminée AVEC photo → 2 validations
    // ═══════════════════════════════════════════════════════
    if (aPhoto) {
      if (chefOk && supervOk) {
        return {
          ok: true,
          cas: 2,
          motif: 'terminée',
          raison: 'Double validation OK (campagne terminée avec photo)',
        };
      }
      if (!chefOk && !supervOk) {
        return {
          ok: false,
          cas: 2,
          motif: '',
          raison: 'En attente des 2 validations (chef + superviseur)',
        };
      }
      if (chefOk && !supervOk) {
        return {
          ok: false,
          cas: 2,
          motif: '',
          raison: 'En attente validation superviseur',
        };
      }
      return {
        ok: false,
        cas: 2,
        motif: '',
        raison: 'En attente validation chef commercial',
      };
    }

    // ═══════════════════════════════════════════════════════
    // CAS 3 : Campagne terminée SANS photo → 1 validation
    // ═══════════════════════════════════════════════════════
    if (chefOk || supervOk) {
      return {
        ok: true,
        cas: 3,
        motif: 'terminée',
        raison: '1 validation suffit (campagne terminée sans photo)',
      };
    }

    return {
      ok: false,
      cas: 3,
      motif: '',
      raison: "En attente d'au moins une validation",
    };
  }

  // ============================================
  // 🧹 NETTOYAGE PAR BATCH
  // ============================================
  async cleanReservationsByBatch(batchSize: number = 50): Promise<CleanupResult> {
    const resultats: CleanupResult = {
      terminees: 0,
      expirees: 0,
      en_attente_validation: 0,
      erreurs: 0,
      details: [],
    };

    const connection = await pool.getConnection();

    try {
      const [reservations] = await connection.query(
        `SELECT * FROM reservation 
         WHERE statut NOT IN ('Terminée', 'Expirée')
         LIMIT ?`,
        [batchSize]
      );

      console.log(`📊 ${(reservations as any[]).length} réservation(s) à vérifier`);

      for (const reservation of reservations as any[]) {
        try {
          const check = this.canBeCleaned(reservation);

          if (!check.ok) {
            if (check.raison.toLowerCase().includes('attente')) {
              resultats.en_attente_validation++;
              resultats.details.push({
                id: reservation.id_reservation,
                commande: reservation.numero_commande || 'N/A',
                motif: 'En attente validation',
                raison: check.raison,
              });
            }
            console.log(
              `⏳ Réservation ${reservation.id_reservation} — ${check.raison}`
            );
            continue;
          }

          // ✅ Nettoyage autorisé
          const nouveauStatut = check.motif === 'terminée' ? 'Terminée' : 'Expirée';

          await this.moveReservation(
            connection,
            reservation,
            check.motif,
            nouveauStatut,
            resultats,
            check.cas
          );
        } catch (error) {
          console.error(
            `❌ Erreur réservation ${reservation.id_reservation}:`,
            error
          );
          resultats.erreurs++;
        }
      }

      console.log('📊 Résumé du nettoyage:', {
        terminees: resultats.terminees,
        expirees: resultats.expirees,
        en_attente_validation: resultats.en_attente_validation,
        erreurs: resultats.erreurs,
      });

      return resultats;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // 📦 DÉPLACE VERS L'HISTORIQUE + SUPPRIME
  // ============================================
  private async moveReservation(
    connection: any,
    reservation: any,
    motif: string,
    nouveauStatut: string,
    resultats: CleanupResult,
    cas: CleanupCase
  ): Promise<void> {
    const motifComplet =
      cas === 1
        ? 'Échéance expirée — aucune validation comptable'
        : `Campagne terminée — ${
            cas === 2 ? 'double validation (avec photo)' : 'validation unique (sans photo)'
          }`;

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        reservation.id_reservation,
        reservation.id_client,
        reservation.id_commercial,
        reservation.id_chef_validation,
        reservation.id_chef_commercial,
        reservation.id_superviseur,
        reservation.validation_chef_commercial,
        reservation.validation_superviseur,
        reservation.date_validation_chef,
        reservation.date_validation_superviseur,
        reservation.numero_commande,
        reservation.date_creation,
        reservation.date_debut_campagne,
        reservation.date_fin_campagne,
        reservation.date_expiration,
        reservation.statut,
        reservation.est_verrouille,
        reservation.date_verrouillage,
        reservation.notes,
        reservation.photoCampagneUrl,
        reservation.photo_metadata,
        reservation.photo_latitude,
        reservation.photo_longitude,
        reservation.date_upload_photo,
        motifComplet,
        reservation.statut,
        nouveauStatut,
      ]
    );

    // Nettoyer les lignes liées AVANT de supprimer la réservation
    await connection.query(
      'DELETE FROM ligne_reservation WHERE id_reservation = ?',
      [reservation.id_reservation]
    );

    await connection.query('DELETE FROM reservation WHERE id_reservation = ?', [
      reservation.id_reservation,
    ]);

    if (motif === 'terminée') resultats.terminees++;
    else resultats.expirees++;

    resultats.details.push({
      id: reservation.id_reservation,
      commande: reservation.numero_commande || 'N/A',
      motif: motifComplet,
    });

    console.log(
      `📦 Réservation ${reservation.id_reservation} nettoyée (${motifComplet})`
    );
  }
}

// ============================================
// INSTANCE PARTAGÉE
// ============================================
export const reservationCleanupService = new ReservationCleanupService();