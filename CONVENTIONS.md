# Conventions de la base de données

## Règle d'or
Toutes les valeurs ENUM sont en MINUSCULES.

## ENUM de référence

| Table | Colonne | Valeurs |
|---|---|---|
| facture | type_document | proformat, facture, avoir |
| facture | mode_paiement | comptant, tranche |
| facture | statut | brouillon, envoye, paye, annule |
| facture_tranche | mode_paiement | especes, cheque, virement, carte, mobile_money |
| facture_tranche | statut | en_attente, paye, retard |

## Erreurs à éviter

| Interdit | Correct |
|---|---|
| 'EN_ATTENTE' | 'brouillon' |
| 'VALIDE' | 'envoye' |
| 'REJETEE' | 'annule' |
| 'PAYEE' | 'paye' |
| 'PROFORMA' | 'proformat' |

## Commandes utiles
- npm run test:enums : vérifie les ENUM
- npm run check:all : TypeScript + ENUM
