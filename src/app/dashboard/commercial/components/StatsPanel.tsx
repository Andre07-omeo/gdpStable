'use client';

import { X, LayoutDashboard, Calendar, Users, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsPanel({ isOpen, onClose }: StatsPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        className="fixed right-0 top-0 h-full w-full max-w-md z-[201] bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Performance</p>
              <h2 className="text-xl font-bold text-white">Mes Statistiques</h2>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="text-center py-12">
            <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune donnée disponible</p>
            <p className="text-sm text-gray-400">Commencez à réserver pour voir vos statistiques</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <button onClick={onClose} className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition">
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}
