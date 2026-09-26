// src/app/api/commercials/reservations-desaffichage/[id]/valider/route.ts

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

    const canValidate =
      currentUser.profil === 'CHEF_COMMERCIAL' ||
      currentUser.profil === 'SUPER_ADMIN' ||
      currentUser.profil === 'ADMIN_SYSTEM' ||
      currentUser.profil === 'DG' ||
      currentUser.profil === 'PDG';

    if (!canValidate) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const id_ligne = parseInt(params.id);

    if (!id_ligne || isNaN(id_ligne)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'id_ligne invalide' },
        { status: 400 }
      );
    }

    // ✅ Récupérer la ligne + jours restants pour VÉRIFIER LA CONDITION
    const [rows] = await connection.query(
      `SELECT 
         lr.id_ligne, 
         lr.id_reservation, 
         lr.id_face,
         DATEDIFF(r.date_fin_campagne, CURDATE()) AS jours_restants
       FROM ligne_reservation lr
       INNER JOIN reservation r ON lr.id_reservation = r.id_reservation
       WHERE lr.id_ligne = ?`,
      [id_ligne]
    );

    if ((rows as any[]).length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: 'Ligne introuvable' },
        { status: 404 }
      );
    }

    const ligne = (rows as any[])[0];

    // ✅ VÉRIFIER : la validation n'est possible QUE si jours_restants < 0
    if (Number(ligne.jours_restants) >= 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        {
          success: false,
          error: `Validation impossible : la campagne n'est pas encore échue (${ligne.jours_restants}j restants).`,
        },
        { status: 400 }
      );
    }

    // 1. Marquer la réservation validée
    await connection.query(
      `UPDATE reservation 
       SET validation_chef_commercial = 1,
           id_chef_validation = ?,
           date_validation_chef = NOW(),
           statut = 'Terminée'
       WHERE id_reservation = ?`,
      [currentUser.userId, ligne.id_reservation]
    );

    // 2. Marquer la ligne désaffichée
    await connection.query(
      `UPDATE ligne_reservation 
       SET statut_diffusion = 'Désaffichée'
       WHERE id_ligne = ?`,
      [id_ligne]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: 'Désaffichement validé avec succès',
    });
  } catch (error: any) {
    await connection.rollback();
    connection.release();
    console.error('❌ Erreur POST valider-desaffichage:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}