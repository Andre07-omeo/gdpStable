'use client';

export const dynamic = 'force-dynamic';

// ============================================
// PAGE - GESTION DES UTILISATEURS
// ============================================


import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Services - ✅ Importer les fonctions individuelles
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus,
  getUsersStats 
} from './services';


// Composants
import { UserStatsComponent } from './components/UserStats';
import { UserFiltersComponent } from './components/UserFilters';
import { UsersList } from './components/UsersList';
import { UserForm } from './components/UserForm';

// Types
import { User, CreateUserDTO, UpdateUserDTO, UserFilters } from './types/user.types';

// ✅ Créer un wrapper pour la compatibilité avec l'ancien code
const UserService = {
  getAll: getAllUsers,
  create: createUser,
  update: updateUser,
  delete: deleteUser,
  toggleStatus: toggleUserStatus,
  getStats: getUsersStats,
};

export default function UsersManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: number; code: string; libelle: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  const [stats, setStats] = useState({ total: 0, actifs: 0, inactifs: 0, byRole: {} });

  useEffect(() => {
    if (user && user.profil !== 'SUPER_ADMIN' && user.profil !== 'ADMIN_SYSTEM') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersData = await UserService.getAll(filters);
      setUsers(usersData);

      const rolesRes = await fetch('/api/admin/profils');
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.data || []);
      }

      const statsData = await UserService.getStats(usersData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // ✅ Fonction pour la création
  const handleSaveCreate = async (data: CreateUserDTO | UpdateUserDTO) => {
    setSaving(true);
    try {
      await UserService.create(data as CreateUserDTO);
      setIsFormOpen(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Fonction pour la mise à jour
  const handleSaveUpdate = async (data: CreateUserDTO | UpdateUserDTO) => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await UserService.update(editingUser.id || editingUser.id_user, data as UpdateUserDTO);
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
      await UserService.delete(id);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (id: number, actif: boolean) => {
    try {
      await UserService.toggleStatus(id, actif);
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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  const rolesList = roles.map(r => r.code);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion des utilisateurs</h1>
            <p className="text-sm text-gray-500">{stats.total} utilisateurs au total</p>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={18} />
              Nouvel utilisateur
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <UserStatsComponent stats={stats} loading={loading} />

        {/* Filtres */}
        <div className="mt-4">
          <UserFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            onReset={handleResetFilters}
            roles={rolesList}
          />
        </div>

        {/* Liste des utilisateurs */}
        <div className="mt-4">
          <UsersList
            users={users}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            loading={loading}
          />
        </div>

        {/* Modal Formulaire */}
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
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}