// src/app/api/notifications/unread-count/route.ts
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// ✅ Interface nommée
interface CountRow extends RowDataPacket {
  count: number;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'userId manquant' }, { status: 400 });
  }

  try {
    // ✅ Typage correct : tableau de CountRow
    const rows = await query<CountRow[]>(
      'SELECT COUNT(*) AS count FROM notifications WHERE id_utilisateur = ? AND lue = 0',
      [userId]
    );

    // ✅ rows[0] fonctionne maintenant
    const unreadCount = rows[0]?.count ?? 0;

    return Response.json({ unreadCount });
  } catch (error) {
    console.error('[unread-count] erreur:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}