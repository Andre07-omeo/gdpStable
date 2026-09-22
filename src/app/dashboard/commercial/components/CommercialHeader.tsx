// src/app/dashboard/commercial/components/CommercialHeader.tsx
'use client';

import Image from 'next/image';
import {
  Bell, RefreshCw, User,
  MapPin, BarChart3, Users,
  BookOpen, Download, TrendingUp,
  ClipboardCheck,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getFeaturesByProfil } from '../types/commercial.types';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ProfileDropdown, DropdownExtraAction } from './ProfileDropdown';

interface CommercialHeaderProps {
  user: any;
  onLogout: () => void;
  onRefresh: () => void;
  onNotificationsToggle: () => void;
  onAdminToggle?: () => void;
  onCatalogueToggle?: () => void;
  onMapToggle?: () => void;
  onExportToggle?: () => void;
  onReportsToggle?: () => void;
  onPredictionsToggle?: () => void;
  onTeamManagementToggle?: () => void;
  onReservationsManagementToggle?: () => void;
  onProfileClick?: () => void;
  onChangePasswordClick?: () => void;
  onSettingsClick?: () => void;
  notificationCount: number;
}

export function CommercialHeader({
  user,
  onLogout,
  onRefresh,
  onNotificationsToggle,
  onAdminToggle,
  onCatalogueToggle,
  onMapToggle,
  onExportToggle,
  onReportsToggle,
  onPredictionsToggle,
  onTeamManagementToggle,
  onReservationsManagementToggle,
  onProfileClick,
  onChangePasswordClick,
  onSettingsClick,
  notificationCount,
}: CommercialHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { getUserName, getUserEmail } = useAuth();

  useEffect(() => setMounted(true), []);

  // ✅ Détecter le mode mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const displayName = mounted ? getUserName() : '';
  const displayEmail = mounted ? getUserEmail() : '';

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const features = user ? getFeaturesByProfil(user.profil) : null;
  const isAdmin =
    user?.profil === 'SUPER_ADMIN' || user?.profil === 'ADMIN_SYSTEM';

  // ============================================
  // ✅ EXTRA ACTIONS pour le menu mobile
  // (ajoutées uniquement si on est sur mobile)
  // ============================================
  const extraActions: DropdownExtraAction[] = [
    {
      id: 'catalogue',
      label: 'Catalogue',
      icon: <BookOpen size={16} />,
      onClick: () => onCatalogueToggle?.(),
      hidden: !onCatalogueToggle,
    },
    {
      id: 'map',
      label: 'Carte',
      icon: <MapPin size={16} />,
      onClick: () => onMapToggle?.(),
      hidden: !onMapToggle,
    },
    {
      id: 'export',
      label: 'Exporter',
      icon: <Download size={16} />,
      onClick: () => onExportToggle?.(),
      hidden: !onExportToggle,
    },
    {
      id: 'team',
      label: "Gestion de l'équipe",
      icon: <Users size={16} />,
      onClick: () => onTeamManagementToggle?.(),
      hidden: !features?.canManageTeam || !onTeamManagementToggle,
    },
    {
      id: 'reservations',
      label: 'Gestion des réservations',
      icon: <ClipboardCheck size={16} />,
      onClick: () => onReservationsManagementToggle?.(),
      hidden: !features?.canModifyReservations || !onReservationsManagementToggle,
    },
    {
      id: 'reports',
      label: 'Rapports',
      icon: <BarChart3 size={16} />,
      onClick: () => onReportsToggle?.(),
      hidden: !features?.canViewReports || !onReportsToggle,
    },
    {
      id: 'predictions',
      label: 'Prédictions',
      icon: <TrendingUp size={16} />,
      onClick: () => onPredictionsToggle?.(),
      hidden: !features?.canViewPredictions || !onPredictionsToggle,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell size={16} />,
      onClick: () => onNotificationsToggle?.(),
      badge: notificationCount,
      hidden: !onNotificationsToggle,
    },
    {
      id: 'refresh',
      label: 'Actualiser',
      icon: <RefreshCw size={16} />,
      onClick: handleRefresh,
    },
    {
      id: 'admin',
      label: 'Admin',
      icon: <User size={16} />,
      onClick: () => onAdminToggle?.(),
      hidden: !isAdmin || !onAdminToggle,
    },
  ];

  // ============================================
  // ACTION BUTTON (icône — desktop uniquement)
  // ============================================
  const ActionButton = ({
    onClick,
    icon,
    title,
    colorClass,
    glowColor,
    hidden = '',
  }: {
    onClick?: () => void;
    icon: React.ReactNode;
    title: string;
    colorClass: string;
    glowColor: string;
    hidden?: string;
  }) => {
    if (!onClick) return null;
    return (
      <button
        onClick={onClick}
        className={`
          group relative p-1.5 sm:p-2 rounded-xl
          transition-all duration-300 ease-out
          hover:scale-110 active:scale-95
          ${colorClass}
          shadow-lg hover:shadow-xl
          border border-white/10
          ${hidden}
        `}
        title={title}
      >
        <span
          className={`
            absolute inset-0 rounded-xl
            opacity-0 group-hover:opacity-60
            transition-opacity duration-500
            blur-lg -z-10
            ${glowColor}
          `}
        />
        <span className="relative z-10 block transition-transform duration-300 group-hover:rotate-6">
          {icon}
        </span>
      </button>
    );
  };

  return (
    <>
      <header
        className="
          bg-gradient-to-r from-blue-800 via-blue-700 to-blue-800
          shadow-2xl sticky top-0 z-50
          border-b border-blue-600/50
        "
      >
        <div className="px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">

            {/* 1. LOGO + TITRE */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => (window.location.href = '/dashboard')}
                className="relative group transition-all duration-500 hover:scale-110 active:scale-95"
                title="Accueil"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10 overflow-hidden">
                  <Image
                    src="/icons/icon-32x32.png"
                    alt="Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-800 animate-pulse" />
              </button>

              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-amber-400">GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-blue-100">Commercial</span>
                </h1>
                <p className="text-[9px] text-blue-300 uppercase tracking-[0.15em] font-bold">
                  {user?.profilLibelle || 'Espace commercial'}
                </p>
              </div>

              <div className="sm:hidden">
                <h1 className="text-base font-bold text-white">
                  <span className="text-amber-400">GDP</span>
                  <span className="text-white/60">|</span>
                  <span className="text-blue-100">Com</span>
                </h1>
              </div>
            </div>

            <div className="flex-1" />

            {/* 2. PROFIL (desktop seulement) */}
            {mounted && displayName && (
              <div className="hidden lg:flex items-center gap-2 flex-shrink-0 mr-2">
                <div className="text-right max-w-[200px]">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-blue-200 truncate italic leading-tight">
                    {displayEmail}
                  </p>
                </div>
              </div>
            )}

            <div className="hidden lg:block w-px h-8 bg-blue-600/50 mx-1" />

            {/* 3. ICÔNES — DESKTOP UNIQUEMENT (sm+) */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <ActionButton
                onClick={onCatalogueToggle}
                icon={<BookOpen className="w-4 h-4 text-white" />}
                title="Catalogue"
                colorClass="bg-blue-600 hover:bg-blue-500"
                glowColor="bg-blue-400"
              />

              <ActionButton
                onClick={onMapToggle}
                icon={<MapPin className="w-4 h-4 text-white" />}
                title="Carte"
                colorClass="bg-emerald-600 hover:bg-emerald-500"
                glowColor="bg-emerald-400"
              />

              <ActionButton
                onClick={onExportToggle}
                icon={<Download className="w-4 h-4 text-white" />}
                title="Exporter"
                colorClass="bg-violet-600 hover:bg-violet-500"
                glowColor="bg-violet-400"
                hidden="hidden md:block"
              />

              <ActionButton
                onClick={features?.canManageTeam ? onTeamManagementToggle : undefined}
                icon={<Users className="w-4 h-4 text-white" />}
                title="Gestion de l'équipe"
                colorClass="bg-orange-600 hover:bg-orange-500"
                glowColor="bg-orange-400"
                hidden="hidden md:block"
              />

              <ActionButton
                onClick={
                  features?.canModifyReservations
                    ? onReservationsManagementToggle
                    : undefined
                }
                icon={<ClipboardCheck className="w-4 h-4 text-white" />}
                title="Gestion des réservations"
                colorClass="bg-amber-600 hover:bg-amber-500"
                glowColor="bg-amber-400"
                hidden="hidden lg:block"
              />

              <ActionButton
                onClick={features?.canViewReports ? onReportsToggle : undefined}
                icon={<BarChart3 className="w-4 h-4 text-white" />}
                title="Rapports"
                colorClass="bg-cyan-600 hover:bg-cyan-500"
                glowColor="bg-cyan-400"
                hidden="hidden lg:block"
              />

              <ActionButton
                onClick={features?.canViewPredictions ? onPredictionsToggle : undefined}
                icon={<TrendingUp className="w-4 h-4 text-white" />}
                title="Prédictions"
                colorClass="bg-indigo-600 hover:bg-indigo-500"
                glowColor="bg-indigo-400"
                hidden="hidden xl:block"
              />

              {onNotificationsToggle && (
                <button
                  onClick={onNotificationsToggle}
                  className="
                    group relative p-2 rounded-xl
                    bg-white/5 hover:bg-white/10
                    border border-white/10
                    text-blue-200 hover:text-white
                    transition-all duration-300 ease-out
                    hover:scale-110 active:scale-95
                  "
                  title="Notifications"
                >
                  <Bell className="w-4 h-4 transition-transform duration-300 group-hover:rotate-12" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={handleRefresh}
                className="
                  group relative p-2 rounded-xl
                  bg-white/5 hover:bg-white/10
                  border border-white/10
                  text-blue-200 hover:text-white
                  transition-all duration-300 ease-out
                  hover:scale-110 active:scale-95
                "
                title="Actualiser"
              >
                <RefreshCw
                  className={`w-4 h-4 transition-transform duration-300 group-hover:rotate-180 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
              </button>

              <ActionButton
                onClick={isAdmin ? onAdminToggle : undefined}
                icon={<User className="w-4 h-4 text-white" />}
                title="Admin"
                colorClass="bg-fuchsia-600 hover:bg-fuchsia-500"
                glowColor="bg-fuchsia-400"
                hidden="hidden lg:block"
              />
            </div>

            <div className="hidden sm:block w-px h-8 bg-blue-600/50 mx-1" />

            {/* 4. AVATAR + DROPDOWN (toujours visible) */}
            {mounted && displayName && (
              <div className="flex-shrink-0">
                <ProfileDropdown
                  userName={displayName}
                  userEmail={displayEmail}
                  userProfil={user?.profil || ''}
                  onLogout={onLogout}
                  onProfileClick={onProfileClick}
                  onChangePasswordClick={onChangePasswordClick}
                  onSettingsClick={onSettingsClick}
                  onHelpClick={() => console.log('Aide')}
                  // ✅ En mode mobile uniquement, on injecte les onglets
                  extraActions={isMobile ? extraActions : []}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={onLogout}
        userName={displayName || 'Utilisateur'}
      />
    </>
  );
}