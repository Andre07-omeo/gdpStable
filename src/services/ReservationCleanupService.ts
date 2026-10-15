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
  erreurs: number;
  details: Array<{
    id: number;
    commande: string;
    motif: string;
    nouveau_statut: string;
  }>;
}

// ============================================
// ✅ HELPER : convertit n'importe quel format en YYYY-MM-DD[ HH:MM:SS]
// ============================================
const MOIS_FR: Record<string, string> = {
  janvier: '01', février: '02', fevrier: '02',
  mars: '03', avril: '04', mai: '05', juin: '06',
  juillet: '07', août: '08', aout: '08',
  septembre: '09', octobre: '10',
  novembre: '11', décembre: '12', decembre: '12',
};

function safeDate(value: any): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  const s = String(value).trim();
  if (!s) return null;
  if (s === 'null' || s === 'undefined') return null;
  if (s === '0000-00-00' || s === '0000-00-00 00:00:00') return null;

  if (/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 19).replace('T', ' ');
  }

  const frSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (frSlash) {
    const [, j, m, a, h, mn, sec] = frSlash;
    const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
    if (h !== undefined) return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
    return date;
  }

  const frLettres = s.match(/^(\d{1,2})\s+([a-zéûôA-ZÉÛÔ]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/i);
  if (frLettres) {
    const [, j, mois, a, h, mn, sec] = frLettres;
    const moisNum = MOIS_FR[mois.toLowerCase()];
    if (moisNum) {
      const date = `${a}-${moisNum}-${j.padStart(2, '0')}`;
      if (h !== undefined) return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
      return date;
    }
  }

  const frDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (frDash) {
    const [, j, m, a, h, mn, sec] = frDash;
    const date = `${a}-${m.padStart(2, '0')}-${j.padStart(2, '0')}`;
    if (h !== undefined) return `${date} ${h.padStart(2, '0')}:${mn}:${sec ?? '00'}`;
    return date;
  }

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
  /** La date d'expiration est-elle dépassée ? */
  isExpirationPassed(dateExpiration: Date | string | null): boolean {
    const safe = safeDate(dateExpiration);
    if (!safe) return false;
    // Comparaison sur la date seule (pas l'heure)
    const exp = new Date(safe);
    const today = new Date();
    exp.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return exp < today;
  }

  /** La campagne est-elle terminée ? */
  isCampaignFinished(dateFinCampagne: Date | string | null): boolean {
    const safe = safeDate(dateFinCampagne);
    if (!safe) return false;
    const fin = new Date(safe);
    const today = new Date();
    fin.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return fin < today;
  }

  /** La réservation est-elle validée par la comptabilité ? */
  isValideeComptable(reservation: any): boolean {
    return (
      reservation.id_chef_validation !== null &&
      reservation.id_chef_validation !== undefined &&
      Number(reservation.id_chef_validation) > 0
    );
  }

  // ============================================
  // 🔒 RÈGLE MÉTIER : Peut-on nettoyer cette réservation ?
  // ============================================
  /**
   * 📋 RÈGLE 1 : Échéance dépassée + non validée par la compta
   *    → motif "Expirée"
   *
   * 📋 RÈGLE 2 : Campagne terminée (date_fin < aujourd'hui)
   *    → motif "Terminée"
   *
   * Retourne :
   *   { ok: true, motif: 'Expirée' | 'Terminée', nouveauStatut: 'Expirée' | 'Terminée' }
   *   OU
   *   { ok: false, raison: '...' }
   */
  canBeCleaned(reservation: any): {
    ok: boolean;
    motif?: string;
    nouveauStatut?: string;
    raison: string;
  } {
    const expirationPassee = this.isExpirationPassed(reservation.date_expiration);
    const campagneFinie = this.isCampaignFinished(reservation.date_fin_campagne);
    const valideeCompta = this.isValideeComptable(reservation);

    // ═══════════════════════════════════════════════════════
    // ✅ RÈGLE 1 : Échéance dépassée + non validée
    // ═══════════════════════════════════════════════════════
    if (!valideeCompta && expirationPassee) {
      return {
        ok: true,
        motif: 'Expirée',
        nouveauStatut: 'Expirée',
        raison: 'Échéance expirée et non validée par la comptabilité',
      };
    }

    // ═══════════════════════════════════════════════════════
    // ✅ RÈGLE 2 : Campagne terminée
    // ═══════════════════════════════════════════════════════
    if (campagneFinie) {
      return {
        ok: true,
        motif: 'Terminée',
        nouveauStatut: 'Terminée',
        raison: 'Campagne terminée',
      };
    }

    // ═══════════════════════════════════════════════════════
    // ❌ Rien à nettoyer
    // ═══════════════════════════════════════════════════════
    const raisons: string[] = [];
    if (!expirationPassee) raisons.push('échéance non dépassée');
    if (valideeCompta) raisons.push('déjà validée');
    if (!campagneFinie) raisons.push('campagne encore active');

    return {
      ok: false,
      raison: raisons.join(' · ') || 'Aucune règle applicable',
    };
  }

  // ============================================
  // 🧹 NETTOYAGE PAR LOT
  // ============================================
  async cleanReservationsByBatch(batchSize: number = 50): Promise<CleanupResult> {
    const resultats: CleanupResult = {
      terminees: 0,
      expirees: 0,
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
            console.log(
              `⏳ Réservation ${reservation.id_reservation} conservée — ${check.raison}`
            );
            continue;
          }

          await this.moveReservation(
            connection,
            reservation,
            check.motif!,
            check.nouveauStatut!
          );

          if (check.nouveauStatut === 'Terminée') resultats.terminees++;
          else resultats.expirees++;

          resultats.details.push({
            id: reservation.id_reservation,
            commande: reservation.numero_commande || 'N/A',
            motif: check.raison,
            nouveau_statut: check.nouveauStatut!,
          });
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
        erreurs: resultats.erreurs,
      });

      return resultats;
    } finally {
      connection.release();
    }
  }

  // ============================================
  // 📦 DÉPLACE VERS HISTORIQUE + SUPPRIME
  // ============================================
  private async moveReservation(
    connection: any,
    reservation: any,
    motif: string,
    nouveauStatut: string
  ): Promise<void> {
    // ✅ 1. Insérer dans l'historique
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
        motif,
        reservation.statut,
        nouveauStatut,
      ]
    );

    // ✅ 2. Supprimer les lignes liées
    await connection.query(
      'DELETE FROM ligne_reservation WHERE id_reservation = ?',
      [reservation.id_reservation]
    );

    // ✅ 3. Supprimer la réservation
    await connection.query(
      'DELETE FROM reservation WHERE id_reservation = ?',
      [reservation.id_reservation]
    );

    console.log(
      `📦 Réservation ${reservation.id_reservation} déplacée → ${nouveauStatut} (${motif})`
    );
  }
}

export const reservationCleanupService = new ReservationCleanupService();