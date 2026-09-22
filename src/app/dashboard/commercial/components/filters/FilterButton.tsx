// src/app/dashboard/commercial/components/filters/FilterButton.tsx

'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanneauFilters } from './PanneauFilters';
import { PanneauFiltersState } from './types';

interface FilterButtonProps {
  filters: PanneauFiltersState;
  onFiltersChange: (filters: PanneauFiltersState) => void;
  totalResults: number;
  totalPanneaux: number;
}

export function FilterButton({
  filters,
  onFiltersChange,
  totalResults,
  totalPanneaux,
}: FilterButtonProps) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.search !== '',
    filters.situation !== 'tous',
    filters.faceSituation !== 'tous',
    filters.echeanceActive,
  ].filter(Boolean).length;

  return (
    <>
      {/* Bouton flottant compact */}
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-full shadow-lg border border-gray-200 font-bold text-xs transition"
      >
        <Filter size={14} />
        <span className="hidden sm:inline">Filtres</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-[10px] rounded-full">
            {activeCount}
          </span>
        )}
        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
          {totalResults}/{totalPanneaux}
        </span>
      </button>

      {/* Panneau flottant */}
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[1001] bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-4 right-4 z-[1002] w-[420px] max-w-[95vw]"
            >
              <div className="relative">
                <button
                  onClick={() => setOpen(false)}
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600"
                >
                  <X size={14} />
                </button>
                <PanneauFilters
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  totalResults={totalResults}
                  totalPanneaux={totalPanneaux}
                  defaultExpanded
                  variant="modal"
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}