// src/app/dashboard/comptable/components/FacturePagination.tsx

'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FacturePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function FacturePagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: FacturePaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200">
        <span className="text-xs sm:text-sm text-gray-500 font-medium">
          {totalItems} facture(s)
        </span>
      </div>
    );
  }

  // Pages visibles autour de la page actuelle
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
      <span className="text-xs sm:text-sm text-gray-500 font-medium">
        {totalItems} facture(s)
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          <ChevronLeft size={16} />
        </button>

        {start > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-8 h-8 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              1
            </button>
            {start > 2 && <span className="text-gray-400 text-xs">…</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`
              w-8 h-8 rounded-lg text-xs font-bold transition
              ${p === currentPage
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-gray-400 text-xs">…</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}