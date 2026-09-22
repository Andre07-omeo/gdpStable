// src/lib/notifications/cleanup.ts

import { execute } from '@/lib/db';

/**
 * Supprime les notifications lues il y a plus de 7 jours.
 */
export async function cleanupReadNotifications() {
  try {
    const result = await execute(
      `DELETE FROM notifications WHERE est_lu = 1 AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    console.log(`🧹 ${result.affectedRows} notification(s) lue(s) supprimée(s)`);
  } catch (error) {
    console.error('❌ cleanupReadNotifications:', error);
  }
}