import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const lignes: any = await query(
      `DELETE FROM ligne_reservation WHERE date_fin IS NOT NULL AND date_fin < CURDATE()`
    );
    const resas: any = await query(
      `DELETE r FROM reservation r
       LEFT JOIN ligne_reservation lr ON lr.id_reservation = r.id_reservation
       WHERE lr.id_ligne IS NULL
         AND r.date_fin_campagne IS NOT NULL
         AND r.date_fin_campagne < CURDATE()`
    );
    return NextResponse.json({
      ok: true,
      deletedLignes: lignes?.affectedRows ?? 0,
      deletedReservations: resas?.affectedRows ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}