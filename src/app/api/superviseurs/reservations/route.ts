// src/app/api/superviseur/reservations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET - Récupérer les réservations d'un panneau
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const panneauId = searchParams.get('panneauId');

    if (!panneauId) {
      return NextResponse.json(
        { error: 'panneauId requis' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();

    const [reservations] = await connection.query(`
      SELECT 
        lr.id_ligne,
        lr.id_reservation,
        lr.id_face,
        lr.date_debut,
        lr.date_fin,
        lr.prix_vente_net,
        lr.statut_diffusion,
        lr.created_at,
        lr.updated_at,
        lr.photo_campagne_url,
        p.id_panneau as panneau_id,
        p.nom as panneau_idPan,
        p.adresse as panneau_adresse,
        f.orientation as face_orientation,
        c.nom as client_nom,
        co.nom as commercial_nom,
        r.numero_commande,
        r.statut as reservation_statut,
        DATEDIFF(lr.date_fin, CURDATE()) as jours_restants
      FROM ligne_reservation lr
      INNER JOIN face f ON lr.id_face = f.id_face
      INNER JOIN panneau p ON f.id_panneau = p.id_panneau
      INNER JOIN reservation r ON lr.id_reservation = r.id_reservation
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN commercial co ON r.id_commercial = co.id_commercial
      WHERE p.id_panneau = ?
      AND lr.date_fin >= CURDATE()
      AND lr.statut_diffusion IN ('Diffusée', 'En attente')
      ORDER BY lr.date_debut ASC
    `, [panneauId]);

    connection.release();

    // Formater les données
    const formattedReservations = (reservations as any[]).map(r => ({
      ...r,
      joursRestants: r.jours_restants || 0,
      estEnCours: new Date(r.date_debut) <= new Date() && new Date(r.date_fin) >= new Date(),
      photo_campagne_url: r.photo_campagne_url || undefined
    }));

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error('Erreur GET réservations:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des réservations' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour le statut d'une réservation
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const ligneId = formData.get('ligneId') as string;
    const nouveauStatut = formData.get('statut') as string;
    const photoUrl = formData.get('photoUrl') as string;

    if (!ligneId || !nouveauStatut) {
      return NextResponse.json(
        { error: 'ligneId et statut requis' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    // Mettre à jour la ligne de réservation
    const updateFields = ['statut_diffusion = ?', 'updated_at = NOW()'];
    const values: any[] = [nouveauStatut];

    if (photoUrl) {
      updateFields.push('photo_campagne_url = ?');
      values.push(photoUrl);
    }

    values.push(ligneId);

    await connection.query(`
      UPDATE ligne_reservation 
      SET ${updateFields.join(', ')}
      WHERE id_ligne = ?
    `, values);

    // Si le statut devient "Diffusée", mettre à jour la réservation principale
    if (nouveauStatut === 'Diffusée') {
      const [rows] = await connection.query(`
        SELECT id_reservation FROM ligne_reservation WHERE id_ligne = ?
      `, [ligneId]) as any[];

      if (rows.length > 0 && rows[0]?.id_reservation) {
        await connection.query(`
          UPDATE reservation 
          SET statut = 'Confirmée', updated_at = NOW()
          WHERE id_reservation = ?
          AND statut = 'En attente'
        `, [rows[0].id_reservation]);
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      success: true,
      message: 'Réservation mise à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur PUT réservation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}