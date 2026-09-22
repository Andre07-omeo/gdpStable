'use client';

import { X, Users, Calendar, Clock, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[201] bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl mx-auto border border-white/20"
      >
        {/* Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">Administration</p>
              <h2 className="text-xl font-bold text-white">Panel Admin</h2>
              <p className="text-sm text-purple-200">Gestion des agents, réservations et rendez-vous</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-blue-700">0</p>
              <p className="text-sm text-gray-500">Agents</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <Calendar className="w-8 h-8 text-amber-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-amber-700">0</p>
              <p className="text-sm text-gray-500">Réservations</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-purple-700">0</p>
              <p className="text-sm text-gray-500">Rendez-vous</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition">
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}
