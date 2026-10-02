// src/app/api/auth/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ============================================
// ✅ WHITELIST STRICTE : seuls ces champs sont modifiables par l'utilisateur
// ============================================
// ❌ INTERDIT : id_profil, actif, zone_niveau, zone_travail, id_manager,
//              email, mot_de_passe_hash, created_at, updated_at
const ALLOWED_FIELDS = [
  'nom',
  'prenom',
  'telephone',
  'sexe',
  'adresse',
  'code_postal',
] as const;

// Champs sensibles qu'on veut détecter pour logger une alerte
const FORBIDDEN_FIELDS = [
  'id_profil',
  'actif',
  'zone_niveau',
  'zone_travail',
  'id_manager',
  'email',
  'mot_de_passe_hash',
  'id_user',
] as const;

// ============================================
// AUTH : vérifier le JWT
// ============================================
function getUserIdFromToken(request: NextRequest): number | null {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return null;

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;
    return typeof userId === 'number' ? userId : Number(userId) || null;
  } catch {
    return null;
  }
}

// ============================================
// PUT — Mettre à jour le profil
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    // 🚨 Détecter les tentatives d'escalade de privilèges
    for (const field of FORBIDDEN_FIELDS) {
      if (field in body) {
        console.warn(
          `🚨 TENTATIVE D'ESCALADE — user ${userId} a essayé de modifier "${field}"`
        );
      }
    }

    // ✅ Whitelist : ne garder QUE les champs autorisés et non-vides
    const updates: Record<string, string> = {};
    for (const field of ALLOWED_FIELDS) {
      const value = body[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        updates[field] = value.trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour' },
        { status: 400 }
      );
    }

    // Construire la requête UPDATE dynamiquement
    const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    await query(
      `UPDATE user SET ${setClauses}, updated_at = NOW() WHERE id_user = ?`,
      [...values, userId]
    );

    // ✅ Récupérer l'utilisateur mis à jour (mêmes champs que /api/auth/me)
    const users = await query(
      `SELECT 
        u.id_user,
        u.id_profil,
        u.nom,
        u.prenom,
        u.email,
        u.sexe,
        u.adresse,
        u.code_postal,
        u.telephone,
        u.departement,
        u.fonction,
        u.actif,
        u.zone_travail,
        u.zone_niveau,
        u.derniere_connexion,
        u.created_at,
        u.updated_at,
        p.code as profil_code,
        p.libelle as profil_libelle
      FROM user u
      LEFT JOIN profil p ON u.id_profil = p.id_profil
      WHERE u.id_user = ?`,
      [userId]
    );

    const user = (users as any[])[0];
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable après mise à jour' },
        { status: 404 }
      );
    }

    // ✅ Même format que /api/auth/me
    return NextResponse.json({
      id: user.id_user,
      id_user: user.id_user,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      sexe: user.sexe,
      adresse: user.adresse,
      code_postal: user.code_postal,
      telephone: user.telephone,
      departement: user.departement,
      fonction: user.fonction,
      profil: user.profil_code || 'VISITEUR',
      profilLibelle: user.profil_libelle || 'Visiteur',
      id_profil: user.id_profil,
      actif: user.actif,
      zone_travail: user.zone_travail,
      zone_niveau: user.zone_niveau,
      derniere_connexion: user.derniere_connexion,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error: any) {
    console.error('❌ Erreur PUT /api/auth/profile:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}