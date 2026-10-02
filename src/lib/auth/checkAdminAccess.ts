// src/lib/auth/checkAdminAccess.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const ALLOWED_PROFILES = ['SUPER_ADMIN', 'ADMIN'];

export interface AuthCheckResult {
  ok: boolean;
  status?: number;
  error?: string;
  id_user?: number;
  email?: string;
  profil?: string;
}

/**
 * Vérifie que la requête vient d'un utilisateur ADMIN ou SUPER_ADMIN.
 * Retourne { ok: true, id_user, email, profil } si autorisé.
 */
export function checkAdminAccess(request: NextRequest): AuthCheckResult {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return { ok: false, status: 401, error: 'Non authentifié' };
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return { ok: false, status: 500, error: 'Configuration serveur invalide' };
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return { ok: false, status: 401, error: 'Token invalide ou expiré' };
    }

    const profil = String(decoded.profil || '').toUpperCase();
    if (!ALLOWED_PROFILES.includes(profil)) {
      return { ok: false, status: 403, error: 'Accès refusé' };
    }

    return {
      ok: true,
      id_user: decoded.id_user ?? decoded.userId ?? decoded.id,
      email: decoded.email || '',
      profil,
    };
  } catch (error) {
    console.error('❌ Erreur checkAdminAccess:', error);
    return { ok: false, status: 500, error: 'Erreur serveur' };
  }
}