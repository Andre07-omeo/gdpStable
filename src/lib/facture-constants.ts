// src/lib/facture-constants.ts
// ⚠️  Valeurs EXACTEMENT alignées sur les ENUM MySQL

export const FACTURE_MODE_PAIEMENT = ['comptant', 'tranche'] as const;
export type FactureModePaiement = typeof FACTURE_MODE_PAIEMENT[number];

export const TRANCHE_MODE_PAIEMENT = [
  'especes',
  'cheque',
  'virement',
  'carte',
  'mobile_money',
] as const;
export type TrancheModePaiement = typeof TRANCHE_MODE_PAIEMENT[number];

export const FACTURE_STATUT = ['brouillon', 'envoye', 'paye', 'annule'] as const;
export type FactureStatut = typeof FACTURE_STATUT[number];

export const TRANCHE_STATUT = ['en_attente', 'paye', 'retard'] as const;
export type TrancheStatut = typeof TRANCHE_STATUT[number];

export const MODE_PAIEMENT_LABELS: Record<TrancheModePaiement, string> = {
  especes: '💵 Espèces',
  cheque: '📝 Chèque',
  virement: '🏦 Virement',
  carte: '💳 Carte bancaire',
  mobile_money: '📱 Mobile Money',
};

export const FACTURE_MODE_PAIEMENT_LABELS: Record<FactureModePaiement, string> = {
  comptant: '💰 Comptant (paiement unique)',
  tranche: '📅 Échelonné (plusieurs tranches)',
};

export const TRANCHE_STATUT_LABELS: Record<TrancheStatut, string> = {
  en_attente: '⏳ En attente',
  paye: '✅ Payé',
  retard: '⚠️ En retard',
};

export const FACTURE_STATUT_LABELS: Record<FactureStatut, string> = {
  brouillon: '📝 Brouillon',
  envoye: '📤 Envoyé',
  paye: '✅ Payé',
  annule: '❌ Annulé',
};

export function getFactureModePaiement(nombreTranches: number): FactureModePaiement {
  return nombreTranches > 1 ? 'tranche' : 'comptant';
}

export function isValidTrancheModePaiement(value: string): value is TrancheModePaiement {
  return (TRANCHE_MODE_PAIEMENT as readonly string[]).includes(value);
}

export function isValidFactureStatut(value: string): value is FactureStatut {
  return (FACTURE_STATUT as readonly string[]).includes(value);
}
