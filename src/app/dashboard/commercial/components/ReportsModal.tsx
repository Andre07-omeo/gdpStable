'use client';

import { X, BarChart3, TrendingUp, Users, MapPin, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Panneau } from '../types/commercial.types';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panneaux: Panneau[];
  stats: any;
}

export function ReportsModal({ isOpen, onClose, panneaux, stats }: ReportsModalProps) {
  if (!isOpen) return null;

  const totalFaces = panneaux.reduce((acc, p) => acc + (p.faces?.length || 0), 0);
  const occupiedFaces = panneaux.reduce((acc, p) => 
    acc + (p.faces?.filter(f => f.statut === 'Occupé' || f.statut === 'Réservé').length || 0), 0
  );
  const freeFaces = totalFaces - occupiedFaces;
  const occupationRate = totalFaces > 0 ? Math.round((occupiedFaces / totalFaces) * 100) : 0;

  const topAgents = [
    { nom: 'Jean Dupont', reservations: 12, revenue: 45000 },
    { nom: 'Marie Kabuya', reservations: 8, revenue: 32000 },
    { nom: 'Paul Mbuyi', reservations: 6, revenue: 28000 }
  ];

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[201] bg-white rounded-2xl shadow-2xl flex flex-col max-w-4xl mx-auto border border-white/20"
      >
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">Rapports</p>
              <h2 className="text-xl font-bold text-white">Statistiques avancées</h2>
              <p className="text-sm text-cyan-200">Analyse détaillée de la performance</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{totalFaces}</p>
              <p className="text-sm text-gray-600">Faces totales</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
              <p className="text-2xl font-bold text-emerald-700">{freeFaces}</p>
              <p className="text-sm text-gray-600">Faces libres</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-amber-700">{occupiedFaces}</p>
              <p className="text-sm text-gray-600">Faces occupées</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{occupationRate}%</p>
              <p className="text-sm text-gray-600">Taux d'occupation</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Panneaux en maintenance
            </h3>
            <p className="text-lg font-bold text-red-600">
              {panneaux.filter(p => p.etatPanneau === 'En panne' || p.etatPanneau === 'En maintenance').length}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-blue-600" />
              Meilleurs agents
            </h3>
            <div className="space-y-2">
              {topAgents.map((agent, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{agent.nom}</span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-600">{agent.reservations} rés.</span>
                    <span className="font-bold text-emerald-600">{agent.revenue.toLocaleString()} $</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-bold hover:bg-cyan-700 transition">
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}
