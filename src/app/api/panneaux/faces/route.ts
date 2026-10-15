import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// ✅ Empêche le pré-rendu au build
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idPanneau = searchParams.get('id_panneau');

    if (!idPanneau) {
      return NextResponse.json(
        { error: 'Paramètre id_panneau requis' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      `SELECT 
         f.id_face,
         f.id_panneau,
         f.orientation,
         f.est_active,
         (SELECT COUNT(*) FROM ligne_reservation lr
          WHERE lr.id_face = f.id_face
          AND lr.statut_diffusion = 'ACTIVE') AS reservations_actives
       FROM face f
       WHERE f.id_panneau = ?
       ORDER BY f.orientation ASC`,
      [idPanneau]
    );

    return NextResponse.json({ faces: rows });
  } catch (error: any) {
    console.error('Erreur faces:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}