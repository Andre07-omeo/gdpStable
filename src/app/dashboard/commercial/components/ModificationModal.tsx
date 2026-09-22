// src/app/dashboard/commercial/components/ModificationModal.tsx

'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Save, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
  reservation: any | null;
}

export function ModificationModal({
  isOpen,
  onClose,
  onSuccess,
  reservation,
}: ModificationModalProps) {
  const [form, setForm] = useState({
    clientNom: '',
    nombreMois: 1,
    numeroCommande: '',
    // 👉 ajoute ici les champs que tu veux modifier
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recharge le formulaire quand la réservation change
  useEffect(() => {
    if (reservation) {
      setForm({
        clientNom: reservation.clientNom ?? reservation.societeLocatrice ?? '',
        nombreMois: reservation.nombreMois ?? 1,
        numeroCommande: reservation.numeroCommande ?? '',
      });
      setError(null);
    }
  }, [reservation]);

  if (!isOpen || !reservation) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // 👉 Remplace par ton vrai appel API
      const res = await fetch(
        `/api/reservations/${reservation.id_reservation}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la modification');
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">
              ✏️ Modifier la réservation
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Fermer"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Client
              </label>
              <input
                type="text"
                name="clientNom"
                value={form.clientNom}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre de mois
              </label>
              <input
                type="number"
                name="nombreMois"
                min={1}
                value={form.nombreMois}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Numéro de commande
              </label>
              <input
                type="text"
                name="numeroCommande"
                value={form.numeroCommande}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}