// src/app/dashboard/commercial/components/ProlongationModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  DollarSign,
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProlongationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation: {
    id_reservation: number;
    numero_commande: string;
    id_face: number;
    panneau_nom: string;
    face_orientation: string;
    date_debut_campagne: string;
    date_fin_campagne: string;
    client_nom: string;
    prix_vente_net: number;
  } | null;
}

export function ProlongationModal({
  isOpen,
  onClose,
  onSuccess,
  reservation,
}: ProlongationModalProps) {
  const [nouvelleDateFin, setNouvelleDateFin] = useState('');
  const [montantProlongation, setMontantProlongation] = useState<number>(0);
  const [modePaiement, setModePaiement] = useState('comptant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joursRestants, setJoursRestants] = useState(0);

  useEffect(() => {
    if (reservation) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateFin = new Date(reservation.date_fin_campagne);
      dateFin.setHours(0, 0, 0, 0);
      const diffMs = dateFin.getTime() - today.getTime();
      const jours = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setJoursRestants(jours);

      // Par défaut, proposer une date 30 jours après la date de fin actuelle
      const defaultDate = new Date(dateFin);
      defaultDate.setDate(defaultDate.getDate() + 30);
      setNouvelleDateFin(defaultDate.toISOString().split('T')[0]);

      setMontantProlongation(reservation.prix_vente_net || 0);
    }
  }, [reservation]);

  const handleSubmit = async () => {
    if (!reservation) return;

    if (!nouvelleDateFin) {
      setError('Veuillez choisir une nouvelle date de fin');
      return;
    }

    if (montantProlongation <= 0) {
      setError('Veuillez saisir un montant supérieur à 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/commercials/reservations/${reservation.id_reservation}/prolonger`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nouvelle_date_fin: nouvelleDateFin,
            montant_prolongation: montantProlongation,
            mode_paiement: modePaiement,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Demander si l'utilisateur veut imprimer la facture
        const imprimer = confirm(
          `✅ Prolongation réussie !\n\n` +
          `Nouvelle date fin: ${nouvelleDateFin}\n` +
          `Jours ajoutés: ${data.data.jours_prolongation}\n` +
          `${data.data.futures_reservations_decalees} réservation(s) future(s) décalée(s)\n` +
          `Facture: ${data.data.numero_facture_prolongation || 'Non générée'}\n\n` +
          `Voulez-vous imprimer la facture de prolongation ?`
        );

        if (imprimer && data.data.id_facture_prolongation) {
          window.open(
            `/dashboard/commercial/facture/print/${data.data.id_facture_prolongation}`,
            '_blank'
          );
        }

        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Erreur lors de la prolongation');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !reservation) return null;

  const peutProlonger = joursRestants > 14;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-white" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Prolonger la réservation
                </h3>
                <p className="text-xs text-emerald-100">
                  {reservation.numero_commande}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/20 hover:bg-red-500 rounded-lg transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Info réservation */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Panneau</p>
                  <p className="font-bold text-gray-800">
                    {reservation.panneau_nom}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Face</p>
                  <p className="font-bold text-gray-800">
                    {reservation.face_orientation}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Client</p>
                  <p className="font-bold text-gray-800">
                    {reservation.client_nom}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Période actuelle</p>
                  <p className="font-bold text-gray-800">
                    {new Date(reservation.date_debut_campagne).toLocaleDateString('fr-FR')} →{' '}
                    {new Date(reservation.date_fin_campagne).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Alerte jours restants */}
            <div
              className={`rounded-lg p-3 flex items-start gap-2 ${
                peutProlonger
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {peutProlonger ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div
                className={`text-xs ${
                  peutProlonger ? 'text-emerald-800' : 'text-red-800'
                }`}
              >
                <p className="font-bold">
                  {peutProlonger
                    ? `✅ Prolongation possible (${joursRestants} jours restants)`
                    : `❌ Prolongation impossible`}
                </p>
                <p className="mt-0.5">
                  {peutProlonger
                    ? 'Vous pouvez prolonger cette réservation.'
                    : `Il reste seulement ${joursRestants} jour(s). Il faut au moins 15 jours pour prolonger.`}
                </p>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {peutProlonger && (
              <>
                {/* Nouvelle date de fin */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nouvelle date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={nouvelleDateFin}
                    onChange={(e) => setNouvelleDateFin(e.target.value)}
                    min={
                      new Date(
                        new Date(reservation.date_fin_campagne).getTime() +
                          24 * 60 * 60 * 1000
                      )
                        .toISOString()
                        .split('T')[0]
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Montant */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Montant de la prolongation (FC){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={montantProlongation}
                      onChange={(e) =>
                        setMontantProlongation(Number(e.target.value) || 0)
                      }
                      min={0}
                      step="100"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Prix actuel :{' '}
                    {Number(reservation.prix_vente_net || 0).toLocaleString()} FC
                  </p>
                </div>

                {/* Mode paiement */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mode de paiement
                  </label>
                  <select
                    value={modePaiement}
                    onChange={(e) => setModePaiement(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="comptant">Comptant</option>
                    <option value="tranche">Par tranche</option>
                    <option value="virement">Virement</option>
                    <option value="cheque">Chèque</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !peutProlonger}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Prolonger & Imprimer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}