// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/app/dashboard/admin/users/services';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET - Récupérer un utilisateur par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.profil !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const user = await getUserById(parseInt(params.id));
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Erreur GET /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.profil !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const data = await request.json();
    const user = await updateUser(parseInt(params.id), data);
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Erreur PUT /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.profil !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await deleteUser(parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur DELETE /api/admin/users/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la suppression' },
      { status: 500 }
    );
  }
}