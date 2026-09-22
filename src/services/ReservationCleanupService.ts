// src/services/ReservationCleanupService.ts

import mysql from 'mysql2/promise';

// Configuration de la base de données
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

export class ReservationCleanupService {
  
  /**
   * Vérifie si la campagne est terminée (date_fin_campagne < aujourd'hui)
   */
  isCampaignFinished(dateFinCampagne: Date | string | null): boolean {
    if (!dateFinCampagne) return false;
    return new Date(dateFinCampagne) < new Date();
  }

  isExpired(dateExpiration: Date | string | null, statut: string | null): boolean {
    if (!dateExpiration) return false;
    
    // Ne pas déplacer si déjà terminée ou expirée
    if (statut === 'Terminée' || statut === 'Expirée') return false;
    
    // Ne pas déplacer si la réservation est confirmée (même si date_expiration est passée)
    if (statut === 'Confirmée') return false;
    
    return new Date(dateExpiration) < new Date();
  }

  async cleanReservationsByBatch(batchSize: number = 50): Promise<CleanupResult> {
    const resultats: CleanupResult = {
      terminees: 0,
      expirees: 0,
      erreurs: 0,
      details: []
    };

    const connection = await pool.getConnection();

    try {
      // Récupérer les réservations (sauf celles déjà terminées ou expirées)
      const [reservations] = await connection.query(
        `SELECT * FROM reservation 
         WHERE statut NOT IN ('Terminée', 'Expirée')
         LIMIT ?`,
        [batchSize]
      );

      console.log(`📊 ${(reservations as any[]).length} réservation(s) à vérifier`);

      for (const reservation of reservations as any[]) {
        try {
          const statut = reservation.statut;
          const dateFinCampagne = reservation.date_fin_campagne;
          const dateExpiration = reservation.date_expiration;

          console.log(`🔍 Vérification réservation ${reservation.id_reservation} (${reservation.numero_commande}) - Statut: ${statut}`);

          // ============================================
          // CAS 1 : Réservation Confirmée
          // → Déplacée UNIQUEMENT si date_fin_campagne est passée
          // ============================================
          if (statut === 'Confirmée') {
            if (this.isCampaignFinished(dateFinCampagne)) {
              console.log(`✅ Réservation ${reservation.id_reservation} terminée (campagne finie)`);
              await this.moveReservation(connection, reservation, 'terminée', 'Terminée', resultats);
            } else {
              console.log(`⏳ Réservation ${reservation.id_reservation} confirmée - Campagne en cours`);
            }
            continue;
          }

          // ============================================
          // CAS 2 : Réservation En attente (non confirmée)
          // → Déplacée UNIQUEMENT si date_expiration est passée
          // ============================================
          if (statut === 'En attente') {
            if (this.isExpired(dateExpiration, statut)) {
              console.log(`⏰ Réservation ${reservation.id_reservation} expirée (date expiration passée)`);
              await this.moveReservation(connection, reservation, 'expirée', 'Expirée', resultats);
            } else {
              console.log(`⏳ Réservation ${reservation.id_reservation} en attente - En cours de validité`);
            }
            continue;
          }

          // ============================================
          // CAS 3 : Autres statuts (payée, etc.)
          // ============================================
          console.log(`ℹ️ Réservation ${reservation.id_reservation} - Statut ${statut} non traité`);

        } catch (error) {
          console.error(`❌ Erreur réservation ${reservation.id_reservation}:`, error);
          resultats.erreurs++;
        }
      }

      console.log('📊 Résumé du nettoyage:', {
        terminees: resultats.terminees,
        expirees: resultats.expirees,
        erreurs: resultats.erreurs
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
    // 1. Mettre à jour le statut
    await connection.query(
      'UPDATE reservation SET statut = ? WHERE id_reservation = ?',
      [nouveauStatut, reservation.id_reservation]
    );

    // 2. Copier dans l'historique
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
        nouveauStatut
      ]
    );

    // 3. Supprimer de la table principale
    await connection.query(
      'DELETE FROM reservation WHERE id_reservation = ?',
      [reservation.id_reservation]
    );

    // 4. Compter
    if (motif === 'terminée') {
      resultats.terminees++;
    } else {
      resultats.expirees++;
    }
    
    resultats.details.push({
      id: reservation.id_reservation,
      commande: reservation.numero_commande || 'N/A',
      motif: motif === 'terminée' ? 'Campagne terminée' : 'Réservation expirée'
    });

    console.log(`📦 Réservation ${reservation.id_reservation} déplacée vers historique (${motif})`);
  }
}