// src/lib/notifications/notifier.ts
import { query, execute } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { NotificationType } from './types';

// ============================================
// Types
// ============================================
interface UserRow extends RowDataPacket {
  id_utilisateur: number;
}

interface RoleUserRow extends RowDataPacket {
  id_utilisateur: number;
}

export interface NotificationPayload {
  id_utilisateur: number;
  titre: string;
  message: string;
  type?: string;
  lien?: string;
}

export interface NotificationMetadata {
  id_reservation?: number;
  id_panneau?: number;
  id_face?: number;
  id_client?: number;
  id_facture?: number;
  id_message?: number;
  societeLocatrice?: string;
  panneauNom?: string;
  faceOrientation?: string;
  clientNom?: string;
  commercialNom?: string;
  numeroCommande?: string;
  joursRestants?: number;
  nombreMois?: number;
  adresse?: string;
  priorite?: 'low' | 'normal' | 'high' | 'urgent';
  [key: string]: unknown;
}

/** ✅ Format haut niveau utilisé par les triggers */
export interface NotifyOptions {
  userId: number | number[];     // 👈 accepte plusieurs users
  type: NotificationType | string;
  title: string;
  message: string;
  lien?: string;
  metadata?: NotificationMetadata;
}

/** ✅ Format pour notifyRole */
export interface NotifyRoleOptions {
  type: NotificationType | string;
  title: string;
  message: string;
  lien?: string;
  metadata?: NotificationMetadata;
}

// ============================================
// Bas niveau
// ============================================

export async function createNotification(payload: NotificationPayload): Promise<number> {
  const result = await execute(
    `INSERT INTO notifications (id_utilisateur, titre, message, type, lien, lue, date_creation)
     VALUES (?, ?, ?, ?, ?, 0, NOW())`,
    [
      payload.id_utilisateur,
      payload.titre,
      payload.message,
      payload.type ?? 'info',
      payload.lien ?? null,
    ]
  );
  return result.insertId;
}

export async function getActiveUserIds(): Promise<number[]> {
  const users = await query<UserRow[]>(
    'SELECT id_utilisateur FROM utilisateurs WHERE actif = 1'
  );
  return users.map((u) => u.id_utilisateur);
}

export async function notifyUsers(
  userIds: number[],
  titre: string,
  message: string,
  type: string = 'info',
  lien?: string
): Promise<void> {
  if (userIds.length === 0) return;

  const values = userIds.map((id) => [id, titre, message, type, lien ?? null]);
  const placeholders = values.map(() => '(?, ?, ?, ?, ?, 0, NOW())').join(', ');
  const flatParams = values.flat();

  await execute(
    `INSERT INTO notifications (id_utilisateur, titre, message, type, lien, lue, date_creation)
     VALUES ${placeholders}`,
    flatParams
  );
}

export async function broadcast(
  titre: string,
  message: string,
  type: string = 'info',
  lien?: string
): Promise<void> {
  const userIds = await getActiveUserIds();
  await notifyUsers(userIds, titre, message, type, lien);
}

// ============================================
// ✅ notify : accepte objet (1 ou N users) OU args séparés
// ============================================

export async function notify(
  optionsOrPayload: NotifyOptions | NotificationPayload | number,
  titre?: string,
  message?: string,
  type: string = 'info',
  lien?: string
): Promise<number | void> {
  // Cas 1 : arguments séparés → un seul user
  if (typeof optionsOrPayload === 'number') {
    if (titre === undefined || message === undefined) {
      throw new Error('notify: titre et message sont requis');
    }
    return createNotification({
      id_utilisateur: optionsOrPayload,
      titre,
      message,
      type,
      lien,
    });
  }

  // Cas 2 : payload SQL bas niveau
  if ('id_utilisateur' in optionsOrPayload) {
    return createNotification(optionsOrPayload as NotificationPayload);
  }

  // Cas 3 : format trigger
  const opts = optionsOrPayload as NotifyOptions;

  if (opts.userId === undefined || !opts.title || !opts.message) {
    throw new Error('notify: userId, title et message sont requis');
  }

  // 👉 Plusieurs destinataires
  if (Array.isArray(opts.userId)) {
    await notifyUsers(opts.userId, opts.title, opts.message, opts.type, opts.lien);
    return;
  }

  // 👉 Un seul destinataire
  return createNotification({
    id_utilisateur: opts.userId,
    titre: opts.title,
    message: opts.message,
    type: opts.type,
    lien: opts.lien,
  });
}

// ============================================
// ✅ notifyRole : accepte args séparés OU un objet
// ============================================

export async function notifyRole(
  role: string | string[],
  titreOrOptions: string | NotifyRoleOptions,
  message?: string,
  type: string = 'info',
  lien?: string
): Promise<void> {
  const roles = Array.isArray(role) ? role : [role];
  if (roles.length === 0) return;

  // 👉 Détection : soit on reçoit un objet, soit des args séparés
  let titre: string;
  let msg: string;
  let typ: string;
  let lnk: string | undefined;

  if (typeof titreOrOptions === 'object') {
    titre = titreOrOptions.title;
    msg = titreOrOptions.message;
    typ = titreOrOptions.type;
    lnk = titreOrOptions.lien;
  } else {
    if (message === undefined) {
      throw new Error('notifyRole: message est requis');
    }
    titre = titreOrOptions;
    msg = message;
    typ = type;
    lnk = lien;
  }

  const placeholders = roles.map(() => '?').join(', ');
  const users = await query<RoleUserRow[]>(
    `SELECT DISTINCT id_utilisateur
     FROM utilisateurs
     WHERE actif = 1 AND role IN (${placeholders})`,
    roles
  );

  const userIds = users.map((u) => u.id_utilisateur);
  await notifyUsers(userIds, titre, msg, typ, lnk);
}