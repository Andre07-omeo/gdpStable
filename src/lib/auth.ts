// ============================================
// AUTHENTIFICATION - VÉRIFICATION
// ============================================

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

// ============================================
// TYPES
// ============================================

export interface TokenPayload {
  id_user: number;    // ✅ aligné sur l'usage réel dans les routes
  email: string;
  profil: string;
}

// ============================================
// VÉRIFICATION JWT (synchrone)
// ============================================

export function verifyToken(token: string): TokenPayload | null {
  if (!token) return null;
  try {
    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as TokenPayload;
  } catch (error) {
    console.error('Erreur verifyToken:', error);
    return null;
  }
}

// ============================================
// VÉRIFICATION COMPLÈTE (async + BDD)
// ============================================

export async function verifyAuth(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as {
      id_user: number;   // ✅ aligné aussi
      email: string;
      profil: string;
    };

    const user = await prisma.user.findUnique({
      where: { id_user: decoded.id_user },   // ✅ aligné
      include: { profil: true }
    });

    if (!user || !user.actif) {
      return null;
    }

    return {
      id: user.id_user,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      profil: user.profil.code,
      profilId: user.id_profil
    };
  } catch (error) {
    console.error('Erreur verifyAuth:', error);
    return null;
  }
}