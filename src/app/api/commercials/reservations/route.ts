// src/app/api/commercials/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { onReservationCreated } from '@/lib/notifications/triggers/onReservationCreated';

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

// ✅ Calcul expiration 72h ouvrables
function calculateExpirationWorkingHours(startDate: Date): Date {
  const expirationDate = new Date(startDate);
  let heuresAjoutees = 0;
  while (heuresAjoutees < 72) {
    expirationDate.setHours(expirationDate.getHours() + 1);
    const jourSemaine = expirationDate.getDay();
    if (jourSemaine !== 0 && jourSemaine !== 6) heuresAjoutees++;
  }
  return expirationDate;
}

// ============================================
// POST : Créer une réservation + notifier
// ============================================
export async function POST(request: NextRequest) {
  let connection;
  try {
    const body = await request.json();
    const {
      id_face,
      id_client,
      id_commercial,
      date_debut,
      date_fin,
      prix_vente_net,
      notes,
    } = body;

    if (!id_face || !id_client || !date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }

    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
    if (debut >= fin) {
      return NextResponse.json(
        { error: 'La date de début doit être antérieure à la date de fin' },
        { status: 400 }
      );
    }

    const commercialId = id_commercial || 1;

    const now = new Date();
    const expirationDate = calculateExpirationWorkingHours(now);
    const expirationMySQL = expirationDate
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Vérifier la face
    const [faceCheck] = await connection.query(
      `SELECT id_face, id_panneau, est_active FROM face WHERE id_face = ?`,
      [id_face]
    );
    if ((faceCheck as any[]).length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Cette face n'existe pas" }, { status: 404 });
    }
    const face = (faceCheck as any[])[0];
    if (face.est_active === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Cette face n'est pas active" }, { status: 400 });
    }

    // 2. Chevauchements
    const [overlapCheck] = await connection.query(
      `SELECT id_ligne, date_debut, date_fin 
       FROM ligne_reservation 
       WHERE id_face = ? 
       AND statut_diffusion IN ('En attente', 'Validée', 'Diffusée')
       AND (
         (date_debut <= ? AND date_fin >= ?) OR
         (date_debut <= ? AND date_fin >= ?) OR
         (date_debut >= ? AND date_fin <= ?)
       )`,
      [id_face, date_debut, date_debut, date_fin, date_fin, date_debut, date_fin]
    );
    if ((overlapCheck as any[]).length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Cette période est déjà réservée pour cette face', overlapping: overlapCheck },
        { status: 409 }
      );
    }

    // 3. Numéro de commande
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total FROM reservation`
    );
    const total = (countResult as any[])[0].total;
    const numero_commande = `CMD-${String(total + 1).padStart(4, '0')}`;

    // 4. Créer la réservation
    const [reservationResult] = await connection.query(
      `INSERT INTO reservation 
       (id_client, id_commercial, numero_commande, date_creation, date_debut_campagne, date_fin_campagne, statut, notes, date_expiration) 
       VALUES (?, ?, ?, NOW(), ?, ?, 'En attente', ?, ?)`,
      [id_client, commercialId, numero_commande, date_debut, date_fin, notes || null, expirationMySQL]
    );
    const id_reservation = (reservationResult as any).insertId;

    // 5. Créer la ligne
    const [ligneResult] = await connection.query(
      `INSERT INTO ligne_reservation 
       (id_reservation, id_face, date_debut, date_fin, prix_vente_net, statut_diffusion) 
       VALUES (?, ?, ?, ?, ?, 'En attente')`,
      [id_reservation, id_face, date_debut, date_fin, prix_vente_net || 0]
    );
    const id_ligne = (ligneResult as any).insertId;

    // 6. Récupérer infos panneau + client + commercial POUR LA NOTIF
    const [infosResult] = await connection.query(
      `SELECT 
         p.nom AS panneauNom,
         f.orientation AS faceOrientation,
         cl.raison_sociale AS clientNom,
         CONCAT(u.nom, ' ', u.prenom) AS commercialNom
       FROM face f
       JOIN panneau p ON f.id_panneau = p.id_panneau
       JOIN client cl ON cl.id_client = ?
       LEFT JOIN users u ON u.id_user = ?
       WHERE f.id_face = ?`,
      [id_client, commercialId, id_face]
    );
    const infos = (infosResult as any[])[0] || {};

    await connection.commit();
    connection.release();
    connection = null;

    // ============================================
    // ✅ APPEL DU TRIGGER APRÈS COMMIT
    // ============================================
    // Nombre de mois (arrondi supérieur)
    const diffMs = fin.getTime() - debut.getTime();
    const nombreMois = Math.max(
      1,
      Math.round(diffMs / (1000 * 60 * 60 * 24 * 30))
    );

    try {
      await onReservationCreated({
        id_reservation,
        id_commercial: commercialId,
        commercialNom: infos.commercialNom || 'Commercial',
        clientNom: infos.clientNom || 'Client',
        panneauNom: infos.panneauNom || 'Panneau',
        faceOrientation: infos.faceOrientation || 'N/A',
        nombreMois,
        numeroCommande: numero_commande,
      });
      console.log('✅ Notification envoyée pour réservation', id_reservation);
    } catch (notifErr) {
      // ⚠️ On ne bloque PAS la réservation si la notif échoue
      console.error('❌ Erreur notification (réservation OK):', notifErr);
    }

    return NextResponse.json({
      success: true,
      id_reservation,
      id_ligne,
      numero_commande,
      date_expiration: expirationMySQL,
      message: 'Réservation créée avec succès',
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur création réservation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// GET : Récupérer les réservations
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id_face = searchParams.get('id_face');

    let query = `
      SELECT 
        r.id_reservation,
        r.numero_commande,
        r.date_debut_campagne as dateDebut,
        r.date_fin_campagne as dateFin,
        r.statut,
        r.notes,
        r.date_creation as dateCreation,
        r.date_expiration,
        cl.raison_sociale as client_nom,
        cl.id_client,
        cl.telephone as client_telephone,
        CONCAT(u.nom, ' ', u.prenom) as commercial_nom,
        u.id_user as commercial_id,
        u.email as commercial_email,
        lr.id_ligne,
        lr.id_face,
        lr.prix_vente_net,
        lr.statut_diffusion,
        f.orientation,
        p.nom as panneau_nom,
        p.id_panneau,
        p.adresse as panneau_adresse
      FROM reservation r
      JOIN ligne_reservation lr ON r.id_reservation = lr.id_reservation
      JOIN face f ON lr.id_face = f.id_face
      JOIN panneau p ON f.id_panneau = p.id_panneau
      JOIN client cl ON r.id_client = cl.id_client
      LEFT JOIN users u ON r.id_commercial = u.id_user
      WHERE 1=1
    `;

    const params: any[] = [];
    if (id_face) {
      query += ` AND lr.id_face = ?`;
      params.push(id_face);
    }
    query += ` ORDER BY r.date_creation DESC`;

    const connection = await pool.getConnection();
    const [rows] = await connection.query(query, params);
    connection.release();

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const processedData = (rows as any[]).map((row) => {
      const now = new Date();
      const expirationDate = row.date_expiration ? new Date(row.date_expiration) : null;
      const isExpired = expirationDate && now > expirationDate && row.statut === 'En attente';

      return {
        ...row,
        dateCreationFormatted: row.dateCreation
          ? new Date(row.dateCreation).toLocaleString('fr-FR', options)
          : null,
        dateExpirationFormatted: row.date_expiration
          ? new Date(row.date_expiration).toLocaleString('fr-FR', options)
          : null,
        isExpired,
        statut_display: isExpired ? 'Expirée' : row.statut,
      };
    });

    return NextResponse.json({
      success: true,
      data: processedData,
      total: processedData.length,
    });
  } catch (error) {
    console.error('❌ Erreur récupération réservations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réservations' },
      { status: 500 }
    );
  }
}