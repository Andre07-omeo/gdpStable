// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED_PROFILES = ['SUPER_ADMIN', 'ADMIN'];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: 'Config serveur' }, { status: 500 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // ✅ Stats
    const [usersRow] = (await query(
      `SELECT COUNT(*) as total FROM user WHERE actif = 1`
    )) as any[];

    const [panneauxRow] = (await query(
      `SELECT COUNT(*) as total FROM panneau`
    )) as any[];

    const [reservationsRow] = (await query(
      `SELECT COUNT(*) as total FROM reservation`
    )) as any[];

    const [clientsRow] = (await query(
      `SELECT COUNT(*) as total FROM client`
    )) as any[];

    return NextResponse.json({
      totalUsers: usersRow?.total || 0,
      totalPanneaux: panneauxRow?.total || 0,
      totalReservations: reservationsRow?.total || 0,
      totalClients: clientsRow?.total || 0,
    });
  } catch (error) {
    console.error('❌ Erreur /api/admin/stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}