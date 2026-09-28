// src/app/dashboard/comptable/components/FactureStatsBar.tsx

'use client';

import React from 'react';
import { FileText, Clock, CheckCircle, XCircle, CreditCard, DollarSign } from 'lucide-react';
import { AdaptiveValue } from './AdaptiveValue';

interface FactureStatsBarProps {
  stats: {
    total: number;
    en_attente: number;
    validees: number;
    rejetees: number;
    payees: number;
    total_ttc: number;
  };
  formatPrice: (p: number) => string;
}

export function FactureStatsBar({ stats, formatPrice }: FactureStatsBarProps) {
  const items = [
    {
      label: 'Total factures',
      value: stats.total,
      icon: <FileText size={18} className="text-slate-600" />,
      color: 'text-slate-700',
      bg: 'bg-white',
      border: 'border-slate-200',
      accent: 'bg-slate-400',
    },
    {
      label: 'En attente',
      value: stats.en_attente,
      icon: <Clock size={18} className="text-amber-600" />,
      color: 'text-amber-600',
      bg: 'bg-amber-50/60',
      border: 'border-amber-200',
      accent: 'bg-amber-500',
    },
    {
      label: 'Validées',
      value: stats.validees,
      icon: <CheckCircle size={18} className="text-emerald-600" />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/60',
      border: 'border-emerald-200',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Rejetées',
      value: stats.rejetees,
      icon: <XCircle size={18} className="text-red-600" />,
      color: 'text-red-600',
      bg: 'bg-red-50/60',
      border: 'border-red-200',
      accent: 'bg-red-500',
    },
    {
      label: 'Payées',
      value: stats.payees,
      icon: <CreditCard size={18} className="text-blue-600" />,
      color: 'text-blue-600',
      bg: 'bg-blue-50/60',
      border: 'border-blue-200',
      accent: 'bg-blue-500',
    },
    {
      label: 'Montant total',
      value: formatPrice(stats.total_ttc),
      icon: <DollarSign size={18} className="text-purple-600" />,
      color: 'text-purple-600',
      bg: 'bg-purple-50/60',
      border: 'border-purple-200',
      accent: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
      {items.map((it, i) => (
        <div
          key={i}
          className={`
            relative overflow-hidden rounded-xl border ${it.border} ${it.bg}
            shadow-sm hover:shadow-md transition-all duration-300 group
            flex items-center gap-3 p-3 sm:p-4 min-w-0
          `}
        >
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${it.accent}`} />
          <div className={`absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

          <div className={`relative z-10 flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${it.color} bg-white/90 shadow-sm`}>
            {it.icon}
          </div>

          <div className="relative z-10 flex-1 min-w-0">
            <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold uppercase tracking-wide truncate mb-0.5">
              {it.label}
            </p>
            <AdaptiveValue
              value={it.value}
              maxSize={1.5}
              minSize={0.65}
              color={it.color}
            />
          </div>
        </div>
      ))}
    </div>
  );
}