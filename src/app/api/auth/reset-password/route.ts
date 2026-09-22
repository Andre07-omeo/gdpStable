// src/app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Mot de passe : minimum 8 caractères' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // ✅ Récupérer le token valide (non utilisé, non expiré)
    const rows = (await query(
      `SELECT id, id_user
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used = 0
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    )) as any[];

    const record = rows[0];
    if (!record) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 400 }
      );
    }

    // ✅ Hasher le nouveau mot de passe
    const newHash = await bcrypt.hash(password, 10);

    // ✅ Mettre à jour le mot de passe + marquer le token comme utilisé
    await query(
      `UPDATE user SET mot_de_passe_hash = ?, updated_at = NOW() WHERE id_user = ?`,
      [newHash, record.id_user]
    );

    await query(
      `UPDATE password_reset_tokens SET used = 1 WHERE id = ?`,
      [record.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Mot de passe modifié !',
    });
  } catch (err) {
    console.error('❌ reset-password:', err);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}