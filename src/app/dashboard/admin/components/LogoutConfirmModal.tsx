'use client';

// src/app/dashboard/admin/components/LogoutConfirmModal.tsx
import { LogOut, AlertTriangle } from 'lucide-react';

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
  userName,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
        {/* Icône */}
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-red-100">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        {/* Titre */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
          Confirmer la déconnexion
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-center mb-6 text-sm">
          {userName
            ? `${userName}, voulez-vous vraiment vous déconnecter de votre session administrateur ?`
            : 'Voulez-vous vraiment vous déconnecter ?'}
        </p>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="
              flex-1 px-4 py-2.5 rounded-lg
              bg-gray-100 hover:bg-gray-200
              text-gray-700 font-semibold text-sm
              transition
            "
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="
              flex-1 px-4 py-2.5 rounded-lg
              bg-red-600 hover:bg-red-700
              text-white font-semibold text-sm
              transition
              flex items-center justify-center gap-2
            "
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}