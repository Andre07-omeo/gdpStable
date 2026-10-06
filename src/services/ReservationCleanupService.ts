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
// ✅ HELPER ULTIME : convertit n'importe quel format en YYYY-MM-DD[ HH:MM:SS]
// ============================================
const MOIS_FR: Record<string, string> = {
  janvier: '01',
  février: '02',
  fevrier: '02',
  mars: '03',
  avril: '04',
  mai: '05',
  juin: '06',
  juillet: '07',
  août: '08',
  aout: '08',
  septembre: '09',
  octobre: '10',
  novembre: '11',
  décembre: '12',
  decembre: '12',
};

function safeDate(value: any): string | null {
  if (value === null || value === undefined) return null;

  // Si c'est déjà un objet Date
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  const s = String(value).trim();
  if (!s) return null;

  // Valeurs pourries
  if (s === 'null' || s === 'undefined') return null;
  if (s === '0000-00-00' || s === '0000-00-00 00:00:00') return null;

  // Format ISO standard : 2026-09-30 ou 2026-09-30 22:32:22
  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(s)) {
    return s;
  }

  // Format ISO avec T : 2026-09-30T22:32:22
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 19).replace('T', ' ');
  }

  // Format FR avec slashes : 27/09/2026 ou 27/09/2026 22:32:22
  const frSlash = s.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (frSlash) {
    const [, j, m, a, h, mn, sec] = frSlash;
    const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
    if (h !== undefined) {
      return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
    }
    return date;
  }

  // Format FR avec mois en toutes lettres : 13 novembre 2026
  const frLettres = s.match(
    /^(\d{1,2})\s+([a-zéûôA-ZÉÛÔ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/i
  );
  if (frLettres) {
    const [, j, mois, a, h, mn, sec] = frLettres;
    const moisNum = MOIS_FR[mois.toLowerCase()];
    if (moisNum) {
      const date = `${a}-${moisNum}-${j.padStart(2, '0')}`;
      if (h !== undefined) {
        return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
      }
      return date;
    }
  }

  // Format FR avec tirets : 27-09-2026
  const frDash = s.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (frDash) {
    const [, j, m, a, h, mn, sec] = frDash;
    const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
    if (h !== undefined) {
      return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
    }
    return date;
  }

  // Essayer Date.parse en dernier recours
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 19).replace('T', ' ');
  }

  console.warn(`⚠️ safeDate: format non reconnu → null : "${s}"`);
  return null;
}

// ============================================
// SERVICE
// ============================================
export class ReservationCleanupService {
  // ============================================
  // 🔍 HELPERS DE DATE
  // ============================================
  isCampaignFinished(dateFinCampagne: Date | string | null): boolean {
    const safe = safeDate(dateFinCampagne);
    if (!safe) return false;
    return new Date(safe) < new Date();
  }

  isExpirationPassed(dateExpiration: Date | string | null): boolean {
    const safe = safeDate(dateExpiration);
    if (!safe) return false;
    return new Date(safe) < new Date();
  }

  // ============================================
  // 🔒 RÈGLE MÉTIER
  // ============================================
  canBeCleaned(reservation: any): CleanupCheck {
    const statut = reservation.statut;
    const aPhoto = !!reservation.photoCampagneUrl;
    const chefOk = reservation.validation_chef_commercial === 1;
    const supervOk = reservation.validation_superviseur === 1;
    const expirationPassee = this.isExpirationPassed(reservation.date_expiration);
    const campagneFinie = this.isCampaignFinished(reservation.date_fin_campagne);

    if (statut === 'En attente' && expirationPassee) {
      return {
        ok: true,
        cas: 1,
        motif: 'expirée',
        raison: 'Échéance dépassée — non validée par la comptabilité',
      };
    }

    const estValideeComptable = ['Confirmée', 'ACTIVE', 'En cours'].includes(statut);
    if (!estValideeComptable) {
      return {
        ok: false,
        cas: null,
        motif: '',
        raison: `Statut "${statut}" non éligible au nettoyage`,
      };
    }

    if (!campagneFinie) {
      return {
        ok: false,
        cas: null,
        motif: '',
        raison: 'Campagne encore active',
      };
    }

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
  // 🧹 NETTOYAGE
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

          const nouveauStatut = check.motif === 'terminée' ? 'Terminée' : 'Expirée';

          await this.moveReservation(
            connection,
            reservation,
            check.motif,
            nouveauStatut,
            resultats,
            check.cas
          );
        } catch (error: any) {
          console.error(
            `❌ Erreur réservation ${reservation.id_reservation}:`,
            error.message
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
            cas === 2
              ? 'double validation (avec photo)'
              : 'validation unique (sans photo)'
          }`;

    // ✅ Toutes les dates passent par safeDate
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
        safeDate(reservation.date_validation_chef),
        safeDate(reservation.date_validation_superviseur),
        reservation.numero_commande,
        safeDate(reservation.date_creation),
        safeDate(reservation.date_debut_campagne),
        safeDate(reservation.date_fin_campagne),
        safeDate(reservation.date_expiration),
        reservation.statut,
        reservation.est_verrouille,
        safeDate(reservation.date_verrouillage),
        reservation.notes,
        reservation.photoCampagneUrl,
        reservation.photo_metadata,
        reservation.photo_latitude,
        reservation.photo_longitude,
        safeDate(reservation.date_upload_photo),
        motifComplet,
        reservation.statut,
        nouveauStatut,
      ]
    );

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

export const reservationCleanupService = new ReservationCleanupService();