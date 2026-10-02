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

    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // ✅ ADMIN ne peut PAS voir SUPER_ADMIN dans la liste des rôles
    const isSuperAdmin = profil === 'SUPER_ADMIN';
    const isFounder = String(decoded.email || '').toLowerCase() === 'omeongaandre2@gmail.com';

    let profils;
    if (isSuperAdmin && isFounder) {
      // Le fondateur voit TOUS les rôles
      profils = await query(
        `SELECT id_profil as id, code, libelle, permissions, niveauHierarchique
         FROM profil
         ORDER BY niveauHierarchique ASC, libelle ASC`
      );
    } else if (isSuperAdmin) {
      // Un SUPER_ADMIN non-fondateur voit tout SAUF SUPER_ADMIN
      profils = await query(
        `SELECT id_profil as id, code, libelle, permissions, niveauHierarchique
         FROM profil
         WHERE code != 'SUPER_ADMIN'
         ORDER BY niveauHierarchique ASC, libelle ASC`
      );
    } else {
      // ADMIN : voit tout SAUF SUPER_ADMIN et ADMIN
      profils = await query(
        `SELECT id_profil as id, code, libelle, permissions, niveauHierarchique
         FROM profil
         WHERE code NOT IN ('SUPER_ADMIN', 'ADMIN')
         ORDER BY niveauHierarchique ASC, libelle ASC`
      );
    }

    return NextResponse.json({ success: true, data: profils });
  } catch (error) {
    console.error('❌ Erreur /api/admin/profils:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}