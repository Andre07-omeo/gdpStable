// src/app/api/admin/reservations/route.ts
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

    const reservations = await query(
      `SELECT 
        r.id_reservation,
        r.numero_commande,
        r.statut,
        r.date_debut_campagne,
        r.date_fin_campagne,
        r.date_creation,
        c.raison_sociale as client_nom,
        CONCAT(u.prenom, ' ', u.nom) as commercial_nom
      FROM reservation r
      LEFT JOIN client c ON r.id_client = c.id_client
      LEFT JOIN user u ON r.id_commercial = u.id_user
      ORDER BY r.created_at DESC
      LIMIT 200`
    );

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('❌ Erreur /api/admin/reservations:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}