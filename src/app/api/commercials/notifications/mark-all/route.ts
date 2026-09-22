// src/app/api/commercials/notifications/mark-all/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;

    await query(
      `UPDATE notifications 
       SET est_lu = 1, lu_le = NOW()
       WHERE id_utilisateur = ? AND est_lu = 0`,
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: (error as Error).message },
      { status: 500 }
    );
  }
}