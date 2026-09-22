// src/app/api/notifications/route.ts

import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const onlyUnread = searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant' }, { status: 400 });
    }

    const notifications = await query<any>(
      `SELECT id_notification, id_utilisateur, type, message, lien, est_lu, created_at
       FROM notifications
       WHERE id_utilisateur = ?
       ${onlyUnread ? 'AND est_lu = 0' : ''}
       ORDER BY created_at DESC
       LIMIT ?`,
      [Number(userId), limit]
    );

    const formatted = notifications.map((n: any) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(n.message);
      } catch {
        parsed = { title: 'Notification', message: n.message };
      }

      return {
        id: String(n.id_notification),
        type: n.type,
        title: parsed.title || 'Notification',
        message: parsed.message || n.message,
        lien: n.lien,
        isRead: n.est_lu === 1,
        createdAt: n.created_at,
        metadata: parsed.metadata || {},
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('❌ GET /api/notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_utilisateur, type, title, message, lien, metadata } = body;

    if (!id_utilisateur || !type || !title || !message) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    const payload = JSON.stringify({ title, message, metadata: metadata || {} });

    const result = await execute(
      `INSERT INTO notifications (id_utilisateur, type, message, lien, est_lu) VALUES (?, ?, ?, ?, 0)`,
      [Number(id_utilisateur), type, payload, lien || null]
    );

    return NextResponse.json({
      id: String(result.insertId),
      success: true,
    });
  } catch (error) {
    console.error('❌ POST /api/notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}