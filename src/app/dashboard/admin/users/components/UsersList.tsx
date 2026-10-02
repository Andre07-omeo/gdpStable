'use client';

// src/app/dashboard/admin/users/components/UsersList.tsx
import {
  Edit2, Trash2, UserCheck, UserX, Mail, Phone,
  MapPin, Building2, Briefcase, Crown, Lock, ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { User, isFounder, canPerformAction } from '../types/user.types';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, actif: boolean) => void;
  loading?: boolean;
  currentUser?: {
    id_user?: number;
    id?: number;
    email?: string;
    profil?: string;
  } | null;
}

export function UsersList({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
  loading = false,
  currentUser,
}: UsersListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="text-6xl mb-4">👤</div>
        <h3 className="text-lg font-semibold text-gray-600">Aucun utilisateur</h3>
        <p className="text-sm text-gray-400">Aucun utilisateur ne correspond à vos critères</p>
      </div>
    );
  }

  const getRoleColor = (profil: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
      ADMIN_SYSTEM: 'bg-blue-100 text-blue-700 border border-blue-300',
      ADMIN: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-300',
      DG: 'bg-amber-100 text-amber-700 border border-amber-300',
      PDG: 'bg-rose-100 text-rose-700 border border-rose-300',
      CHEF_COMMERCIAL: 'bg-orange-100 text-orange-700 border border-orange-300',
      COMMERCIAL: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
      SUPERVISEUR: 'bg-cyan-100 text-cyan-700 border border-cyan-300',
      CAISSIER: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
      COMPTABLE: 'bg-pink-100 text-pink-700 border border-pink-300',
    };
    return colors[profil] || 'bg-gray-100 text-gray-700 border border-gray-300';
  };

  const getFullName = (user: User) => {
    const nom = user.nom || '';
    const prenom = user.prenom || '';
    return `${prenom} ${nom}`.trim() || 'Nom non défini';
  };

  const formatZoneTravail = (zone: string | null | undefined) => {
    if (!zone) return null;
    if (zone.startsWith('pays:')) {
      const parts = zone.split('|');
      const pays = parts.find((p) => p.startsWith('pays:'))?.split(':')[1] || '';
      const provinces = parts.find((p) => p.startsWith('provinces:'))?.split(':')[1]?.split(',').length || 0;
      const villes = parts.find((p) => p.startsWith('villes:'))?.split(':')[1]?.split(',').length || 0;
      const communes = parts.find((p) => p.startsWith('communes:'))?.split(':')[1]?.split(',').length || 0;

      const items = [];
      if (provinces > 0) items.push(`${provinces} prov.`);
      if (villes > 0) items.push(`${villes} villes`);
      if (communes > 0) items.push(`${communes} comm.`);

      return items.length > 0 ? `Pays ${pays} • ${items.join(' • ')}` : `Pays ${pays}`;
    }
    return zone;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {users.map((user, index) => {
        const targetIsFounder = isFounder(user);
        const isSuperAdmin = user.profil === 'SUPER_ADMIN';

        // ✅ FIX : compatibilité id vs id_user
        const currentId = currentUser?.id_user ?? currentUser?.id;
        const isSelf = currentId !== undefined && currentId === user.id_user;

        const editPerm = canPerformAction('edit', currentUser, user);
        const deletePerm = canPerformAction('delete', currentUser, user);
        const togglePerm = canPerformAction('toggle', currentUser, user);

        return (
          <motion.div
            key={user.id_user || user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.3) }}
            className={`bg-white rounded-xl p-4 border-2 transition hover:shadow-lg flex flex-col ${
              targetIsFounder
                ? 'border-amber-300 bg-gradient-to-br from-amber-50/50 to-white'
                : isSuperAdmin
                ? 'border-purple-200'
                : 'border-gray-200'
            } ${!user.actif ? 'opacity-70' : ''}`}
          >
            {/* Header carte */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 relative ${
                  targetIsFounder
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : isSuperAdmin
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-gradient-to-br from-blue-500 to-blue-700'
                }`}
              >
                {user.prenom?.charAt(0) || '?'}
                {user.nom?.charAt(0) || '?'}
                {targetIsFounder && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-white">
                    <Lock className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                {isSuperAdmin && !targetIsFounder && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center border-2 border-white">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 truncate">{getFullName(user)}</h4>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user.profil)}`}>
                    {user.profil || 'VISITEUR'}
                  </span>
                  {!user.actif && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      INACTIF
                    </span>
                  )}
                  {isSelf && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      VOUS
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Infos */}
            <div className="space-y-1.5 text-xs text-gray-600 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={13} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{user.email || '—'}</span>
              </div>

              {user.telephone && user.telephone !== '0' && (
                <div className="flex items-center gap-2 min-w-0">
                  <Phone size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.telephone}</span>
                </div>
              )}

              {(user.fonction || user.departement) && (
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">
                    {[user.fonction, user.departement].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}

              {user.ville_nom && (
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{user.ville_nom}</span>
                </div>
              )}

              {user.zone_travail && (
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{formatZoneTravail(user.zone_travail)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => togglePerm.allowed && onToggleStatus(user.id_user, !user.actif)}
                disabled={!togglePerm.allowed}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !togglePerm.allowed
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : user.actif
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                title={!togglePerm.allowed ? togglePerm.reason : user.actif ? 'Désactiver' : 'Activer'}
              >
                {user.actif ? <UserX size={14} /> : <UserCheck size={14} />}
                {user.actif ? 'Désactiver' : 'Activer'}
              </button>

              <button
                onClick={() => editPerm.allowed && onEdit(user)}
                disabled={!editPerm.allowed}
                className={`p-2 rounded-lg transition ${
                  !editPerm.allowed
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title={!editPerm.allowed ? editPerm.reason : 'Modifier'}
              >
                <Edit2 size={14} />
              </button>

              <button
                onClick={() => deletePerm.allowed && onDelete(user.id_user)}
                disabled={!deletePerm.allowed}
                className={`p-2 rounded-lg transition ${
                  !deletePerm.allowed
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                title={!deletePerm.allowed ? deletePerm.reason : 'Supprimer'}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {targetIsFounder && (
              <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 text-[10px] text-amber-800 font-semibold">
                <ShieldAlert size={11} />
                Compte fondateur protégé
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}