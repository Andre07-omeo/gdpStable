import { notify } from '../notifier';

interface Params {
  id_facture: number;
  numero_facture: string;
  id_commercial: number;
  validee: boolean;
  motifRejet?: string;
}

export async function onFactureValidated(p: Params) {
  if (p.validee) {
    await notify({
      userId: p.id_commercial,
      type: 'facture_validee',
      title: '✅ Facture validée',
      message: `Votre facture ${p.numero_facture} a été validée par la comptabilité.`,
      lien: `/dashboard/commercial/factures/${p.id_facture}`,
      metadata: {
        id_facture: p.id_facture,
        priorite: 'normal',
      },
    });
  } else {
    await notify({
      userId: p.id_commercial,
      type: 'facture_rejetee',
      title: '❌ Facture rejetée',
      message: `Votre facture ${p.numero_facture} a été rejetée. Motif : ${p.motifRejet || 'non précisé'}.`,
      lien: `/dashboard/commercial/factures/${p.id_facture}`,
      metadata: {
        id_facture: p.id_facture,
        priorite: 'urgent',
      },
    });
  }
}