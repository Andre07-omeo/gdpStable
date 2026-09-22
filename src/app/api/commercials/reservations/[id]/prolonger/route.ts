// src/app/api/commercials/reservations/[id]/prolonger/route.ts

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
  userId: number;
  profil: string;
} | null {
  try {
    const token =
      request.cookies.get('auth_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'votre_secret'
    ) as any;

    return {
      userId: decoded.userId || decoded.id,
      profil: decoded.profil,
    };
  } catch {
    return null;
  }
}

// ============================================
// POST : Prolonger une réservation
// ============================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const currentUser = getUserFromToken(request);
    if (!currentUser) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const id_reservation = parseInt(params.id);
    if (isNaN(id_reservation)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'ID réservation invalide' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nouvelle_date_fin, montant_prolongation, mode_paiement } = body;

    if (!nouvelle_date_fin) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Nouvelle date de fin requise' },
        { status: 400 }
      );
    }

    // ✅ 1. Récupérer la réservation avec sa ligne
    const [resaRows] = await connection.query(
      `SELECT 
        r.*,
        lr.id_ligne,
        lr.id_face,
        lr.date_debut AS ligne_date_debut,
        lr.date_fin AS ligne_date_fin,
        lr.prix_vente_net
      FROM reservation r
      INNER JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      WHERE r.id_reservation = ?`,
      [id_reservation]
    );

    if ((resaRows as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    const reservation = (resaRows as any[])[0];

    // ✅ 2. Calculer les jours restants
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateFin = new Date(reservation.date_fin_campagne);
    dateFin.setHours(0, 0, 0, 0);

    const diffMs = dateFin.getTime() - today.getTime();
    const joursRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    console.log(`📅 Jours restants: ${joursRestants}`);

    if (joursRestants <= 14) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de prolonger : il reste seulement ${joursRestants} jour(s). Il faut au moins 15 jours restants.`,
          joursRestants,
        },
        { status: 400 }
      );
    }

    // ✅ 3. Vérifier la nouvelle date
    const nouvelleFin = new Date(nouvelle_date_fin);
    nouvelleFin.setHours(0, 0, 0, 0);

    if (nouvelleFin <= dateFin) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        {
          success: false,
          error: 'La nouvelle date de fin doit être après la date de fin actuelle',
        },
        { status: 400 }
      );
    }

    // ✅ 4. Calculer le nombre de jours de prolongation
    const diffProlongationMs = nouvelleFin.getTime() - dateFin.getTime();
    const joursProlongation = Math.ceil(diffProlongationMs / (1000 * 60 * 60 * 24));

    console.log(`📅 Jours de prolongation: ${joursProlongation}`);

    // ✅ 5. Récupérer les réservations futures sur la MÊME face
    const [futuresRows] = await connection.query(
      `SELECT 
        lr.id_ligne,
        lr.id_reservation,
        lr.date_debut,
        lr.date_fin
      FROM ligne_reservation lr
      WHERE lr.id_face = ?
        AND lr.id_reservation != ?
        AND lr.date_debut > ?
        AND lr.statut_diffusion IN ('En attente', 'Validée', 'ACTIVE', 'Confirmée')
      ORDER BY lr.date_debut ASC`,
      [reservation.id_face, id_reservation, reservation.date_fin_campagne]
    );

    const futuresReservations = futuresRows as any[];
    console.log(`📋 ${futuresReservations.length} réservation(s) future(s) trouvée(s)`);

    // ✅ 6. Mettre à jour la réservation actuelle
    await connection.query(
      `UPDATE reservation 
       SET date_fin_campagne = ?, 
           updated_at = NOW()
       WHERE id_reservation = ?`,
      [nouvelle_date_fin, id_reservation]
    );

    // ✅ 7. Mettre à jour la ligne de réservation actuelle
    await connection.query(
      `UPDATE ligne_reservation 
       SET date_fin = ?,
           updated_at = NOW()
       WHERE id_ligne = ?`,
      [nouvelle_date_fin, reservation.id_ligne]
    );

    // ✅ 8. Décaler TOUTES les réservations futures de la même face
    for (const future of futuresReservations) {
      const ancienDebut = new Date(future.date_debut);
      const ancienFin = new Date(future.date_fin);

      // Décaler par le nombre de jours de prolongation
      const nouveauDebut = new Date(ancienDebut);
      nouveauDebut.setDate(nouveauDebut.getDate() + joursProlongation);

      const nouveauFin = new Date(ancienFin);
      nouveauFin.setDate(nouveauFin.getDate() + joursProlongation);

      const nouveauDebutStr = nouveauDebut.toISOString().slice(0, 19).replace('T', ' ');
      const nouveauFinStr = nouveauFin.toISOString().slice(0, 19).replace('T', ' ');

      // ✅ Mettre à jour la ligne_reservation
      await connection.query(
        `UPDATE ligne_reservation 
         SET date_debut = ?,
             date_fin = ?,
             updated_at = NOW()
         WHERE id_ligne = ?`,
        [nouveauDebutStr, nouveauFinStr, future.id_ligne]
      );

      // ✅ Mettre à jour la réservation associée
      await connection.query(
        `UPDATE reservation 
         SET date_debut_campagne = ?,
             date_fin_campagne = ?,
             updated_at = NOW()
         WHERE id_reservation = ?`,
        [nouveauDebutStr, nouveauFinStr, future.id_reservation]
      );

      // ✅ Mettre à jour la facture si elle existe
      await connection.query(
        `UPDATE facture_ligne 
         SET date_debut = ?,
             date_fin = ?
         WHERE id_reservation = ?`,
        [nouveauDebutStr, nouveauFinStr, future.id_reservation]
      );

      console.log(`✅ Réservation ${future.id_reservation} décalée de ${joursProlongation} jours`);
    }

    // ✅ 9. Créer une facture de prolongation (si montant fourni)
    let id_facture_prolongation = null;
    let numero_facture_prolongation = null;

    if (montant_prolongation && montant_prolongation > 0) {
      // Générer un numéro de facture
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const prefix = `PROL-${year}${month}${day}`;

      const [countRes] = await connection.query(
        `SELECT COUNT(*) as total FROM facture WHERE numero_facture LIKE ?`,
        [`${prefix}%`]
      );
      const count = (countRes as any[])[0].total + 1;
      numero_facture_prolongation = `${prefix}-${String(count).padStart(4, '0')}`;

      const tauxTVA = 0.16;
      const totalHT = Number(montant_prolongation);
      const totalTTC = totalHT * (1 + tauxTVA);

      const [factureRes] = await connection.query(
        `INSERT INTO facture (
          numero_facture,
          id_client,
          id_commercial,
          date_creation,
          date_facture,
          date_echeance,
          type_document,
          statut,
          total_ht,
          total_ttc,
          mode_paiement,
          notes,
          conditions_paiement,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, NOW(), CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'PROLONGATION', 'EN_ATTENTE', ?, ?, ?, ?, 'Paiement à 30 jours', NOW(), NOW())`,
        [
          numero_facture_prolongation,
          reservation.id_client,
          currentUser.userId,
          totalHT,
          totalTTC,
          mode_paiement || 'comptant',
          `Prolongation de ${joursProlongation} jours - Réservation ${reservation.numero_commande}`,
        ]
      );

      id_facture_prolongation = (factureRes as any).insertId;

      // Créer la ligne de facture
      await connection.query(
        `INSERT INTO facture_ligne (
          id_facture,
          id_reservation,
          id_face,
          libelle,
          quantite,
          prix_unitaire,
          total_ligne,
          date_debut,
          date_fin,
          duree_mois,
          created_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, NOW())`,
        [
          id_facture_prolongation,
          id_reservation,
          reservation.id_face,
          `Prolongation de ${joursProlongation} jours`,
          totalHT,
          totalHT,
          reservation.date_fin_campagne,
          nouvelle_date_fin,
          Math.ceil(joursProlongation / 30),
        ]
      );

      console.log(`✅ Facture de prolongation créée: ${numero_facture_prolongation}`);
    }

    // ✅ 10. Ajouter à l'historique
    await connection.query(
      `INSERT INTO historique_reservation (
        id_reservation,
        ancien_statut,
        nouveau_statut,
        date_deplacement,
        motif_deplacement,
        created_at
      ) VALUES (?, ?, ?, NOW(), ?, NOW())`,
      [
        id_reservation,
        reservation.statut,
        reservation.statut,
        `Prolongation de ${joursProlongation} jours - Nouvelle date fin: ${nouvelle_date_fin}`,
      ]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: `Réservation prolongée de ${joursProlongation} jours`,
      data: {
        id_reservation,
        ancienne_date_fin: reservation.date_fin_campagne,
        nouvelle_date_fin,
        jours_prolongation: joursProlongation,
        futures_reservations_decalees: futuresReservations.length,
        id_facture_prolongation,
        numero_facture_prolongation,
      },
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur POST prolonger:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}