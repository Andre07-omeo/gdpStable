// src/lib/facture-constants.ts
// ⚠️  Toutes les valeurs DOIVENT correspondre EXACTEMENT aux ENUM MySQL

// TABLE facture
export const FACTURE_TYPE_DOCUMENT = ['proformat', 'facture', 'avoir'] as const;
export type FactureTypeDocument = typeof FACTURE_TYPE_DOCUMENT[number];

export const FACTURE_MODE_PAIEMENT = ['comptant', 'tranche'] as const;
export type FactureModePaiement = typeof FACTURE_MODE_PAIEMENT[number];

export const FACTURE_STATUT = ['brouillon', 'envoye', 'paye', 'annule'] as const;
export type FactureStatut = typeof FACTURE_STATUT[number];

// TABLE facture_tranche
export const TRANCHE_MODE_PAIEMENT = ['especes', 'cheque', 'virement', 'carte', 'mobile_money'] as const;
export type TrancheModePaiement = typeof TRANCHE_MODE_PAIEMENT[number];

export const TRANCHE_STATUT = ['en_attente', 'paye', 'retard'] as const;
export type TrancheStatut = typeof TRANCHE_STATUT[number];

// LABELS
export const FACTURE_TYPE_DOCUMENT_LABELS: Record<FactureTypeDocument, string> = {
  proformat: '📄 Proformat',
  facture: '📋 Facture',
  avoir: '↩️ Avoir',
};

export const FACTURE_MODE_PAIEMENT_LABELS: Record<FactureModePaiement, string> = {
  comptant: '💰 Comptant',
  tranche: '📅 Échelonné',
};

export const FACTURE_STATUT_LABELS: Record<FactureStatut, string> = {
  brouillon: '📝 Brouillon',
  envoye: '📤 Envoyé',
  paye: '✅ Payé',
  annule: '❌ Annulé',
};

export const TRANCHE_MODE_PAIEMENT_LABELS: Record<TrancheModePaiement, string> = {
  especes: '💵 Espèces',
  cheque: '📝 Chèque',
  virement: '🏦 Virement',
  carte: '💳 Carte',
  mobile_money: '📱 Mobile Money',
};

export const TRANCHE_STATUT_LABELS: Record<TrancheStatut, string> = {
  en_attente: '⏳ En attente',
  paye: '✅ Payé',
  retard: '⚠️ En retard',
};

// VALIDATION (type-safe)
export function isFactureTypeDocument(v: string): v is FactureTypeDocument {
  return (FACTURE_TYPE_DOCUMENT as readonly string[]).includes(v);
}
export function isFactureModePaiement(v: string): v is FactureModePaiement {
  return (FACTURE_MODE_PAIEMENT as readonly string[]).includes(v);
}
export function isFactureStatut(v: string): v is FactureStatut {
  return (FACTURE_STATUT as readonly string[]).includes(v);
}
export function isTrancheModePaiement(v: string): v is TrancheModePaiement {
  return (TRANCHE_MODE_PAIEMENT as readonly string[]).includes(v);
}
export function isTrancheStatut(v: string): v is TrancheStatut {
  return (TRANCHE_STATUT as readonly string[]).includes(v);
}

// HELPERS MÉTIER
export function getFactureModePaiement(nombreTranches: number): FactureModePaiement {
  return nombreTranches > 1 ? 'tranche' : 'comptant';
}

export function normaliserTypeDocument(valeur: any): FactureTypeDocument {
  const v = String(valeur || 'proformat').trim().toLowerCase();
  const alias: Record<string, FactureTypeDocument> = {
    proforma: 'proformat',
    proformat: 'proformat',
    facture: 'facture',
    avoir: 'avoir',
  };
  return alias[v] || 'proformat';
}

export function normaliserStatutFacture(valeur: any): FactureStatut {
  const v = String(valeur || 'brouillon').trim().toLowerCase();
  const alias: Record<string, FactureStatut> = {
    en_attente: 'brouillon',
    brouillon: 'brouillon',
    valide: 'envoye',
    envoye: 'envoye',
    payee: 'paye',
    paye: 'paye',
    rejetee: 'annule',
    annule: 'annule',
  };
  return alias[v] || 'brouillon';
}

export function normaliserTrancheModePaiement(valeur: any): TrancheModePaiement {
  const v = String(valeur || 'especes').trim().toLowerCase();
  return isTrancheModePaiement(v) ? v : 'especes';
}
