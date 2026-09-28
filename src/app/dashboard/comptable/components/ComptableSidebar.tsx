// src/app/dashboard/comptable/components/ComptableSidebar.tsx

'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, FileText, CheckCircle, XCircle,
  Clock, CreditCard, LogOut, User, BarChart3,
  Shield, Wallet,
} from 'lucide-react';

interface ComptableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  displayEmail: string;
  onLogout: () => void;
  isMobile?: boolean;
}

export function ComptableSidebar({
  isOpen,
  onClose,
  displayName,
  displayEmail,
  onLogout,
  isMobile = false,
}: ComptableSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentTab = searchParams.get('tab') || 'dashboard';

  const menuItems = [
    {
      label: 'Tableau de bord',
      icon: <LayoutDashboard size={20} />,
      href: '/dashboard/comptable?tab=dashboard',
      id: 'dashboard',
      active: pathname === '/dashboard/comptable' && currentTab === 'dashboard',
    },
    {
      label: 'Factures',
      icon: <FileText size={20} />,
      href: '/dashboard/comptable?tab=factures',
      id: 'factures',
      active: pathname === '/dashboard/comptable' && currentTab === 'factures',
    },
    {
      label: 'Paiements',
      icon: <CreditCard size={20} />,
      href: '/dashboard/comptable/paiements',
      id: 'paiements',
      active: pathname === '/dashboard/comptable/paiements',
    },
    {
      label: 'Statistiques',
      icon: <BarChart3 size={20} />,
      href: '/dashboard/comptable/stats',
      id: 'stats',
      active: pathname === '/dashboard/comptable/stats',
    },
  ];

  if (isMobile && !isOpen) return null;

  return (
    <aside className="h-full w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-xl lg:shadow-none">
      {/* Logo */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-blue-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <Wallet size={20} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-sm truncate">
              Comptabilité
            </h1>
            <p className="text-xs text-gray-500 truncate">Gestion financière</p>
          </div>
        </div>
      </div>

      {/* Profil */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-blue-900 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
            <User size={18} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            {mounted ? (
              <>
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {displayName || 'Comptable'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {displayEmail || ''}
                </p>
              </>
            ) : (
              <>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-100 rounded animate-pulse mt-1" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              router.push(item.href);
              if (isMobile) onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
              item.active
                ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-700 shadow-sm'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span
              className={`flex-shrink-0 transition-colors ${
                item.active
                  ? 'text-blue-600'
                  : 'text-gray-400 group-hover:text-blue-600'
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`flex-1 text-sm font-medium text-left truncate ${
                item.active
                  ? 'text-blue-700 font-bold'
                  : 'text-gray-700 group-hover:text-blue-600'
              }`}
            >
              {item.label}
            </span>
            {item.active && (
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
            )}
          </button>
        ))}
      </nav>

      {/* Déconnexion */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-all duration-200 text-red-600 group"
        >
          <LogOut size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium truncate">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}