// src/app/api/admin/profils/route.ts
// ============================================
// API - LISTE DES PROFILS
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // ✅ Utiliser mysql2 au lieu de prisma
    const profils = await query(
      `SELECT id_profil, code, libelle 
       FROM profil 
       ORDER BY code ASC`
    );

    return NextResponse.json({
      success: true,
      data: (profils as any[]).map((p: any) => ({
        id: p.id_profil,
        code: p.code,
        libelle: p.libelle,
      })),
    });
  } catch (error) {
    console.error('Erreur GET /api/admin/profils:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des profils' },
      { status: 500 }
    );
  }
}