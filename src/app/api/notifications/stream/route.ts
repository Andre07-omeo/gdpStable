// src/app/api/notifications/stream/route.ts
import { NextRequest } from 'next/server';
import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

// ✅ Interface nommée : plus lisible et réutilisable
interface NotificationIdRow extends RowDataPacket {
  id_notification: number;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('userId manquant', { status: 400 });
  }

  // ✅ Typage correct : tableau de NotificationIdRow
  const rows = await query<NotificationIdRow[]>(
    'SELECT id_notification FROM notifications WHERE id_utilisateur = ? AND lue = 0 ORDER BY date_creation DESC',
    [userId]
  );

  // ✅ rows[0] fonctionne maintenant
  const lastId = rows[0]?.id_notification ?? 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Envoi initial
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ lastId })}\n\n`)
      );

      // Polling simple
      const interval = setInterval(async () => {
        try {
          const newRows = await query<NotificationIdRow[]>(
            'SELECT id_notification FROM notifications WHERE id_utilisateur = ? AND lue = 0 AND id_notification > ? ORDER BY id_notification ASC',
            [userId, lastId]
          );

          if (newRows.length > 0) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ notifications: newRows })}\n\n`
              )
            );
          }
        } catch (error) {
          console.error('[stream] erreur polling:', error);
        }
      }, 5000);

      // Nettoyage à la fermeture
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_notification } = body;

    if (!id_notification) {
      return Response.json(
        { error: 'id_notification manquant' },
        { status: 400 }
      );
    }

    // ✅ execute() typé correctement
    await execute(
      'UPDATE notifications SET lue = 1 WHERE id_notification = ?',
      [id_notification]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('[stream POST] erreur:', error);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}