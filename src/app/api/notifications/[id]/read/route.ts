// src/app/api/notifications/[id]/read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    await execute(
      'UPDATE notifications SET lue = 1 WHERE id_notification = ?',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Erreur PATCH /notifications/[id]/read :', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}