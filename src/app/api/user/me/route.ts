// src/app/api/user/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.id_user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const [rows]: any = await db.query(
      `SELECT 
         id_user, id_profil, nom, prenom, sexe, adresse, code_postal,
         telephone, departement, fonction, email, actif,
         derniere_connexion, created_at
       FROM user 
       WHERE id_user = ?`,
      [payload.id_user]
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error('❌ /api/user/me:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}