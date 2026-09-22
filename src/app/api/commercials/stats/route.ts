// src/app/api/commercials/stats/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // ============================================
    // 1. AUTHENTIFICATION
    // ============================================
    const token = (await cookies()).get('auth_token')?.value;
    const payload = verifyToken(token || '');
    const userId = payload?.id_user ?? (payload as any)?.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ============================================
    // 2. FACTURES — MOIS EN COURS UNIQUEMENT
    // ============================================
    // "Validée + payée" = id_comptable_validation NOT NULL ET date_rejet NULL
    // Mois en cours = date_creation entre début et fin du mois courant

    // Mes factures validées ce mois-ci
    const mesFacturesRows = (await query(
      `SELECT COUNT(*) AS mesFacturesValidees
       FROM facture
       WHERE id_commercial = ?
         AND id_comptable_validation IS NOT NULL
         AND date_rejet IS NULL
         AND YEAR(date_creation) = YEAR(NOW())
         AND MONTH(date_creation) = MONTH(NOW())`,
      [userId]
    )) as any[];

    // Toutes les factures validées ce mois-ci (tous commerciaux)
    const globalFacturesRows = (await query(
      `SELECT COUNT(*) AS totalFacturesValidees
       FROM facture
       WHERE id_comptable_validation IS NOT NULL
         AND date_rejet IS NULL
         AND YEAR(date_creation) = YEAR(NOW())
         AND MONTH(date_creation) = MONTH(NOW())`
    )) as any[];

    const mesFacturesValidees = Number(mesFacturesRows[0]?.mesFacturesValidees) || 0;
    const totalFacturesValidees = Number(globalFacturesRows[0]?.totalFacturesValidees) || 0;

    // Pourcentage du cercle
    const pourcentageFactures = totalFacturesValidees > 0
      ? Math.round((mesFacturesValidees / totalFacturesValidees) * 100)
      : 0;

    // ============================================
    // 3. RÉSERVATIONS — MOIS EN COURS UNIQUEMENT
    // ============================================
    // Total de toutes les réservations ce mois-ci (tous commerciaux)
    const totalReservRows = (await query(
      `SELECT COUNT(*) AS totalReservations
       FROM reservation
       WHERE YEAR(date_creation) = YEAR(NOW())
         AND MONTH(date_creation) = MONTH(NOW())`
    )) as any[];

    // Mes réservations ce mois-ci
    const mesReservRows = (await query(
      `SELECT COUNT(*) AS mesReservations
       FROM reservation
       WHERE id_commercial = ?
         AND YEAR(date_creation) = YEAR(NOW())
         AND MONTH(date_creation) = MONTH(NOW())`,
      [userId]
    )) as any[];

    const totalReservations = Number(totalReservRows[0]?.totalReservations) || 0;
    const mesReservations = Number(mesReservRows[0]?.mesReservations) || 0;

    // ============================================
    // 4. RÉPONSE
    // ============================================
    return NextResponse.json({
      // Factures (mois en cours)
      mesFacturesValidees,
      totalFacturesValidees,
      pourcentageFactures,

      // Réservations (mois en cours)
      totalReservations,
      mesReservations,
    });
  } catch (err) {
    console.error('❌ /api/commercials/stats:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}