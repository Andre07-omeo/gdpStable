// src/app/dashboard/admin/users/components/index.ts
// ============================================
// EXPORTS DES COMPOSANTS - GESTION DES UTILISATEURS
// ============================================

export { UserStatsComponent } from './UserStats';
export { UserFiltersComponent } from './UserFilters';
export { UserForm } from './UserForm';
export { UsersList } from './UsersList';

// ✅ Ré-exports de types (pratique pour les imports)
export type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
  UserStats,
} from '../types/user.types';