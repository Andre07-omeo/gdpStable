'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { Users, Search, Plus, Edit2, Trash2, Phone, Mail } from 'lucide-react';
import { User } from '../types/user';

interface AdminUsersListProps {
  users: User[];
  onRefresh: () => void;
}

export function AdminUsersList({ users, onRefresh }: AdminUsersListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u =>
    u.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Utilisateur supprimé avec succès');
        onRefresh();
      } else {
        const data = await res.json();
        alert('Erreur: ' + (data.error || 'Erreur inconnue'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-700';
      case 'commercial': return 'bg-emerald-100 text-emerald-700';
      case 'comptable': return 'bg-purple-100 text-purple-700';
      case 'superviseurs': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Utilisateurs</h2>
          <p className="text-sm text-gray-500">
            Gestion des comptes — {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 bg-white rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 whitespace-nowrap">
            <Plus size={16} />
            Nouveau
          </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun utilisateur trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition flex flex-col"
            >
              {/* Ligne supérieure : avatar + infos + rôle */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                    {u.nom?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-800 text-sm truncate">
                      {u.nom} {u.prenom}
                    </h3>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <Mail size={11} className="shrink-0" />
                      {u.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rôle */}
              <div className="mt-2">
                <span
                  className={
                    'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                    getRoleColor(u.role)
                  }
                >
                  {u.role || 'Utilisateur'}
                </span>
              </div>

              {/* Téléphone + statut */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone size={12} className="text-gray-400" />
                  {u.telephone || 'N/A'}
                </span>
                <span
                  className={
                    'px-2 py-0.5 rounded-full text-[10px] font-medium ' +
                    (u.actif
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700')
                  }
                >
                  {u.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-3 flex gap-2 border-t border-gray-100">
                <button className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition flex items-center justify-center gap-1">
                  <Edit2 size={13} /> Modifier
                </button>
                <button
                  onClick={() => handleDelete(u.id)}
                  className="flex-1 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition flex items-center justify-center gap-1"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}