'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/FacturePagination.tsximport React from 'react';
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
  onPageChange 
}: FacturePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 flex-shrink-0">
      <div className="text-sm text-gray-500">
        {totalItems} facture(s)
      </div>
      <div className="flex gap-2 items-center">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 py-1 text-sm font-medium">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 rounded-lg border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}