'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/layout.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { ComptableSidebar } from './components/ComptableSidebar';
import { ComptableHeader } from './components/ComptableHeader';

interface ComptableLayoutProps {
  children: React.ReactNode;
}

export default function ComptableLayout({ children }: ComptableLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, getUserName, getUserEmail } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Évite la divergence serveur/client (hydration error)
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');

  // ✅ 1. Marquer le composant comme monté côté client
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 2. Charger les valeurs depuis localStorage UNIQUEMENT côté client
  useEffect(() => {
    if (mounted) {
      try {
        setDisplayName(getUserName() || 'Comptable');
        setDisplayEmail(getUserEmail() || '');
      } catch (e) {
        console.warn('Erreur getUserName/getUserEmail:', e);
        setDisplayName('Comptable');
        setDisplayEmail('');
      }
    }
  }, [mounted, getUserName, getUserEmail]);

  // ✅ 3. Détection du mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await logout();
      router.push('/login');
    }
  };

  const getActivePage = () => {
    if (pathname.includes('/factures')) return 'factures';
    if (pathname.includes('/paiements')) return 'paiements';
    if (pathname.includes('/stats')) return 'stats';
    return 'dashboard';
  };

  const activePage = getActivePage();

  // ✅ 4. Écran de chargement pendant le SSR (évite le mismatch)
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 w-full">
      <div className="flex-shrink-0 z-40">
        <ComptableHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          displayName={displayName}
          displayEmail={displayEmail}
          isSidebarOpen={isSidebarOpen}
          activePage={activePage}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <div
          className={`flex-shrink-0 transition-all duration-300 ${
            isSidebarOpen ? 'w-64' : 'w-0 lg:w-64'
          } ${
            isMobile && isSidebarOpen
              ? 'absolute inset-y-0 left-0 z-50'
              : 'relative'
          }`}
        >
          <ComptableSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            displayName={displayName}
            displayEmail={displayEmail}
            onLogout={handleLogout}
            activePage={activePage}
            isMobile={isMobile}
          />
        </div>

        {/* ✅ CONTENEUR PRINCIPAL — 100% largeur restante + paddings progressifs */}
        <div className="flex-1 w-full min-w-0 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-3 sm:py-4 md:py-6 min-h-0">
          {children}
        </div>

        {isSidebarOpen && isMobile && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}