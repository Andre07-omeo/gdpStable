import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    // ✅ est_lu au lieu de lue
    await execute(`UPDATE notifications SET est_lu = 1 WHERE id_notification = ?`, [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur PATCH read:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}