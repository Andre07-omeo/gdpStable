// src/app/api/commercials/reservations-by-face/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT 
        r.id_reservation,
        r.date_debut_campagne AS date_debut,
        r.date_fin_campagne AS date_fin,
        r.statut,
        r.photoCampagneUrl,
        lr.id_face
      FROM reservation r
      INNER JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
      WHERE r.statut IN ('ACTIVE', 'Confirmée', 'En cours', 'En attente')
        AND (r.date_fin_campagne >= CURDATE() OR r.statut = 'En attente')
    `;

    const rows = await query(sql);
    const reservations = Array.isArray(rows) ? rows : [];

    return NextResponse.json({
      success: true,
      reservations: reservations.map((r: any) => ({
        id_reservation: Number(r.id_reservation),
        id_face: Number(r.id_face),
        date_debut: r.date_debut,
        date_fin: r.date_fin,
        statut: r.statut,
        photoCampagneUrl: r.photoCampagneUrl || null,
      })),
    });
  } catch (error) {
    console.error('❌ Erreur API reservations-by-face:', error);
    return NextResponse.json(
      { success: false, reservations: [], error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}