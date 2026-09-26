'use client';

// src/app/dashboard/admin/page.tsx
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, MapPin, Calendar, Users, BarChart3,
  HelpCircle, LogOut, Menu, Loader2
} from 'lucide-react';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { AdminDashboardStats } from './components/AdminDashboardStats';
import { AdminPanneauxList } from './components/AdminPanneauxList';
import { AdminReservationsList } from './components/AdminReservationsList';
import { AdminSupport } from './components/AdminSupport';
import UsersManagementPage from './users/page';

// ✅ Type Panneau basé sur ta table MySQL
interface Panneau {
  id_panneau: number;
  nom: string;
  adresse: string;
  latitude: number;
  longitude: number;
  etat: string;
  commune: string;
  province: string;
  ville: string;
  created_at: string;
  updated_at: string;
  faces?: any[];
  nbFaces?: number;
}

// ✅ Type pour les statistiques
interface DashboardStats {
  totalPanneaux: number;
  totalFaces: number;
  facesLibres: number;
  facesOccupees: number;
  facesReservees: number;
  totalUsers: number;
  totalClients: number;
  totalReservations: number;
  reservationsEnCours: number;
  reservationsFutures: number;
  reservationsPassees: number;
  totalRevenue: number;
  tauxOccupation: number;
}

interface Reservation {
  id: string;
  societeLocatrice: string;
  panneau: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  const [panneaux, setPanneaux] = useState<Panneau[]>([]);
  const [panneauxLoading, setPanneauxLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);

  useEffect(() => {
    if (user && user.profil !== 'SUPER_ADMIN' && user.profil !== 'ADMIN_SYSTEM') {
      router.push('/dashboard');
    }
    setIsLoading(false);
  }, [user, router]);

  // ✅ Charger les statistiques
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Erreur stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  // ✅ Charger les panneaux
  useEffect(() => {
    const loadPanneaux = async () => {
      setPanneauxLoading(true);
      try {
        const res = await fetch('/api/panneaux');
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Panneaux chargés:', data);
          setPanneaux(data);
        }
      } catch (error) {
        console.error('Erreur panneaux:', error);
      } finally {
        setPanneauxLoading(false);
      }
    };
    loadPanneaux();
  }, []);

  // ✅ Charger les réservations
  useEffect(() => {
    const loadReservations = async () => {
      setReservationsLoading(true);
      try {
        const res = await fetch('/api/admin/reservations');
        if (res.ok) {
          const data = await res.json();
          console.log('📊 Réservations chargées:', data);
          setReservations(data);
        }
      } catch (error) {
        console.error('Erreur réservations:', error);
      } finally {
        setReservationsLoading(false);
      }
    };
    loadReservations();
  }, []);

  if (isLoading) {
    return (
      <LayoutWrapper>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
        </div>
      </LayoutWrapper>
    );
  }

  if (!user) return null;

  const menuItems = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'panneaux', label: 'Panneaux', icon: MapPin },
    { id: 'reservations', label: 'Réservations', icon: Calendar },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3 },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return <AdminDashboardStats stats={stats || undefined} loading={statsLoading} />;
      case 'panneaux':
        return <AdminPanneauxList panneaux={panneaux} onRefresh={() => window.location.reload()} />;
      case 'reservations':
        return <AdminReservationsList panneaux={panneaux} />;
      case 'users':
        return <UsersManagementPage />;
      case 'statistiques':
        return <AdminDashboardStats stats={stats || undefined} loading={statsLoading} />;
      case 'support':
        return <AdminSupport />;
      default:
        return <AdminDashboardStats stats={stats || undefined} loading={statsLoading} />;
    }
  };

  return (
    <LayoutWrapper>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-blue-800 to-blue-900 shadow-2xl sticky top-0 z-50 border-b border-white/10">
          <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                className="lg:hidden text-white hover:bg-white/10 p-2 rounded-lg" 
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">GDP <span className="text-amber-400">Admin</span></h1>
                <p className="text-[10px] text-blue-200">Administration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/80 hidden sm:inline">
                {user?.nom || ''} {user?.prenom || ''}
              </span>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full hidden sm:inline">
                {user?.profil || 'Admin'}
              </span>
              <button 
                onClick={logout} 
                className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveModule(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {renderContent()}
        </main>
      </div>
    </LayoutWrapper>
  );
}