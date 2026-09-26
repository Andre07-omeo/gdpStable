'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/ComptableHeader.tsximport React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell } from 'lucide-react';

interface ComptableHeaderProps {
  onToggleSidebar: () => void;
  displayName: string;
  displayEmail: string;
  isSidebarOpen: boolean;
  activePage?: string;
}

export function ComptableHeader({
  onToggleSidebar,
  displayName,
  displayEmail,
  isSidebarOpen,
  activePage = 'dashboard',
}: ComptableHeaderProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // ✅ Empêche la divergence serveur/client
  useEffect(() => {
    setMounted(true);
  }, []);

  const getPageTitle = () => {
    if (pathname.includes('/paiements')) return 'Gestion des paiements';
    if (pathname.includes('/stats')) return 'Statistiques financières';
    if (pathname.includes('/factures')) return 'Gestion des factures';
    return 'Tableau de bord';
  };

  const getPageDescription = () => {
    if (pathname.includes('/paiements')) return 'Suivre les paiements des clients';
    if (pathname.includes('/stats')) return 'Analyses et indicateurs de performance';
    if (pathname.includes('/factures')) return 'Valider, rejeter et gérer les factures';
    return "Vue d'ensemble de la comptabilité";
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition lg:hidden flex-shrink-0"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">
              {getPageTitle()}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {getPageDescription()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="p-2 rounded-lg hover:bg-gray-100 transition relative">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* ✅ N'affiche le nom qu'après le montage */}
          {mounted && (
            <div className="hidden md:flex items-center gap-3 border-l border-gray-300 pl-3">
              <div className="text-right min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {displayName || 'Comptable'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {displayEmail || ''}
                </div>
              </div>
            </div>
          )}

          {/* Squelette pendant le SSR */}
          {!mounted && (
            <div className="hidden md:flex items-center gap-3 border-l border-gray-300 pl-3">
              <div className="text-right min-w-0">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mt-1" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}