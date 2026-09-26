'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/FactureFilters.tsximport React from 'react';
import { Filter, Search, RefreshCw } from 'lucide-react';

interface FactureFiltersProps {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function FactureFilters({ 
  statusFilter, 
  setStatusFilter, 
  searchTerm, 
  setSearchTerm, 
  onRefresh,
  loading 
}: FactureFiltersProps) {
  const statusOptions = [
    { value: 'TOUS', label: '📋 Tous' },
    { value: 'EN_ATTENTE', label: '⏳ En attente' },
    { value: 'VALIDE', label: '✅ Validées' },
    { value: 'REJETEE', label: '❌ Rejetées' },
    { value: 'PAYEE', label: '💰 Payées' }
  ];

  // ✅ Compter le nombre de factures par statut (si disponible)
  // Cette information peut être passée via les props si nécessaire

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Statut:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                statusFilter === option.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' // ✅ Effet d'ombre pour le filtre actif
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une facture..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>
    </div>
  );
}