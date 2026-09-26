'use client';

// ============================================
// COMPOSANT - STATISTIQUES UTILISATEURS
// ============================================import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { UserStats } from '../types/user.types';

interface UserStatsProps {
  stats: UserStats;
  loading?: boolean;
}

export function UserStatsComponent({ stats, loading = false }: UserStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
    { label: 'Actifs', value: stats.actifs, icon: UserCheck, color: 'emerald' },
    { label: 'Inactifs', value: stats.inactifs, icon: UserX, color: 'red' },
    { label: 'Rôles', value: Object.keys(stats.byRole).length, icon: UserPlus, color: 'purple' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const colors = {
          blue: 'bg-blue-50 text-blue-600 border-blue-200',
          emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          red: 'bg-red-50 text-red-600 border-red-200',
          purple: 'bg-purple-50 text-purple-600 border-purple-200',
        };
        const colorClass = colors[card.color as keyof typeof colors] || colors.blue;

        return (
          <div key={index} className={`bg-white rounded-xl p-4 border ${colorClass} shadow-sm hover:shadow-md transition`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</p>
              </div>
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}