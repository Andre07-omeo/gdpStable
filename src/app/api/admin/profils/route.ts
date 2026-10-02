// src/app/api/admin/profils/route.ts
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

    // ✅ Vérifier le rôle
    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // ✅ Récupérer les profils
    const profils = await query(
      `SELECT id_profil as id, code, libelle, permissions, niveauHierarchique
       FROM profil
       ORDER BY niveauHierarchique ASC, libelle ASC`
    );

    return NextResponse.json({
      success: true,
      data: profils,
    });
  } catch (error) {
    console.error('❌ Erreur /api/admin/profils:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}