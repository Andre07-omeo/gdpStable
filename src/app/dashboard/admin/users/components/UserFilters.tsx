// ============================================
// COMPOSANT - FILTRES UTILISATEURS
// ============================================

'use client';

import { Search, X } from 'lucide-react';
import { UserFilters } from '../types/user.types';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
  onReset: () => void;
  roles: string[];
}

export function UserFiltersComponent({ filters, onFiltersChange, onReset, roles }: UserFiltersProps) {
  const handleChange = (key: keyof UserFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasFilters = filters.search || filters.role || filters.actif !== undefined;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={filters.role || ''}
          onChange={(e) => handleChange('role', e.target.value || undefined)}
        >
          <option value="">Tous les rôles</option>
          {roles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={filters.actif !== undefined ? String(filters.actif) : ''}
          onChange={(e) => {
            const val = e.target.value;
            handleChange('actif', val === '' ? undefined : val === 'true');
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>

        {hasFilters && (
          <button
            onClick={onReset}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center gap-1 text-sm"
          >
            <X size={16} />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}