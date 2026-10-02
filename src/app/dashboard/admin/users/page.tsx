'use client';

// src/app/dashboard/admin/users/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUsersStats,
} from './services';

import { UserStatsComponent } from './components/UserStats';
import { UserFiltersComponent } from './components/UserFilters';
import { UsersList } from './components/UsersList';
import { UserForm } from './components/UserForm';

import type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
} from './types/user.types';

// ✅ Rôles autorisés à voir la page users
const ALLOWED_PROFILES = ['SUPER_ADMIN', 'ADMIN'];

export default function UsersManagementPage() {
  const { user: rawUser, isLoading: authLoading } = useAuth() as any;
  const router = useRouter();

  // ✅ On utilise directement rawUser (pas de normalisation nécessaire)
  const currentUser = rawUser;

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: number; code: string; libelle: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  const [stats, setStats] = useState({ total: 0, actifs: 0, inactifs: 0, byRole: {} });

  // ✅ Debug (à retirer en prod)
  useEffect(() => {
    console.log('🔍 [page] rawUser:', rawUser);
    console.log('🔍 [page] currentUser.profil:', rawUser?.profil);
  }, [rawUser]);

  // ✅ Vérif droits — plus tolérante
  useEffect(() => {
    if (authLoading) return;
    if (!rawUser) return;
    if (!rawUser.profil) return; // ⏳ Attend que le profil soit rempli

    const normalizedProfil = String(rawUser.profil).toUpperCase().trim();

    if (!ALLOWED_PROFILES.includes(normalizedProfil)) {
      console.log('❌ [page] Redirection — profil non autorisé:', normalizedProfil);
      router.push('/dashboard');
    } else {
      console.log('✅ [page] Accès autorisé pour:', normalizedProfil);
    }
  }, [rawUser, authLoading, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersData = await getAllUsers(filters);
      setUsers(usersData);

      const rolesRes = await fetch('/api/admin/profils');
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.data || []);
      }

      const statsData = await getUsersStats(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('❌ Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSaveCreate = async (data: CreateUserDTO | UpdateUserDTO) => {
    setSaving(true);
    try {
      await (createUser as any)(data as CreateUserDTO, rawUser?.id_user || rawUser?.id);
      setIsFormOpen(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUpdate = async (data: CreateUserDTO | UpdateUserDTO) => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await (updateUser as any)(
        editingUser.id_user,
        data as UpdateUserDTO,
        rawUser?.id_user || rawUser?.id
      );
      setIsFormOpen(false);
      setEditingUser(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }
    try {
      await (deleteUser as any)(id, rawUser?.id_user || rawUser?.id);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (id: number, actif: boolean) => {
    try {
      await (toggleUserStatus as any)(id, actif, rawUser?.id_user || rawUser?.id);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors du changement de statut');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  if (authLoading || (loading && users.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">
            {authLoading ? 'Chargement de la session...' : 'Chargement des utilisateurs...'}
          </p>
        </div>
      </div>
    );
  }

  const rolesList = roles.map((r) => r.code);

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-[2400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Gestion des utilisateurs
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {stats.total} utilisateur{stats.total > 1 ? 's' : ''} au total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              title="Rafraîchir"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setIsFormOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nouvel utilisateur</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>

        <UserStatsComponent stats={stats} loading={loading} />

        <div className="mt-4">
          <UserFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            roles={rolesList}
          />
        </div>

        <div className="mt-4">
          <UsersList
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            loading={loading}
            currentUser={rawUser}
          />
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <UserForm
              isOpen={isFormOpen}
              onClose={() => {
                setIsFormOpen(false);
                setEditingUser(null);
              }}
              onSave={editingUser ? handleSaveUpdate : handleSaveCreate}
              user={editingUser}
              roles={roles}
              loading={saving}
              currentUser={rawUser}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}