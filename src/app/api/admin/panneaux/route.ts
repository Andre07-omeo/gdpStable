// ============================================
// API ADMIN - PANNEAUX
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { PanneauService } from '@/app/dashboard/admin/services/panneauService';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET - Récupérer tous les panneaux
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier les permissions (admin uniquement)
    if (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const panneaux = await PanneauService.getAll();
    return NextResponse.json({ success: true, data: panneaux });
  } catch (error) {
    console.error('Erreur GET /api/admin/panneaux:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des panneaux' },
      { status: 500 }
    );
  }
}

// POST - Créer un panneau
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const panneau = await PanneauService.create(body);
    return NextResponse.json({ success: true, data: panneau });
  } catch (error) {
    console.error('Erreur POST /api/admin/panneaux:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création du panneau' },
      { status: 500 }
    );
  }
}