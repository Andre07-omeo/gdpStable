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
  }>;
}

// ============================================
// SERVICE
// ============================================
export class ReservationCleanupService {
  /**
   * Vérifie si la campagne est terminée
   */
  isCampaignFinished(dateFinCampagne: Date | string | null): boolean {
    if (!dateFinCampagne) return false;
    return new Date(dateFinCampagne) < new Date();
  }

  isExpired(
    dateExpiration: Date | string | null,
    statut: string | null
  ): boolean {
    if (!dateExpiration) return false;

    if (statut === 'Terminée' || statut === 'Expirée') return false;
    if (statut === 'Confirmée') return false;

    return new Date(dateExpiration) < new Date();
  }

  async cleanReservationsByBatch(
    batchSize: number = 50
  ): Promise<CleanupResult> {
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

      console.log(
        `📊 ${(reservations as any[]).length} réservation(s) à vérifier`
      );

      for (const reservation of reservations as any[]) {
        try {
          const statut = reservation.statut;
          const dateFinCampagne = reservation.date_fin_campagne;
          const dateExpiration = reservation.date_expiration;

          console.log(
            `🔍 Vérification réservation ${reservation.id_reservation} (${reservation.numero_commande}) - Statut: ${statut}`
          );

          // CAS 1 : Confirmée → terminée si campagne finie
          if (statut === 'Confirmée') {
            if (this.isCampaignFinished(dateFinCampagne)) {
              console.log(
                `✅ Réservation ${reservation.id_reservation} terminée (campagne finie)`
              );
              await this.moveReservation(
                connection,
                reservation,
                'terminée',
                'Terminée',
                resultats
              );
            } else {
              console.log(
                `⏳ Réservation ${reservation.id_reservation} confirmée - Campagne en cours`
              );
            }
            continue;
          }

          // CAS 2 : En attente → expirée si date dépassée
          if (statut === 'En attente') {
            if (this.isExpired(dateExpiration, statut)) {
              console.log(
                `⏰ Réservation ${reservation.id_reservation} expirée (date expiration passée)`
              );
              await this.moveReservation(
                connection,
                reservation,
                'expirée',
                'Expirée',
                resultats
              );
            } else {
              console.log(
                `⏳ Réservation ${reservation.id_reservation} en attente - En cours de validité`
              );
            }
            continue;
          }

          // CAS 3 : autres statuts
          console.log(
            `ℹ️ Réservation ${reservation.id_reservation} - Statut ${statut} non traité`
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
        erreurs: resultats.erreurs,
      });

      return resultats;
    } finally {
      connection.release();
    }
  }

  private async moveReservation(
    connection: any,
    reservation: any,
    motif: string,
    nouveauStatut: string,
    resultats: CleanupResult
  ): Promise<void> {
    await connection.query(
      'UPDATE reservation SET statut = ? WHERE id_reservation = ?',
      [nouveauStatut, reservation.id_reservation]
    );

    await connection.query(
      `INSERT INTO historique_reservation (
        id_reservation, id_client, id_commercial, id_chef_validation,
        numero_commande, date_creation, date_debut_campagne, date_fin_campagne,
        date_expiration, statut, est_verrouille, date_verrouillage,
        notes, photoCampagneUrl, photo_metadata,
        photo_latitude, photo_longitude, date_upload_photo,
        date_deplacement, motif_deplacement, ancien_statut, nouveau_statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservation.id_reservation,
        reservation.id_client,
        reservation.id_commercial,
        reservation.id_chef_validation,
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
        new Date(),
        motif,
        reservation.statut,
        nouveauStatut,
      ]
    );

    await connection.query(
      'DELETE FROM reservation WHERE id_reservation = ?',
      [reservation.id_reservation]
    );

    if (motif === 'terminée') {
      resultats.terminees++;
    } else {
      resultats.expirees++;
    }

    resultats.details.push({
      id: reservation.id_reservation,
      commande: reservation.numero_commande || 'N/A',
      motif:
        motif === 'terminée' ? 'Campagne terminée' : 'Réservation expirée',
    });

    console.log(
      `📦 Réservation ${reservation.id_reservation} déplacée vers historique (${motif})`
    );
  }
}

// ============================================
// INSTANCE PARTAGÉE
// ============================================
export const reservationCleanupService = new ReservationCleanupService();