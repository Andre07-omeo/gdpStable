// src/context/AuthContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================
export interface User {
  id: number;
  id_user?: number;
  email: string;
  nom: string;
  prenom: string;
  profil: string;
  profilLibelle: string;
  id_profil: number;
  niveau: number;
  zone_travail?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  getDashboardPath: () => string;
  getUserName: () => string;
  getUserEmail: () => string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// CLÉS DE STOCKAGE
// ============================================
const STORAGE_KEYS = {
  user: 'user',
  nomComplet: 'user_nom_complet',
  email: 'user_email',
  profil: 'user_profil',
  prenom: 'user_prenom',
  nom: 'user_nom',
} as const;

// ============================================
// HELPERS
// ============================================

/** Retourne le chemin du dashboard selon le rôle */
function getDashboardPathForRole(role: string): string {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    ADMIN_SYSTEM: '/dashboard/admin-system',
    DG: '/dashboard/dg',
    PDG: '/dashboard/pdg',
    CHEF_COMMERCIAL: '/dashboard/commercial',
    COMMERCIAL: '/dashboard/commercial',
    SUPERVISEUR: '/dashboard/superviseur',
    CAISSIER: '/dashboard/caissier',
    COMPTABLE: '/dashboard/comptable',
  };
  return roleMap[role] || '/dashboard';
}

/** Normalise la réponse brute de /api/auth/me ou /api/auth/login */
function normalizeUser(raw: any): User {
  return {
    id: raw.id ?? raw.id_user ?? raw.id_utilisateur ?? 0,
    id_user: raw.id_user ?? raw.id ?? 0,
    email: raw.email ?? '',
    nom: raw.nom ?? '',
    prenom: raw.prenom ?? '',
    profil: raw.profil ?? raw.profil_code ?? 'VISITEUR',
    profilLibelle: raw.profilLibelle ?? raw.profil_libelle ?? 'Visiteur',
    id_profil: raw.id_profil ?? 0,
    niveau: raw.niveau ?? raw.zone_niveau ?? 0,
    zone_travail: raw.zone_travail ?? undefined,
  };
}

// ============================================
// PROVIDER
// ============================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // --------------------------------------------
  // Persistance localStorage
  // --------------------------------------------
  const saveUserToStorage = useCallback((userData: User) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.email, userData.email || '');
      localStorage.setItem(STORAGE_KEYS.profil, userData.profil || '');
      localStorage.setItem(STORAGE_KEYS.prenom, userData.prenom || '');
      localStorage.setItem(STORAGE_KEYS.nom, userData.nom || '');

      const nomComplet = `${userData.prenom || ''} ${userData.nom || ''}`.trim();
      localStorage.setItem(
        STORAGE_KEYS.nomComplet,
        nomComplet || 'Commercial'
      );
    } catch (err) {
      console.error('❌ Erreur sauvegarde localStorage:', err);
    }
  }, []);

  const clearUserStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key)
      );
    } catch (err) {
      console.error('❌ Erreur nettoyage localStorage:', err);
    }
  }, []);

  const loadUserFromStorage = useCallback((): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, []);

  // --------------------------------------------
  // Helpers exposés
  // --------------------------------------------
  const getUserName = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const nomComplet = localStorage.getItem(STORAGE_KEYS.nomComplet);
      if (nomComplet && nomComplet.trim() !== '') return nomComplet;
    }
    if (user?.prenom && user?.nom) return `${user.prenom} ${user.nom}`.trim();
    if (user?.nom) return user.nom;
    return 'Commercial';
  }, [user]);

  const getUserEmail = useCallback((): string => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem(STORAGE_KEYS.email);
      if (email) return email;
    }
    return user?.email || '';
  }, [user]);

  // --------------------------------------------
  // Restauration de session au montage
  // --------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      // 1. Affichage immédiat depuis localStorage (évite un flash)
      const cached = loadUserFromStorage();
      if (cached) {
        setUser(cached);
      }

      // 2. Vérification serveur en arrière-plan
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (cancelled) return;

        if (!res.ok) {
          // 401 → nettoyage propre
          setUser(null);
          clearUserStorage();
          return;
        }

        const data = await res.json();

        // ✅ CORRECTION MAJEURE :
        // La route /api/auth/me renvoie l'utilisateur À PLAT
        // (pas { user: {...} }). On accepte les deux au cas où.
        const rawUser = data?.user ?? data;

        if (rawUser && (rawUser.id || rawUser.id_user || rawUser.email)) {
          const normalized = normalizeUser(rawUser);
          setUser(normalized);
          saveUserToStorage(normalized);
          console.log('✅ Session restaurée :', normalized.email);
        } else {
          console.warn('⚠️ Réponse /api/auth/me inattendue:', data);
          setUser(null);
          clearUserStorage();
        }
      } catch (err) {
        if (cancelled) return;
        console.error('❌ Erreur restauration session:', err);
        // On garde le cache localStorage si présent — évite un faux logout
        // (ex: panne réseau temporaire)
        if (!cached) {
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, [loadUserFromStorage, saveUserToStorage, clearUserStorage]);

  // --------------------------------------------
  // Login
  // --------------------------------------------
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            message: data.message || data.error || 'Erreur de connexion',
          };
        }

        // ✅ Accepter aussi bien { user: {...} } que l'user à plat
        const rawUser = data?.user ?? data;

        if (rawUser && (rawUser.id || rawUser.id_user || rawUser.email)) {
          const normalized = normalizeUser(rawUser);
          setUser(normalized);
          saveUserToStorage(normalized);
          console.log('✅ Connexion réussie :', normalized.email);
        }

        const dashboardPath = getDashboardPathForRole(
          rawUser?.profil || rawUser?.profil_code || 'COMMERCIAL'
        );
        router.push(dashboardPath);

        return { success: true };
      } catch (err) {
        console.error('❌ Erreur login:', err);
        return { success: false, message: 'Erreur technique' };
      }
    },
    [router, saveUserToStorage]
  );

  // --------------------------------------------
  // Logout
  // --------------------------------------------
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('❌ Erreur logout API:', err);
    } finally {
      setUser(null);
      clearUserStorage();
      router.push('/login');
    }
  }, [router, clearUserStorage]);

  // --------------------------------------------
  // Refresh manuel
  // --------------------------------------------
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) {
        setUser(null);
        clearUserStorage();
        return;
      }

      const data = await res.json();
      const rawUser = data?.user ?? data;

      if (rawUser && (rawUser.id || rawUser.id_user || rawUser.email)) {
        const normalized = normalizeUser(rawUser);
        setUser(normalized);
        saveUserToStorage(normalized);
      }
    } catch (err) {
      console.error('❌ Erreur refreshUser:', err);
    }
  }, [saveUserToStorage, clearUserStorage]);

  // --------------------------------------------
  // hasRole
  // --------------------------------------------
  const hasRole = useCallback(
    (roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.profil);
    },
    [user]
  );

  // --------------------------------------------
  // Valeur du contexte (mémoïsée)
  // --------------------------------------------
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      hasRole,
      getDashboardPath: () =>
        user ? getDashboardPathForRole(user.profil) : '/login',
      getUserName,
      getUserEmail,
      refreshUser,
    }),
    [user, isLoading, login, logout, hasRole, getUserName, getUserEmail, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// HOOK
// ============================================
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  }
  return ctx;
}