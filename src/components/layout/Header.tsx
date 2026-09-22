// src/components/layout/Header.tsx

'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Menu, X, LogOut, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Récupérer le nom complet depuis MySQL (nom + prenom)
  const getFullName = () => {
    if (!user) return 'Utilisateur';
    
    // MySQL: nom et prenom sont séparés
    const nom = user.nom || '';
    const prenom = user.prenom || '';
    
    if (nom && prenom) {
      return `${nom} ${prenom}`;
    }
    if (nom) return nom;
    if (prenom) return prenom;
    if (user.email) return user.email.split('@')[0];
    
    return 'Utilisateur';
  };

  // Récupérer les initiales (nom + prenom)
  const getInitials = () => {
    if (!user) return 'U';
    
    const nom = user.nom || '';
    const prenom = user.prenom || '';
    
    if (nom && prenom) {
      return `${nom.charAt(0)}${prenom.charAt(0)}`.toUpperCase();
    }
    if (nom) return nom.charAt(0).toUpperCase();
    if (prenom) return prenom.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    
    return 'U';
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-50 border-b border-blue-700/30">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
          <MapPin size={28} className="text-amber-400" />
          <span className="text-xl font-bold tracking-tight">
            Geo<span className="text-amber-400">Marketing</span>
          </span>
        </Link>

        {/* Navigation Desktop */}
        <nav className="hidden md:flex items-center gap-4">
          <Link 
            href="/" 
            className="text-blue-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            Accueil
          </Link>
          
          {user ? (
            <>
              <Link 
                href="/dashboard" 
                className="bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition shadow-sm hover:shadow-md font-bold"
              >
                Tableau de bord
              </Link>
              <div className="flex items-center gap-3 ml-2">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center border-2 border-amber-400">
                  <span className="text-sm font-bold text-amber-400">
                    {getInitials()}
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-100">
                  {getFullName()}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={18} className="text-red-400" />
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              className="bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition shadow-sm hover:shadow-md font-bold"
            >
              Connexion
            </Link>
          )}
        </nav>

        {/* Menu Mobile Button */}
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Navigation Mobile */}
      {isMenuOpen && (
        <div className="md:hidden bg-blue-900/95 backdrop-blur-sm border-t border-blue-700/30 p-4 space-y-3">
          <Link 
            href="/" 
            className="block text-blue-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Accueil
          </Link>
          
          {user ? (
            <>
              <Link 
                href="/dashboard" 
                className="block bg-amber-500 text-black px-4 py-2 rounded-lg text-center hover:bg-amber-400 transition font-bold"
                onClick={() => setIsMenuOpen(false)}
              >
                Tableau de bord
              </Link>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-400">
                    <span className="text-xs font-bold text-amber-400">
                      {getInitials()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-blue-100">
                    {getFullName()}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-sm text-red-400"
                >
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <Link 
              href="/login" 
              className="block bg-amber-500 text-black px-4 py-2 rounded-lg text-center hover:bg-amber-400 transition font-bold"
              onClick={() => setIsMenuOpen(false)}
            >
              Connexion
            </Link>
          )}
        </div>
      )}
    </header>
  );
}