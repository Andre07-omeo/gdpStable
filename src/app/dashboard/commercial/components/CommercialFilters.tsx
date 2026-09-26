'use client';

export const dynamic = 'force-dynamic';

import { ChevronDown, ChevronUp, Filter, Search, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommercialFiltersProps {
  filtersExpanded: boolean;
  setFiltersExpanded: (value: boolean) => void;
  geoFilter: any;
  setGeoFilter: (value: any) => void;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  totalResults: number;
}

export function CommercialFilters({
  filtersExpanded,
  setFiltersExpanded,
  geoFilter,
  setGeoFilter,
  searchFilter,
  setSearchFilter,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  totalResults
}: CommercialFiltersProps) {
  const resetFilters = () => {
    setGeoFilter({ pays: 'Tous', province: 'Tous', district: 'Tous', commune: 'Tous' });
    setSearchFilter('');
    setStatusFilter('Tous');
    setTypeFilter('Tous');
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-4 overflow-hidden">
      <button
        onClick={() => setFiltersExpanded(!filtersExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filtres Avancés</span>
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-black">
            {totalResults}
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {filtersExpanded ? 'Masquer' : 'Afficher'}
          </span>
          {filtersExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      <AnimatePresence>
        {filtersExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 bg-gray-50/50"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Pays */}
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Pays</label>
                  <select
                    className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={geoFilter.pays}
                    onChange={(e) => setGeoFilter({ ...geoFilter, pays: e.target.value, province: 'Tous', district: 'Tous', commune: 'Tous' })}
                  >
                    <option value="Tous">🌍 Tous</option>
                    <option value="RDC">🇨🇩 RDC</option>
                    <option value="Congo">🇨🇬 Congo</option>
                  </select>
                </div>

                {/* Province */}
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Province</label>
                  <select
                    className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={geoFilter.province}
                    onChange={(e) => setGeoFilter({ ...geoFilter, province: e.target.value, district: 'Tous', commune: 'Tous' })}
                    disabled={geoFilter.pays === 'Tous'}
                  >
                    <option value="Tous">🏛️ Toutes</option>
                    <option value="Kinshasa">Kinshasa</option>
                    <option value="Lualaba">Lualaba</option>
                    <option value="Haut-Katanga">Haut-Katanga</option>
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Statut</label>
                  <select
                    className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="Tous">📋 Tous</option>
                    <option value="Libre">🟢 Libre</option>
                    <option value="Occupé">🔵 Occupé</option>
                    <option value="Réservé">🟡 Réservé</option>
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-black text-gray-600 uppercase tracking-wider">Type</label>
                  <select
                    className="w-full mt-1 px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="Tous">📦 Tous</option>
                    <option value="Vinyle">Vinyle</option>
                    <option value="Bache">Bâche</option>
                    <option value="LED">LED</option>
                    <option value="Numérique">Numérique</option>
                  </select>
                </div>
              </div>

              {/* Recherche */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="🔍 Rechercher par ID ou adresse..."
                    className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition border-2 border-red-200 hover:border-red-400 whitespace-nowrap flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Réinitialiser
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
