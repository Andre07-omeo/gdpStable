// src/lib/notifications/types.ts

export type NotificationType =
  | 'reservation_created'
  | 'campaign_ending_soon'
  | 'campaign_started'
  | 'panneau_problem'
  | 'panneau_created'
  | 'message_from_chef'
  | 'facture_validee'
  | 'facture_rejetee';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  lien?: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: {
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
    joursRestants?: number;
    nombreMois?: number;
    commercialNom?: string;
    adresse?: string;
    priorite?: 'low' | 'normal' | 'high' | 'urgent';
  };
}

export interface NotificationCount {
  total: number;
  unread: number;
}

export const NOTIFICATION_PRIORITY: Record<NotificationType, 'low' | 'normal' | 'high' | 'urgent'> = {
  reservation_created: 'high',
  campaign_ending_soon: 'urgent',
  campaign_started: 'normal',
  panneau_problem: 'urgent',
  panneau_created: 'low',
  message_from_chef: 'high',
  facture_validee: 'normal',
  facture_rejetee: 'urgent',
};

export const NOTIFICATION_COLORS: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  reservation_created: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  campaign_ending_soon: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
  campaign_started: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
  panneau_problem: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
  panneau_created: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600' },
  message_from_chef: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
  facture_validee: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
  facture_rejetee: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
};