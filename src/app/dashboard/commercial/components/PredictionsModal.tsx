'use client';

import { X, TrendingUp, Calendar, Clock, ArrowRight, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Panneau } from '../types/commercial.types';

interface PredictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  panneaux: Panneau[];
  stats: any;
}

export function PredictionsModal({ isOpen, onClose, panneaux, stats }: PredictionsModalProps) {
  if (!isOpen) return null;

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const nextYear = new Date(today);
  nextYear.setFullYear(today.getFullYear() + 1);
  const twoYears = new Date(today);
  twoYears.setFullYear(today.getFullYear() + 2);

  const predictions = [
    {
      periode: 'Prochain mois',
      date: nextMonth.toLocaleDateString('fr-FR'),
      panneauxDisponibles: Math.round(stats.totalPanneaux * 0.3),
      revenuEstime: Math.round(stats.totalPanneaux * 1500 * 0.3),
      action: 'Proposer des offres promotionnelles'
    },
    {
      periode: 'Dans un an',
      date: nextYear.toLocaleDateString('fr-FR'),
      panneauxDisponibles: Math.round(stats.totalPanneaux * 0.45),
      revenuEstime: Math.round(stats.totalPanneaux * 1800 * 0.45),
      action: 'Développer de nouveaux clients'
    },
    {
      periode: 'Dans deux ans',
      date: twoYears.toLocaleDateString('fr-FR'),
      panneauxDisponibles: Math.round(stats.totalPanneaux * 0.6),
      revenuEstime: Math.round(stats.totalPanneaux * 2000 * 0.6),
      action: 'Agrandir le parc de panneaux'
    }
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
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Prédictions</p>
              <h2 className="text-xl font-bold text-white">Prévisions & Tendances</h2>
              <p className="text-sm text-indigo-200">Projections basées sur les données actuelles</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-indigo-700">Tendance actuelle</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Taux d'occupation</p>
                <p className="text-xl font-bold text-indigo-700">
                  {stats.totalFaces > 0 ? Math.round((stats.totalOccupes / stats.totalFaces) * 100) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Panneaux actifs</p>
                <p className="text-xl font-bold text-indigo-700">{stats.totalPanneaux}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Faces libres</p>
                <p className="text-xl font-bold text-emerald-600">{stats.totalLibres}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Réservations futures</p>
                <p className="text-xl font-bold text-amber-600">{stats.totalReservationsFutures}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {predictions.map((pred, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      <h3 className="font-bold text-gray-800">{pred.periode}</h3>
                      <span className="text-sm text-gray-400">({pred.date})</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Panneaux disponibles</p>
                        <p className="text-lg font-bold text-blue-600">{pred.panneauxDisponibles}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Revenu estimé</p>
                        <p className="text-lg font-bold text-emerald-600">{pred.revenuEstime.toLocaleString()} $</p>
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                      <p className="text-sm text-indigo-700 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" />
                        {pred.action}
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition">
            Fermer
          </button>
        </div>
      </motion.div>
    </>
  );
}
