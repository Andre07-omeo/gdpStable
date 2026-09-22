// src/app/dashboard/commercial/components/profile/InfoModal.tsx
'use client';

import { X, Info } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function InfoModal({ isOpen, onClose, title, message }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-slate-700 to-slate-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Info size={20} />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 text-center">
          <div className="text-5xl mb-4">🚧</div>
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
          <button
            onClick={onClose}
            className="mt-5 w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>
  );
}