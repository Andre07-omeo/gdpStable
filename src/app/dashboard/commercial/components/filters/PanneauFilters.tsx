// src/app/dashboard/commercial/components/filters/PanneauFilters.tsx
'use client';

import React, { useState } from 'react';
import {
  Search,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanneauFiltersState, PanneauSituation, COLORS } from './types';

interface PanneauFiltersProps {
  filters: PanneauFiltersState;
  onFiltersChange: (filters: PanneauFiltersState) => void;
  totalResults: number;
  totalPanneaux?: number;
  defaultExpanded?: boolean;
  variant?: 'inline' | 'modal';
}

const SITUATIONS: {
  value: PanneauSituation;
  label: string;
  color: string;
  icon: string;
}[] = [
  { value: 'tous', label: 'Tous', color: 'gray', icon: '📋' },
  { value: 'totalement_occupe', label: 'Total occupé', color: 'blue', icon: '🔵' },
  { value: 'partiellement_occupe', label: 'Partiel occupé', color: 'blue', icon: '🔵' },
  { value: 'totalement_reserve', label: 'Total réservé', color: 'yellow', icon: '🟡' },
  { value: 'partiellement_reserve', label: 'Partiel réservé', color: 'yellow', icon: '🟡' },
  { value: 'totalement_libre', label: 'Total libre', color: 'emerald', icon: '🟢' },
  { value: 'partiellement_libre', label: 'Partiel libre', color: 'emerald', icon: '🟢' },
  { value: 'totalement_en_panne', label: 'Total en panne', color: 'red', icon: '🔴' },
  { value: 'partiellement_en_panne', label: 'Partiel en panne', color: 'red', icon: '🔴' },
];

const COLOR_CLASSES: Record<string, { active: string; inactive: string }> = {
  blue: {
    active: 'bg-blue-500 text-white border-blue-600 shadow-blue-500/30',
    inactive: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50',
  },
  yellow: {
    active: 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30',
    inactive: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50',
  },
  emerald: {
    active: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30',
    inactive: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50',
  },
  red: {
    active: 'bg-red-500 text-white border-red-600 shadow-red-500/30',
    inactive: 'bg-white text-red-600 border-red-200 hover:bg-red-50',
  },
  gray: {
    active: 'bg-gray-700 text-white border-gray-800',
    inactive: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
  },
};

export function PanneauFilters({
  filters,
  onFiltersChange,
  totalResults,
  totalPanneaux = 0,
  defaultExpanded = false,
  variant = 'inline',
}: PanneauFiltersProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const update = (partial: Partial<PanneauFiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const resetFilters = () => {
    onFiltersChange({
      search: '',
      situation: 'tous',
      faceSituation: 'tous',
      echeanceActive: false,
      echeanceDebut: '',
      echeanceFin: '',
    });
  };

  const activeCount = [
    filters.search !== '',
    filters.situation !== 'tous',
    filters.echeanceActive && (filters.echeanceDebut !== '' || filters.echeanceFin !== ''),
  ].filter(Boolean).length;

  const isModal = variant === 'modal';

  // ✅ Message d'aide échéance
  const getEcheanceHint = () => {
    if (!filters.echeanceActive) return null;
    const hasDebut = filters.echeanceDebut !== '';
    const hasFin = filters.echeanceFin !== '';

    if (hasDebut && hasFin) {
      return '📅 Résas entre le ' + filters.echeanceDebut + ' et le ' + filters.echeanceFin;
    }
    if (hasDebut && !hasFin) {
      return '📅 Résas à partir du ' + filters.echeanceDebut + ' (jusqu\'à la fin)';
    }
    if (!hasDebut && hasFin) {
      return '📅 Résas jusqu\'au ' + filters.echeanceFin + ' (depuis le début)';
    }
    return '⚠️ Sélectionnez au moins une date';
  };

  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-3
        ${isModal ? 'max-h-[80vh] overflow-y-auto' : ''}
      `}
    >
      {/* BARRE COMPACTE */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un panneau..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs font-bold text-gray-500 whitespace-nowrap px-2">
          {totalResults}/{totalPanneaux}
        </span>

        {activeCount > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-black whitespace-nowrap">
            {activeCount} actif{activeCount > 1 ? 's' : ''}
          </span>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap
            ${expanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          `}
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {activeCount > 0 && (
          <button
            onClick={resetFilters}
            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
            title="Réinitialiser"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CORPS DÉROULABLE */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            <div className="p-3 space-y-3">
              {/* SITUATION DU PANNEAU */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Situation du panneau
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SITUATIONS.map((s) => {
                    const isActive = filters.situation === s.value;
                    const colors = COLOR_CLASSES[s.color] || COLOR_CLASSES.gray;
                    return (
                      <button
                        key={s.value}
                        onClick={() => update({ situation: s.value })}
                        className={`
                          px-2.5 py-1 rounded-full text-xs font-bold border-2 transition-all
                          ${isActive ? colors.active + ' shadow-md' : colors.inactive}
                        `}
                      >
                        <span className="mr-1">{s.icon}</span>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ÉCHÉANCE */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.echeanceActive}
                    onChange={(e) => update({ echeanceActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Filtrer par échéance
                  </span>
                </label>

                {filters.echeanceActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-0.5">
                          Date début
                        </label>
                        <input
                          type="date"
                          value={filters.echeanceDebut}
                          onChange={(e) => update({ echeanceDebut: e.target.value })}
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 block mb-0.5">
                          Date fin
                        </label>
                        <input
                          type="date"
                          value={filters.echeanceFin}
                          onChange={(e) => update({ echeanceFin: e.target.value })}
                          className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* ✅ Message d'aide */}
                    {getEcheanceHint() && (
                      <div className="flex items-start gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-700 font-medium">
                          {getEcheanceHint()}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* LÉGENDE COULEURS */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                  Légende
                </p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.libre }} />
                    Libre
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.reserve }} />
                    Réservé
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.occupe }} />
                    Occupé
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.en_panne }} />
                    En panne
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}