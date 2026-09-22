// src/app/dashboard/commercial/components/LogoutConfirmModal.tsx

'use client';

import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName?: string;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName = 'Utilisateur',
}: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay sombre */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal centré */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto overflow-hidden"
            >
              {/* Header avec dégradé rouge */}
              <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">
                    Confirmer la déconnexion
                  </h3>
                  <p className="text-xs text-red-100">
                    Action irréversible
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition text-white"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps */}
              <div className="p-6">
                <p className="text-gray-700 text-sm leading-relaxed">
                  Voulez-vous vraiment vous déconnecter,{' '}
                  <span className="font-bold text-gray-900">{userName}</span> ?
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Vous devrez vous reconnecter pour accéder à votre espace.
                </p>

                {/* Boutons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}