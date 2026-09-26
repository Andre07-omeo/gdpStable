'use client';

// src/app/dashboard/comptable/stats/page.tsxexport const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, CreditCard, FileText, Calendar, ArrowUp, ArrowDown } from 'lucide-react';

// Composant PieChart avec support de className
const PieChartIcon = ({ size, className = '' }: { size: number; className?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" />
      <path d="M12 2a10 10 0 0 0 0 20" />
    </svg>
  );
};

export default function ComptableStatsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // TODO: Appel API pour récupérer les statistiques
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '0 FC';
    return price.toLocaleString() + ' FC';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Statistiques financières</h1>
          <p className="text-sm text-gray-500">Analyses et indicateurs de performance</p>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500"><DollarSign size={20} /></span>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <ArrowUp size={12} />
              +12%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(0)}</p>
          <p className="text-xs text-gray-500">Chiffre d'affaires</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500"><FileText size={20} /></span>
          </div>
          <p className="text-2xl font-bold text-gray-800">0</p>
          <p className="text-xs text-gray-500">Factures émises</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500"><CreditCard size={20} /></span>
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <ArrowDown size={12} />
              -3%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{formatPrice(0)}</p>
          <p className="text-xs text-gray-500">En attente de paiement</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500"><TrendingUp size={20} /></span>
          </div>
          <p className="text-2xl font-bold text-gray-800">0%</p>
          <p className="text-xs text-gray-500">Taux de recouvrement</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4">Évolution des revenus</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm">Graphique à venir</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4">Répartition des paiements</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <PieChartIcon size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm">Graphique à venir</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
