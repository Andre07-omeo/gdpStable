// src/app/api/user/update/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

const ALLOWED_FIELDS = [
  'nom', 'prenom', 'sexe', 'adresse', 'code_postal',
  'telephone', 'departement', 'fonction', 'email',
];

export async function PUT(req: Request) {
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.id_user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await req.json();

    // Validation minimale
    if (!body.nom?.trim() || !body.prenom?.trim()) {
      return NextResponse.json({ error: 'Nom et prénom obligatoires' }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }
    if (body.telephone && !/^\+?[0-9\s-]{8,20}$/.test(body.telephone)) {
      return NextResponse.json({ error: 'Téléphone invalide' }, { status: 400 });
    }

    // Construire la requête dynamiquement (seulement les champs autorisés)
    const fields: string[] = [];
    const values: any[] = [];
    for (const key of ALLOWED_FIELDS) {
      if (body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (!fields.length) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 });
    }

    values.push(payload.id_user);

    await db.query(
      `UPDATE user SET ${fields.join(', ')}, updated_at = NOW() WHERE id_user = ?`,
      values
    );

    // Retourner l'utilisateur à jour
    const [rows]: any = await db.query(
      `SELECT id_user, id_profil, nom, prenom, sexe, adresse, code_postal,
              telephone, departement, fonction, email, actif,
              derniere_connexion, created_at
       FROM user WHERE id_user = ?`,
      [payload.id_user]
    );

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('❌ /api/user/update:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}