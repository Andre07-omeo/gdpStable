// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ Récupérer l'utilisateur
    const users = await query(
      `SELECT 
        u.id_user,
        u.id_profil,
        u.nom,
        u.prenom,
        u.email,
        u.mot_de_passe_hash,
        u.actif,
        u.telephone,
        u.zone_travail,
        u.zone_niveau,
        p.code as profil_code,
        p.libelle as profil_libelle
      FROM user u
      LEFT JOIN profil p ON u.id_profil = p.id_profil
      WHERE u.email = ?`,
      [normalizedEmail]
    );

    const user = (users as any[])[0];

    if (!user || !user.actif) {
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.mot_de_passe_hash);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // ✅ Mettre à jour la dernière connexion
    await query(
      'UPDATE user SET derniere_connexion = NOW() WHERE id_user = ?',
      [user.id_user]
    );

    // ✅ Créer le token
    const token = jwt.sign(
      {
        userId: user.id_user,
        id_user: user.id_user,
        email: user.email,
        profil: user.profil_code || 'VISITEUR',
        profilLibelle: user.profil_libelle || 'Visiteur',
        id_profil: user.id_profil,
        nom: user.nom,
        prenom: user.prenom,
      },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    // ✅ Créer la réponse
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id_user,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        profil: user.profil_code || 'VISITEUR',
        profilLibelle: user.profil_libelle || 'Visiteur',
        id_profil: user.id_profil,
        telephone: user.telephone || '',
        derniere_connexion: new Date().toISOString(),
      },
    });

    // 🔥 DÉTECTION HTTPS : on ne met "secure: true" que si on est vraiment en HTTPS
    const isHttps =
      process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ||
      process.env.COOLIFY_URL?.startsWith('https://') ||
      request.headers.get('x-forwarded-proto') === 'https';

    // ✅ Poser le cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: !!isHttps,               // 👈 LA LIGNE QUI CHANGE TOUT
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('❌ Erreur login:', error);
    return NextResponse.json(
      { message: 'Erreur technique' },
      { status: 500 }
    );
  }
}