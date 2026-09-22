// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser,
  toggleUserStatus
} from '@/app/dashboard/admin/users/services/userService';
import { verifyAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET - Récupérer tous les utilisateurs
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.profil !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const filters = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      actif: searchParams.get('actif') ? searchParams.get('actif') === 'true' : undefined
    };

    const users = await getAllUsers(filters);
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Erreur GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Erreur lors du chargement des utilisateurs' },
      { status: 500 }
    );
  }
}

// POST - Créer un utilisateur
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.profil !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const data = await request.json();
    const user = await createUser(data);
    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Erreur POST /api/admin/users:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création' },
      { status: 500 }
    );
  }
}