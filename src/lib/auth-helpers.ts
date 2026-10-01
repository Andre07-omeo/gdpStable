// src/lib/auth-helpers.ts
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// 🎯 UNIQUE SUPER ADMIN AUTORISÉ
const SUPER_ADMIN_EMAIL = 'omeongaandre2@gmail.com';

export interface AuthCheckResult {
  ok: boolean;
  error?: string;
  email?: string;
  userId?: number;
  profil?: string;
}

// ============================================
// 🔐 DÉCODER LE JWT (même logique que middleware)
// ============================================
function decodeJwt(token: string): { email?: string; profil?: string; userId?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    // Décoder en UTF-8 (compatible Node & Edge)
    const jsonPayload =
      typeof atob !== 'undefined'
        ? decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : Buffer.from(base64, 'base64').toString('utf-8');

    const data = JSON.parse(jsonPayload);
    return {
      email: data.email || data.mail,
      profil: data.profil || data.role,
      userId: data.id || data.userId,
    };
  } catch {
    return null;
  }
}

/**
 * Vérifie que l'utilisateur est le SUPER ADMIN désigné
 * 🔒 Accès strictement réservé à omeongaandre2@gmail.com
 */
export async function requireSuperAdmin(req: NextRequest): Promise<AuthCheckResult> {
  try {
    // ============ SOURCE 1 : Cookie auth_token (ton système) ============
    const authToken =
      req.cookies.get('auth_token')?.value ||
      req.cookies.get('session_token')?.value ||
      req.cookies.get('token')?.value;

    let userEmail: string | null = null;
    let userProfil: string | null = null;
    let userId: number | undefined;

    if (authToken) {
      const decoded = decodeJwt(authToken);
      if (decoded?.email) {
        userEmail = decoded.email;
        userProfil = decoded.profil || null;
        userId = decoded.userId;
      }
    }

    // ============ SOURCE 2 : Header Authorization Bearer ============
    if (!userEmail) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = decodeJwt(token);
        if (decoded?.email) {
          userEmail = decoded.email;
          userProfil = decoded.profil || null;
          userId = decoded.userId;
        }
      }
    }

    // ============ SOURCE 3 : Header x-user-email (dev uniquement) ============
    // ⚠️ À RETIRER EN PRODUCTION
    if (!userEmail && process.env.NODE_ENV === 'development') {
      userEmail = req.headers.get('x-user-email');
    }

    if (!userEmail) {
      return { ok: false, error: 'Non authentifié. Veuillez vous reconnecter.' };
    }

    // 🔒 VÉRIFICATION STRICTE : seul omeongaandre2@gmail.com
    if (userEmail.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return {
        ok: false,
        error: `Accès refusé. Seul ${SUPER_ADMIN_EMAIL} peut accéder à cette fonctionnalité.`,
      };
    }

    // Vérifier en base (optionnel, pour cohérence)
    try {
      const [userRows]: any = await db.query(
        `SELECT id, email, profil FROM user WHERE email = ? LIMIT 1`,
        [userEmail]
      );

      if (userRows[0]) {
        return {
          ok: true,
          email: userRows[0].email,
          userId: userRows[0].id,
          profil: userRows[0].profil,
        };
      }
    } catch {
      // Table user peut ne pas exister → on accepte l'email du JWT
    }

    // Fallback : accepter l'email décodé du JWT
    return {
      ok: true,
      email: userEmail,
      profil: userProfil || 'SUPER_ADMIN',
      userId,
    };
  } catch (error) {
    console.error('Erreur auth check:', error);
    return { ok: false, error: "Erreur d'authentification" };
  }
}