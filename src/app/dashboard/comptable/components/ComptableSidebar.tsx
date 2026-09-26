'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/comptable/components/ComptableSidebar.tsximport React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  LogOut,
  User,
  BarChart3,
  Shield,
} from 'lucide-react';

interface ComptableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  displayName: string;
  displayEmail: string;
  onLogout: () => void;
  activePage?: string;
  isMobile?: boolean;
}

export function ComptableSidebar({
  isOpen,
  onClose,
  displayName,
  displayEmail,
  onLogout,
  activePage = 'dashboard',
  isMobile = false,
}: ComptableSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // ✅ Éviter les divergences serveur/client
  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    {
      label: 'Tableau de bord',
      icon: <LayoutDashboard size={20} />,
      href: '/dashboard/comptable',
      id: 'dashboard',
    },
    {
      label: '📋 En attente',
      icon: <Clock size={20} />,
      href: '/dashboard/comptable/factures?status=EN_ATTENTE',
      id: 'factures',
    },
    {
      label: '✅ Validées',
      icon: <CheckCircle size={20} />,
      href: '/dashboard/comptable/factures?status=VALIDE',
      id: 'factures',
    },
    {
      label: '❌ Rejetées',
      icon: <XCircle size={20} />,
      href: '/dashboard/comptable/factures?status=REJETEE',
      id: 'factures',
    },
    {
      label: '📄 Toutes',
      icon: <FileText size={20} />,
      href: '/dashboard/comptable/factures?status=TOUS',
      id: 'factures',
    },
    {
      label: '💳 Paiements',
      icon: <CreditCard size={20} />,
      href: '/dashboard/comptable/paiements',
      id: 'paiements',
    },
    {
      label: '📊 Statistiques',
      icon: <BarChart3 size={20} />,
      href: '/dashboard/comptable/stats',
      id: 'stats',
    },
  ];

  const isActive = (item: { href: string; id: string }) => {
    if (item.id === 'paiements') return pathname === '/dashboard/comptable/paiements';
    if (item.id === 'stats') return pathname === '/dashboard/comptable/stats';
    if (item.id === 'dashboard') return pathname === '/dashboard/comptable';
    if (item.id === 'factures') return pathname.includes('/factures');
    return false;
  };

  if (isMobile && !isOpen) return null;

  return (
    <aside className="h-full w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-sm truncate">
              Comptabilité
            </h1>
            <p className="text-xs text-gray-500 truncate">Gestion financière</p>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            {/* ✅ N'affiche le nom qu'après le montage */}
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

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item, index) => {
          const active = isActive(item);
          return (
            <button
              key={index}
              onClick={() => {
                router.push(item.href);
                if (isMobile) onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition group ${
                active
                  ? 'bg-blue-50 text-blue-600'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span
                className={`flex-shrink-0 ${
                  active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`flex-1 text-sm font-medium text-left truncate ${
                  active ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'
                }`}
              >
                {item.label}
              </span>
              {item.id === 'factures' && active && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-shrink-0 p-3 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-50 transition text-red-600"
        >
          <LogOut size={20} className="flex-shrink-0" />
          <span className="text-sm font-medium truncate">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}