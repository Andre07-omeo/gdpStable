import { NextRequest, NextResponse } from 'next/server';
import { PanneauService } from '@/app/dashboard/admin/services/panneauService';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const panneau = await PanneauService.getById(params.id);
    if (!panneau) {
      return NextResponse.json({ error: 'Panneau non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: panneau });
  } catch (error) {
    console.error('Erreur GET /api/admin/panneaux/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement du panneau' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const panneau = await PanneauService.update(params.id, body);
    return NextResponse.json({ success: true, data: panneau });
  } catch (error) {
    console.error('Erreur PUT /api/admin/panneaux/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (auth.profil !== 'SUPER_ADMIN' && auth.profil !== 'ADMIN_SYSTEM') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await PanneauService.delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE /api/admin/panneaux/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}