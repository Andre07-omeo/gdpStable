'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/FactureValidationModal.tsximport React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Loader2,
  AlertCircle,
  DollarSign,
  Eye,
  Building2,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface FactureValidationModalProps {
  facture: any;
  mode?: 'details' | 'valider' | 'rejeter';
  onClose: () => void;
  onConfirm: (
    id: number,
    montant: number,
    modePaiement: string,
    nombreTranches: number
  ) => Promise<void>;
  onReject: (id: number, motif: string) => Promise<void>;
  loading: boolean;
  formatPrice: (price: number) => string;
}

export function FactureValidationModal({
  facture,
  mode: initialMode = 'details',
  onClose,
  onConfirm,
  onReject,
  loading,
  formatPrice,
}: FactureValidationModalProps) {
  const [action, setAction] = useState<'details' | 'valider' | 'rejeter' | null>(
    initialMode
  );
  const [modePaiement, setModePaiement] = useState<'comptant' | 'tranche'>(
    'comptant'
  );
  const [nombreTranches, setNombreTranches] = useState(2);
  const [montantRecu, setMontantRecu] = useState<number>(0);
  const [motifRejet, setMotifRejet] = useState('');

  const totalFacture = Number(facture.total_ttc || facture.total_ht || 0);
  const montantPaye = Number(facture.montant_paye || 0);
  const montantRestant = Math.max(0, totalFacture - montantPaye);

  // ✅ Initialisation du montant à encaisser
  useEffect(() => {
    if (modePaiement === 'tranche' && nombreTranches > 0) {
      setMontantRecu(montantRestant / nombreTranches);
    } else {
      setMontantRecu(montantRestant);
    }
  }, [modePaiement, nombreTranches, montantRestant]);

  // ✅ Synchronisation du mode initial
  useEffect(() => {
    if (initialMode) {
      setAction(initialMode);
    }
  }, [initialMode]);

  // ✅ Validation & Encaissement (UN SEUL bouton)
  const handleConfirm = async () => {
    if (montantRecu <= 0) {
      alert('⚠️ Le montant doit être supérieur à 0');
      return;
    }
    if (montantRecu > montantRestant) {
      alert(
        `⚠️ Le montant ne peut pas dépasser le reste à payer (${formatPrice(
          montantRestant
        )})`
      );
      return;
    }

    console.log('🚀 [Modal] Envoi validation:', {
      id_facture: facture.id_facture,
      montant_recu: montantRecu,
      mode_paiement: modePaiement,
      nombre_tranches: nombreTranches,
    });

    await onConfirm(
      facture.id_facture,
      montantRecu,
      modePaiement,
      nombreTranches
    );
  };

  // ✅ Rejet
  const handleReject = async () => {
    if (!motifRejet.trim()) {
      alert('⚠️ Veuillez saisir un motif de rejet');
      return;
    }
    await onReject(facture.id_facture, motifRejet);
  };

  const getTitle = () => {
    if (action === 'rejeter') return 'Rejeter la facture';
    if (action === 'valider') return 'Valider la facture';
    return 'Détails de la facture';
  };

  const getIcon = () => {
    if (action === 'rejeter') return <X size={20} className="text-red-600" />;
    if (action === 'valider')
      return <Check size={20} className="text-green-600" />;
    return <Eye size={20} className="text-blue-600" />;
  };

  const getIconBg = () => {
    if (action === 'rejeter') return 'bg-red-100';
    if (action === 'valider') return 'bg-green-100';
    return 'bg-blue-100';
  };

  // ✅ Statut de la facture
  const isPayee = facture.statut === 'PAYEE';
  const isRejetee = facture.statut === 'REJETEE';
  const isActionPossible = !isPayee && !isRejetee;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBg()}`}
            >
              {getIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
              <p className="text-sm text-gray-500">{facture.numero_facture}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Récapitulatif */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-bold text-gray-700 mb-3">Récapitulatif</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-medium">{facture.client_nom || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Commercial</p>
                  <p className="font-medium">
                    {`${facture.commercial_prenom || ''} ${
                      facture.commercial_nom || ''
                    }`.trim() || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Échéance</p>
                  <p className="font-medium">
                    {facture.date_echeance
                      ? new Date(facture.date_echeance).toLocaleDateString(
                          'fr-FR'
                        )
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="font-medium">{facture.statut || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-bold text-blue-600">
                  {formatPrice(totalFacture)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Déjà payé</p>
                <p className="font-bold text-green-600">
                  {formatPrice(montantPaye)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reste</p>
                <p className="font-bold text-orange-600">
                  {formatPrice(montantRestant)}
                </p>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* MODE : DÉTAILS (avec choix Valider / Rejeter) */}
          {/* ============================================ */}
          {action === 'details' && (
            <div className="space-y-4">
              {/* Message si la facture est déjà traitée */}
              {!isActionPossible && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                  <p className="text-sm text-gray-600 text-center font-medium">
                    {isPayee && '💰 Cette facture est déjà payée.'}
                    {isRejetee && '❌ Cette facture a été rejetée.'}
                  </p>
                </div>
              )}

              {/* Boutons Valider / Rejeter */}
              {isActionPossible && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setAction('valider')}
                    className="p-6 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition"
                  >
                    <div className="text-4xl mb-2">✅</div>
                    <h3 className="font-bold text-green-700">Valider</h3>
                    <p className="text-sm text-gray-500">
                      Activer les réservations
                    </p>
                  </button>

                  <button
                    onClick={() => setAction('rejeter')}
                    className="p-6 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition"
                  >
                    <div className="text-4xl mb-2">❌</div>
                    <h3 className="font-bold text-red-700">Rejeter</h3>
                    <p className="text-sm text-gray-500">
                      Rejeter avec un motif
                    </p>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================ */}
          {/* MODE : VALIDER (UN SEUL bouton) */}
          {/* ============================================ */}
          {action === 'valider' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <AlertCircle size={16} className="inline mr-2" />
                  La validation activera automatiquement toutes les réservations
                  liées à cette facture et enregistrera le paiement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode de paiement
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) =>
                      setModePaiement(e.target.value as 'comptant' | 'tranche')
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="comptant">Comptant</option>
                    <option value="tranche">Par tranche</option>
                  </select>
                </div>

                {modePaiement === 'tranche' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de tranches
                    </label>
                    <select
                      value={nombreTranches}
                      onChange={(e) =>
                        setNombreTranches(parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {[2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} tranches
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant à encaisser{' '}
                    {modePaiement === 'tranche' && ' (Tranche 1)'}
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      value={montantRecu}
                      onChange={(e) =>
                        setMontantRecu(parseFloat(e.target.value) || 0)
                      }
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max={montantRestant}
                      step="100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Reste à payer: {formatPrice(montantRestant)}
                  </p>
                </div>
              </div>

              {/* UN SEUL BOUTON : Valider & Encaisser */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setAction('details')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
                  disabled={loading}
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={
                    loading || montantRecu <= 0 || montantRecu > montantRestant
                  }
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {modePaiement === 'tranche'
                    ? 'Valider la 1ère tranche'
                    : 'Valider & Encaisser'}
                </button>
              </div>
            </div>
          )}

          {/* ============================================ */}
          {/* MODE : REJETER */}
          {/* ============================================ */}
          {action === 'rejeter' && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <AlertCircle size={16} className="inline mr-2" />
                  Cette action est irréversible. La facture sera marquée comme
                  rejetée.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motif du rejet <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motifRejet}
                  onChange={(e) => setMotifRejet(e.target.value)}
                  placeholder="Expliquez la raison du rejet..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none h-24"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setAction('details')}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold transition"
                  disabled={loading}
                >
                  Retour
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading || !motifRejet.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}