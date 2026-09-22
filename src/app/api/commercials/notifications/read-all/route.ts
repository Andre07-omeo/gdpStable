import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { execute } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // ✅ est_lu au lieu de lue
    await execute(
      `UPDATE notifications SET est_lu = 1 WHERE id_utilisateur = ? AND est_lu = 0`,
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur PATCH read-all:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}