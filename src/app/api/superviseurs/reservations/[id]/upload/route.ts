// src/app/api/superviseurs/reservations/[id]/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
export const dynamic = 'force-dynamic';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'gestion_panneaux_pro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection;
  try {
    const reservationId = parseInt(params.id);
    
    if (!reservationId) {
      return NextResponse.json(
        { success: false, error: 'ID de réservation invalide' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'photo';
    
    // Récupérer les métadonnées
    const latitude = formData.get('latitude') as string || null;
    const longitude = formData.get('longitude') as string || null;
    const accuracy = formData.get('accuracy') as string || null;
    const captureDate = formData.get('capture_date') as string || new Date().toISOString();
    const captureTime = formData.get('capture_time') as string || new Date().toLocaleTimeString('fr-FR');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = type === 'video' ? allowedVideoTypes : allowedPhotoTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Format de fichier non supporté` },
        { status: 400 }
      );
    }

    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `Fichier trop volumineux. Max: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // ✅ 1. Récupérer les informations de la réservation
    const [reservationData] = await connection.query(
      `SELECT id_reservation, date_debut_campagne, date_fin_campagne, photoCampagneUrl 
       FROM reservation WHERE id_reservation = ?`,
      [reservationId]
    );

    const reservation = (reservationData as any[])[0];
    if (!reservation) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    // ✅ 2. Récupérer toutes les lignes de réservation (faces) pour cette réservation
    const [lignesData] = await connection.query(
      `SELECT lr.id_ligne, lr.id_face, lr.date_debut, lr.date_fin, f.id_panneau
       FROM ligne_reservation lr
       JOIN face f ON lr.id_face = f.id_face
       WHERE lr.id_reservation = ?`,
      [reservationId]
    );

    const lignes = lignesData as any[];

    // ✅ 3. Calculer le retard (nombre de jours entre la date de début et aujourd'hui)
    const dateDebut = new Date(reservation.date_debut_campagne);
    const aujourdhui = new Date();
    const retardJours = Math.floor((aujourdhui.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`📅 Retard calculé: ${retardJours} jours`);

    // ✅ 4. Mettre à jour les dates si retard > 0
    let datesModifiees = false;
    if (retardJours > 0) {
      // Mettre à jour les dates de la réservation principale
      const nouvelleDateDebut = new Date(reservation.date_debut_campagne);
      nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + retardJours);
      
      const nouvelleDateFin = new Date(reservation.date_fin_campagne);
      nouvelleDateFin.setDate(nouvelleDateFin.getDate() + retardJours);

      await connection.query(
        `UPDATE reservation 
         SET date_debut_campagne = ?, 
             date_fin_campagne = ?,
             updated_at = NOW()
         WHERE id_reservation = ?`,
        [nouvelleDateDebut.toISOString().split('T')[0], 
         nouvelleDateFin.toISOString().split('T')[0], 
         reservationId]
      );

      datesModifiees = true;

      // ✅ 5. Mettre à jour les dates des lignes
      for (const ligne of lignes) {
        const newLigneDebut = new Date(ligne.date_debut);
        newLigneDebut.setDate(newLigneDebut.getDate() + retardJours);
        
        const newLigneFin = new Date(ligne.date_fin);
        newLigneFin.setDate(newLigneFin.getDate() + retardJours);

        await connection.query(
          `UPDATE ligne_reservation 
           SET date_debut = ?, 
               date_fin = ?,
               updated_at = NOW()
           WHERE id_ligne = ?`,
          [newLigneDebut.toISOString().split('T')[0], 
           newLigneFin.toISOString().split('T')[0], 
           ligne.id_ligne]
        );

        // ✅ 6. Vérifier et décaler les réservations futures sur la même face
        const [futuresReservations] = await connection.query(
          `SELECT lr.id_ligne, lr.date_debut, lr.date_fin, r.id_reservation
           FROM ligne_reservation lr
           JOIN reservation r ON lr.id_reservation = r.id_reservation
           WHERE lr.id_face = ? 
             AND lr.id_ligne != ?
             AND lr.date_debut > ?
             AND r.statut IN ('Confirmée', 'Diffusée')
           ORDER BY lr.date_debut ASC`,
          [ligne.id_face, ligne.id_ligne, newLigneFin.toISOString().split('T')[0]]
        );

        for (const future of (futuresReservations as any[])) {
          // Décaler la réservation future
          const futureDebut = new Date(future.date_debut);
          futureDebut.setDate(futureDebut.getDate() + retardJours);
          
          const futureFin = new Date(future.date_fin);
          futureFin.setDate(futureFin.getDate() + retardJours);

          // Vérifier si la date de début future est toujours après la date de fin de la réservation actuelle
          if (futureDebut <= newLigneFin) {
            // Si chevauchement, décaler encore plus
            const decalageSupplementaire = Math.ceil(
              (newLigneFin.getTime() - futureDebut.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
            
            futureDebut.setDate(futureDebut.getDate() + decalageSupplementaire);
            futureFin.setDate(futureFin.getDate() + decalageSupplementaire);
          }

          await connection.query(
            `UPDATE ligne_reservation 
             SET date_debut = ?, 
                 date_fin = ?,
                 updated_at = NOW()
             WHERE id_ligne = ?`,
            [futureDebut.toISOString().split('T')[0], 
             futureFin.toISOString().split('T')[0], 
             future.id_ligne]
          );

          // Mettre à jour les dates de la réservation principale future
          await connection.query(
            `UPDATE reservation 
             SET date_debut_campagne = ?, 
                 date_fin_campagne = ?,
                 updated_at = NOW()
             WHERE id_reservation = ?`,
            [futureDebut.toISOString().split('T')[0], 
             futureFin.toISOString().split('T')[0], 
             future.id_reservation]
          );
        }
      }
    }

    // ✅ 7. Supprimer l'ancien fichier
    const oldPhotoUrl = reservation.photoCampagneUrl;
    if (oldPhotoUrl) {
      try {
        const fileName = oldPhotoUrl.split('/').pop();
        if (fileName) {
          const filePath = path.join(process.cwd(), 'public', 'uploads', 'campagnes', fileName);
          if (existsSync(filePath)) {
            await unlink(filePath);
            console.log('✅ Ancien fichier supprimé:', fileName);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur suppression ancien fichier:', error);
      }
    }

    // ✅ 8. Créer le dossier et sauvegarder le fichier
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'campagnes');
    await mkdir(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `campagne_${reservationId}_${dateStr}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const fileUrl = `/uploads/campagnes/${fileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    console.log('✅ Fichier sauvegardé:', fileName);

    // ✅ 9. Mettre à jour la base de données avec les métadonnées
    await connection.query(
      `UPDATE reservation 
       SET photoCampagneUrl = ?, 
           updated_at = NOW(),
           photo_metadata = ?,
           photo_latitude = ?,
           photo_longitude = ?
       WHERE id_reservation = ?`,
      [
        fileUrl,
        JSON.stringify({
          fileName,
          captureDate,
          captureTime,
          latitude,
          longitude,
          accuracy,
          type,
          size: file.size,
          mimeType: file.type
        }),
        latitude,
        longitude,
        reservationId
      ]
    );

    await connection.commit();
    connection.release();

    // ✅ 10. Récupérer les infos mises à jour
    const [updated] = await pool.query(
      `SELECT id_reservation, photoCampagneUrl, date_debut_campagne, date_fin_campagne, numero_commande 
       FROM reservation WHERE id_reservation = ?`,
      [reservationId]
    );

    return NextResponse.json({
      success: true,
      message: `${type === 'video' ? 'Vidéo' : 'Photo'} uploadée avec succès`,
      data: (updated as any[])[0],
      metadata: {
        fileName,
        fileUrl,
        captureDate,
        captureTime,
        latitude,
        longitude,
        timestamp
      },
      datesModifiees: datesModifiees,
      retardJours: retardJours,
      messageDates: datesModifiees 
        ? `Les dates ont été décalées de ${retardJours} jours en raison du retard.` 
        : 'Aucun décalage de dates nécessaire.'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error('❌ Erreur upload:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'upload du fichier: ' + (error as Error).message },
      { status: 500 }
    );
  }
}