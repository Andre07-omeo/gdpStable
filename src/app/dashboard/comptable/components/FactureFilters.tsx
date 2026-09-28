// src/app/dashboard/comptable/components/FactureFilters.tsx

'use client';

import React from 'react';
import { Filter, Search, RefreshCw } from 'lucide-react';

interface FactureFiltersProps {
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onRefresh: () => void;
  loading: boolean;
  counts?: Record<string, number>;
}

export function FactureFilters({
  statusFilter,
  setStatusFilter,
  searchTerm,
  setSearchTerm,
  onRefresh,
  loading,
  counts,
}: FactureFiltersProps) {
  const options = [
    { value: 'TOUS', label: 'Tous', color: 'bg-slate-600' },
    { value: 'EN_ATTENTE', label: 'En attente', color: 'bg-amber-500' },
    { value: 'VALIDE', label: 'Validées', color: 'bg-emerald-600' },
    { value: 'REJETEE', label: 'Rejetées', color: 'bg-red-600' },
    { value: 'PAYEE', label: 'Payées', color: 'bg-blue-600' },
  ];

  return (
    <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200">
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        {/* Filtres statut */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Filter size={16} className="text-gray-400 flex-shrink-0 hidden sm:block" />
          <div className="flex gap-1.5 flex-wrap overflow-x-auto pb-1 -mb-1 w-full">
            {options.map((o) => {
              const active = statusFilter === o.value;
              const count = counts?.[o.value];
              return (
                <button
                  key={o.value}
                  onClick={() => setStatusFilter(o.value)}
                  className={`
                    group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                    text-xs font-bold transition-all duration-200 whitespace-nowrap
                    ${active
                      ? `${o.color} text-white shadow-md`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {active && (
                    <span className={`w-1.5 h-1.5 rounded-full bg-white/90 flex-shrink-0`} />
                  )}
                  {o.label}
                  {typeof count === 'number' && count > 0 && (
                    <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      active ? 'bg-white/25 text-white' : 'bg-white text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recherche */}
        <div className="relative flex-1 min-w-0 xl:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une facture..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Rafraîchir */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs sm:text-sm font-bold transition-all disabled:opacity-50 shadow-sm flex-shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>
    </div>
  );
}