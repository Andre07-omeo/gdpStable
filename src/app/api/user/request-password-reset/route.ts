// src/app/api/user/request-password-reset/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.id_user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer l'email
    const [users]: any = await db.query(
      `SELECT id_user, nom, prenom, email FROM user WHERE id_user = ?`,
      [payload.id_user]
    );
    if (!users.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    const user = users[0];

    // Invalider les anciens tokens
    await db.query(
      `UPDATE password_reset_tokens SET used = 1 WHERE id_user = ? AND used = 0`,
      [user.id_user]
    );

    // Générer token sécurisé
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db.query(
      `INSERT INTO password_reset_tokens (id_user, token_hash, expires_at)
       VALUES (?, ?, ?)`,
      [user.id_user, tokenHash, expiresAt]
    );

    // Envoyer l'email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({
      to: user.email,
      nom: user.nom,
      prenom: user.prenom,
      resetUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé.',
      email: user.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    });
  } catch (err) {
    console.error('❌ /api/user/request-password-reset:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}