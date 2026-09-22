// src/app/api/notifications/[id]/route.ts

import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await execute(
      `UPDATE notifications SET est_lu = 1 WHERE id_notification = ?`,
      [Number(params.id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ PATCH /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await execute(
      `DELETE FROM notifications WHERE id_notification = ?`,
      [Number(params.id)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ DELETE /api/notifications/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}