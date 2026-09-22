import { notifyRole } from '../notifier';

interface Params {
  id_panneau: number;
  nom: string;
  adresse: string;
  creePar: string;
}

export async function onPanneauCreated(p: Params) {
  await notifyRole('COMMERCIAL', {
    type: 'panneau_created',
    title: '🆕 Nouveau panneau disponible',
    message: `Le panneau "${p.nom}" (${p.adresse}) vient d'être ajouté par ${p.creePar}.`,
    lien: `/dashboard/commercial/panneaux/${p.id_panneau}`,
    metadata: {
      id_panneau: p.id_panneau,
      panneauNom: p.nom,
      adresse: p.adresse,
      priorite: 'low',
    },
  });
}