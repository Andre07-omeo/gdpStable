// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    console.log('🔍 /api/auth/me — Token reçu:', token ? `✅ Présent (${token.slice(0, 20)}...)` : '❌ Absent');
    console.log('🍪 Tous les cookies:', request.cookies.getAll().map(c => c.name));

    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini en variable d\'environnement !');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('👤 Token décodé:', decoded);
    } catch (jwtError: any) {
      console.error('❌ Erreur JWT:', jwtError.message);
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;

    if (!userId) {
      console.error('❌ Aucun id utilisateur dans le token:', decoded);
      return NextResponse.json(
        { error: 'Token invalide (id manquant)' },
        { status: 401 }
      );
    }

    const users = await query(
      `SELECT 
        u.id_user,
        u.id_profil,
        u.nom,
        u.prenom,
        u.email,
        u.actif,
        u.zone_travail,
        u.zone_niveau,
        p.code as profil_code,
        p.libelle as profil_libelle
      FROM user u
      LEFT JOIN profil p ON u.id_profil = p.id_profil
      WHERE u.id_user = ?`,
      [userId]
    );

    const user = (users as any[])[0];

    if (!user) {
      console.error('❌ Utilisateur non trouvé en DB:', userId);
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id_user,
      id_user: user.id_user,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      profil: user.profil_code || 'VISITEUR',
      profilLibelle: user.profil_libelle || 'Visiteur',
      id_profil: user.id_profil,
      actif: user.actif,
      zone_travail: user.zone_travail,
      zone_niveau: user.zone_niveau,
    });
  } catch (error) {
    console.error('❌ Erreur /api/auth/me:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}