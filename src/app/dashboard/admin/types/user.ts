// ============================================
// TYPES UTILISATEURS
// ============================================

export interface User {
  id: string;
  nom: string;
  postNom?: string;
  prenom?: string;
  nomComplet?: string;
  email: string;
  telephone: string;
  role: 'admin' | 'commercial' | 'comptable' | 'visiteur' | 'superviseurs';
  fonction?: string;
  actif: boolean;
  isOnline: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  nom: string;
  postNom?: string;
  prenom: string;
  telephone: string;
  email: string;
  fonction: string;
  role: string;
  password: string;
}

export interface UpdateUserDTO {
  nom?: string;
  postNom?: string;
  prenom?: string;
  telephone?: string;
  email?: string;
  fonction?: string;
  role?: string;
  password?: string;
  actif?: boolean;
}

export interface UserFilters {
  search?: string;
  role?: string;
  actif?: boolean;
}