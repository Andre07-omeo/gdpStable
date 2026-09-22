import { notify, notifyRole } from '../notifier';

interface Params {
  id_message: number;
  expediteurNom: string;
  sujet: string;
  contenu: string;
  destinataires: 'ALL' | 'COMMERCIAL' | number[];
}

export async function onMessageFromChef(p: Params) {
  const commonParams = {
    type: 'message_from_chef' as const,
    title: `💬 Message de ${p.expediteurNom}`,
    message: `${p.sujet} : ${p.contenu.slice(0, 100)}${p.contenu.length > 100 ? '…' : ''}`,
    lien: `/dashboard/commercial/messages/${p.id_message}`,
    metadata: {
      id_message: p.id_message,
      priorite: 'high' as const,
    },
  };

  if (Array.isArray(p.destinataires)) {
    await notify({ userId: p.destinataires, ...commonParams });
  } else {
    const role = p.destinataires === 'ALL' ? 'COMMERCIAL' : p.destinataires;
    await notifyRole(role, commonParams);
  }
}