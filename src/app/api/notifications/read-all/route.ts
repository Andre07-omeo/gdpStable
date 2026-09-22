// src/app/api/notifications/read-all/route.ts

import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
    }

    await execute(
      `UPDATE notifications SET est_lu = 1 WHERE id_utilisateur = ? AND est_lu = 0`,
      [Number(userId)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ PATCH /api/notifications/read-all:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}