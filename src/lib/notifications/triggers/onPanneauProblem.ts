import { notifyRole } from '../notifier';

interface Params {
  id_panneau: number;
  id_face?: number;
  panneauNom: string;
  faceOrientation?: string;
  description: string;
}

export async function onPanneauProblem(p: Params) {
  const msg = p.id_face
    ? `⚠️ Problème signalé sur la face ${p.faceOrientation} du panneau "${p.panneauNom}" : ${p.description}`
    : `⚠️ Problème signalé sur le panneau "${p.panneauNom}" : ${p.description}`;

  const commonParams = {
    type: 'panneau_problem' as const,
    title: '⚠️ Panneau en panne',
    message: msg,
    lien: `/dashboard/commercial/panneaux/${p.id_panneau}`,
    metadata: {
      id_panneau: p.id_panneau,
      id_face: p.id_face,
      panneauNom: p.panneauNom,
      faceOrientation: p.faceOrientation,
      priorite: 'urgent' as const,
    },
  };

  await notifyRole('COMMERCIAL', commonParams);
  await notifyRole('CHEF_COMMERCIAL', commonParams);
}