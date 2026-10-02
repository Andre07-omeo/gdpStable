// src/app/api/auth/request-password-reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // ✅ Chercher l'utilisateur
    const users = await query(
      `SELECT id_user, nom, prenom, email FROM user WHERE LOWER(email) = ? LIMIT 1`,
      [emailLower]
    );

    const user = (users as any[])[0];

    // ⚠️ SÉCURITÉ : Ne PAS révéler si l'email existe ou pas
    // → On renvoie TOUJOURS un succès, même si l'utilisateur n'existe pas
    if (!user) {
      console.warn(`⚠️ Reset demandé pour email inconnu: ${emailLower}`);
      return NextResponse.json({
        message: 'Si cet email existe, un lien vous a été envoyé.',
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    // ✅ Générer un token court (15 min) et à usage unique
    const resetToken = jwt.sign(
      {
        id_user: user.id_user,
        email: user.email,
        purpose: 'password-reset',
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // ✅ Construire l'URL de reset
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // ✅ Envoyer l'email
    try {
      await await sendPasswordResetEmail({
  to: user.email,
  nom: user.nom,
  prenom: user.prenom,
  resetUrl,
});
      console.log(`✅ Email de reset envoyé à ${user.email}`);
    } catch (mailError: any) {
      console.error('❌ Erreur envoi email:', mailError);
      // On ne dit PAS à l'utilisateur que l'email a échoué (sécurité)
      // mais on log côté serveur
    }

    // ✅ Réponse neutre
    return NextResponse.json({
      message: 'Si cet email existe, un lien vous a été envoyé.',
    });
  } catch (error: any) {
    console.error('❌ Erreur request-password-reset:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}