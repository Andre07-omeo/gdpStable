// src/app/dashboard/comptable/components/StatsCards.tsx
'use client';

import React from 'react';
import { FileText, Clock, CheckCircle, XCircle, CreditCard, DollarSign } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    total: number;
    en_attente: number;
    validees: number;
    rejetees: number;
    payees: number;
    total_ttc: number;
  };
  formatPrice: (price: number) => string;
}

export function StatsCards({ stats, formatPrice }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total factures',
      value: stats.total,
      icon: <FileText size={20} />,
      color: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200'
    },
    {
      label: 'En attente',
      value: stats.en_attente,
      icon: <Clock size={20} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200'
    },
    {
      label: 'Validées',
      value: stats.validees,
      icon: <CheckCircle size={20} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    {
      label: 'Rejetées',
      value: stats.rejetees,
      icon: <XCircle size={20} />,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200'
    },
    {
      label: 'Payées',
      value: stats.payees,
      icon: <CreditCard size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    {
      label: 'Montant total',
      value: formatPrice(stats.total_ttc),
      icon: <DollarSign size={20} />,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className={`rounded-xl p-4 border ${card.border} ${card.bg} shadow-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`${card.color}`}>{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          <p className="text-xs text-gray-500 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}