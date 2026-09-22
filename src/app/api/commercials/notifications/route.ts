// src/app/api/commercials/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    } catch {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const userId = decoded.id_user ?? decoded.userId ?? decoded.id;
    if (!userId) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // ✅ Requête propre — plus d'accents, plus de fautes
    const rows = await query(
      `SELECT 
         id_notification AS id,
         type,
         titre,
         message,
         lien,
         est_lu          AS isRead,
         cree_le         AS createdAt
       FROM notifications
       WHERE id_utilisateur = ?
       ORDER BY cree_le DESC
       LIMIT 100`,
      [userId]
    );

    const notifications = (rows as any[]).map((n) => ({
      id: n.id,
      type: n.type || 'info',
      title: n.titre || deriveTitle(n.type, n.message || ''),
      message: n.message || '',
      lien: n.lien,
      isRead: n.isRead === 1 || n.isRead === true,
      createdAt: n.createdAt,
    }));

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('❌ Erreur GET notifications:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// Fallback si `titre` est vide
// ============================================
function deriveTitle(type: string | null, message: string): string {
  const map: Record<string, string> = {
    reservation_created:  '🎯 Nouvelle réservation',
    campaign_ending_soon: '⏰ Campagne bientôt terminée',
    campaign_started:     '🚀 Campagne démarrée',
    panneau_problem:      '⚠️ Panneau en panne',
    panneau_created:      '🆕 Nouveau panneau',
    message_from_chef:    '💬 Message du chef',
    facture_valide:       '✅ Facture validée',
    facture_validee:      '✅ Facture validée',
    facture_rejetee:      '❌ Facture rejetée',
  };
  if (type && map[type]) return map[type];

  const firstLine = message.split('\n')[0].trim();
  return firstLine.length > 60 ? firstLine.slice(0, 60) + '…' : firstLine || 'Notification';
}