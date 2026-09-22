// src/app/dashboard/superviseur/components/SupervisorHeader.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Bell, User, LogOut, Settings,
  Menu, X, ChevronDown, MapPin, Calendar,
  LayoutDashboard, HelpCircle, ChevronRight,
  Search, Users, BarChart3, Eye, CheckCircle, Clock, AlertCircle,
  Building, List,Plus
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
// Dans page.tsx, ajouter ChevronRight aux imports
interface SupervisorHeaderProps {
  user: any;
  activeView: 'dashboard' | 'map' | 'panneaux'; // ✅ Ajouter 'panneaux'
  onViewChange: (view: 'dashboard' | 'map' | 'panneaux') => void; // ✅ Ajouter 'panneaux'
  panneaux?: any[];
}

export default function SupervisorHeader({
  user,
  activeView,
  onViewChange,
  panneaux = []
}: SupervisorHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
const [isFormOpen, setIsFormOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Notifications simulées
  const notifications = [
    { id: 1, title: 'Nouveau panneau à valider', time: 'Il y a 2 min', type: 'warning' },
    { id: 2, title: 'Réservation #1234 confirmée', time: 'Il y a 15 min', type: 'success' },
    { id: 3, title: 'Maintenance planifiée', time: 'Il y a 1 heure', type: 'info' },
  ];

  const getInitials = () => {
    const nom = user?.nom || '';
    const prenom = user?.prenom || '';
    if (nom && prenom) return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
    return nom?.charAt(0)?.toUpperCase() || 'U';
  };

  const getFullName = () => {
    const nom = user?.nom || '';
    const prenom = user?.prenom || '';
    if (nom && prenom) return `${nom} ${prenom}`;
    return nom || user?.email?.split('@')[0] || 'Utilisateur';
  };

  return (
    <>
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-2xl sticky top-0 z-50 border-b border-blue-700/50">
        <div className="px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo et titre */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
                  <Shield size={22} className="text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-900 animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-amber-400">GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-blue-100">Superviseur</span>
                </h1>
                <p className="text-[9px] text-blue-300 uppercase tracking-[0.15em] font-bold">
                  {user?.profilLibelle || 'Gestion des panneaux'}
                </p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-white">
                  <span className="text-amber-400">GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-blue-100">Super</span>
                </h1>
              </div>
            </div>

            {/* Navigation centrale */}
            <nav className="hidden md:flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'dashboard'
                    ? 'bg-white/20 text-white shadow-lg shadow-white/10'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
              >
                <LayoutDashboard size={16} />
                <span>Tableau de bord</span>
              </button>
              <button
                onClick={() => onViewChange('panneaux')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'panneaux'
                    ? 'bg-white/20 text-white shadow-lg shadow-white/10'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Building size={16} />
                <span>Panneaux</span>
              </button>
              <button
                onClick={() => onViewChange('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeView === 'map'
                    ? 'bg-white/20 text-white shadow-lg shadow-white/10'
                    : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}
              >
                <MapPin size={16} />
                <span>Carte</span>
              </button>
            </nav>

            {/* Actions droite - inchangé */}
            <div className="flex items-center gap-2">
              <button className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 hover:text-white transition">
                <Search size={16} />
                <span className="text-xs">Rechercher...</span>
                <span className="text-[8px] text-blue-400 bg-white/10 px-1.5 py-0.5 rounded">⌘K</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                >
                  <Bell size={18} className="text-blue-200" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">3</span>
                </button>
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-bold text-gray-800">Notifications</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-bold">Tout marquer lu</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.type === 'warning' ? 'bg-amber-500' :
                                notif.type === 'success' ? 'bg-emerald-500' :
                                  'bg-blue-500'
                              }`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                              <p className="text-xs text-gray-400">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-gray-100">
                      <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-bold">Voir toutes les notifications</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center border border-amber-400 shadow-lg shadow-amber-500/20">
                    <span className="text-sm font-bold text-amber-400">{getInitials()}</span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-white leading-tight">{getFullName()}</p>
                    <p className="text-[8px] text-blue-300 uppercase tracking-wider">{user?.profilLibelle || 'Superviseur'}</p>
                  </div>
                  <ChevronDown size={14} className="text-blue-300 group-hover:text-white transition" />
                </button>
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border-2 border-amber-400">
                          <span className="text-lg font-bold text-amber-600">{getInitials()}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{getFullName()}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <span className="text-[8px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">{user?.profilLibelle || 'Superviseur'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition text-sm">
                        <User size={16} className="text-gray-400" /> Mon profil
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition text-sm">
                        <Settings size={16} className="text-gray-400" /> Paramètres
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition text-sm">
                        <BarChart3 size={16} className="text-gray-400" /> Statistiques
                      </button>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition text-sm">
                        <HelpCircle size={16} className="text-gray-400" /> Aide & Support
                      </button>
                      <hr className="my-2 border-gray-200" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700 transition text-sm font-bold">
                        <LogOut size={16} /> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                {isMenuOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
              </button>
            </div>
          </div>

          {/* Barre de statut */}
          <div className="mt-2 flex items-center gap-4 text-[10px] text-blue-300 border-t border-blue-700/30 pt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Système opérationnel</span>
            </div>
            <div className="w-px h-3 bg-blue-700/50" />
            <div className="flex items-center gap-1.5">
              <Users size={10} className="text-blue-400" />
              <span>{panneaux?.length || 0} panneaux actifs</span>
            </div>
            <div className="w-px h-3 bg-blue-700/50" />
            <div className="flex items-center gap-1.5">
              <Calendar size={10} className="text-blue-400" />
              <span>0 réservations en attente</span>
            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-blue-900/95 backdrop-blur-sm border-t border-blue-700/30 p-4 space-y-2">
            <button
              onClick={() => { onViewChange('dashboard'); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeView === 'dashboard' ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              <LayoutDashboard size={18} /> <span className="font-bold">Tableau de bord</span>
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-amber-400 transition flex items-center gap-2"
            >
              <Plus size={18} />
              Nouveau panneau
            </button>
            <button
              onClick={() => { onViewChange('panneaux'); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeView === 'panneaux' ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              <Building size={18} /> <span className="font-bold">Gestion panneaux</span>
            </button>
            <button
              onClick={() => { onViewChange('map'); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeView === 'map' ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              <MapPin size={18} /> <span className="font-bold">Carte interactive</span>
            </button>
            <hr className="border-blue-700/30 my-2" />
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition">
              <Bell size={18} /> <span className="font-bold">Notifications</span>
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition">
              <LogOut size={18} /> <span className="font-bold">Déconnexion</span>
            </button>
          </div>
        )}
      </header>
    </>
  );
}