'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/ProfileDropdown.tsximport { useState, useRef, useEffect } from 'react';
import {
  User, Lock, LogOut, Settings, ChevronDown,
  HelpCircle, BarChart3,
} from 'lucide-react';
import { ProfileModal } from './profile/ProfileModal';
import { ChangePasswordModal } from './profile/ChangePasswordModal';
import { StatsModal } from './profile/StatsModal';
import { InfoModal } from './profile/InfoModal';

export interface DropdownExtraAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: number;
  hidden?: boolean;
}

interface ProfileDropdownProps {
  userName: string;
  userEmail: string;
  userProfil: string;
  onLogout: () => void;
  onProfileClick?: () => void;
  onChangePasswordClick?: () => void;
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  extraActions?: DropdownExtraAction[];
}

export function ProfileDropdown({
  userName,
  userEmail,
  userProfil,
  onLogout,
  onProfileClick,
  onChangePasswordClick,
  onSettingsClick,
  onHelpClick,
  extraActions = [],
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getProfilLabel = (profil: string) => {
    const map: Record<string, string> = {
      PDG: 'Président Directeur Général',
      DG: 'Directeur Général',
      SUPER_ADMIN: 'Super Administrateur',
      ADMIN_SYSTEM: 'Admin Système',
      CHEF_COMMERCIAL: 'Chef Commercial',
      COMMERCIAL: 'Commercial',
      SUPERVISEUR: 'Superviseur',
      COMPTABLE: 'Comptable',
    };
    return map[profil] || profil;
  };

  const visibleExtras = extraActions.filter((a) => !a.hidden);

  return (
    <>
      <div className="relative" ref={ref}>
        {/* Avatar */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="
            flex items-center gap-2 px-2 py-1.5 rounded-xl
            bg-white/5 hover:bg-white/10
            border border-white/10
            transition group
          "
          title="Mon compte"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center border border-amber-400 shadow-lg shadow-amber-500/20">
            <span className="text-sm font-bold text-amber-400">
              {getInitials(userName)}
            </span>
          </div>

          <ChevronDown
            size={14}
            className={`text-blue-300 group-hover:text-white transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Menu déroulant */}
        {open && (
          <div
            className="
              absolute right-0 top-full mt-2
              w-72 bg-white rounded-2xl shadow-2xl
              border border-gray-200 overflow-hidden
              z-[100]
              flex flex-col
            "
            style={{
              // ✅ Limiter la hauteur totale pour laisser de la marge
              maxHeight: 'calc(100vh - 100px)',
            }}
          >
            {/* En-tête FIXE (ne scroll pas) */}
            <div className="bg-gradient-to-br from-blue-800 to-blue-700 p-4 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/30 flex items-center justify-center border-2 border-amber-400 flex-shrink-0">
                  <span className="text-lg font-bold text-amber-400">
                    {getInitials(userName)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate text-white">
                    {userName}
                  </p>
                  <p className="text-xs text-blue-200 truncate">
                    {userEmail}
                  </p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 bg-white/20 rounded-full font-semibold uppercase tracking-wider text-white">
                    {getProfilLabel(userProfil)}
                  </span>
                </div>
              </div>
            </div>

            {/* Corps DÉFILABLE */}
            <div
              className="
                p-2
                overflow-y-auto
                flex-1
                profile-dropdown-scroll
              "
              style={{
                // ✅ Scroll fluide iOS
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Onglets supplémentaires */}
              {visibleExtras.length > 0 && (
                <>
                  {visibleExtras.map((action) => (
                    <MenuItem
                      key={action.id}
                      icon={action.icon}
                      label={action.label}
                      badge={action.badge}
                      onClick={() => {
                        setOpen(false);
                        action.onClick();
                      }}
                    />
                  ))}

                  <hr className="my-2 border-gray-200" />
                </>
              )}

              {/* Menu user */}
              <MenuItem
                icon={<User size={16} />}
                label="Mon profil"
                onClick={() => {
                  setOpen(false);
                  setShowProfile(true);
                  onProfileClick?.();
                }}
              />
              <MenuItem
                icon={<Lock size={16} />}
                label="Changer le mot de passe"
                onClick={() => {
                  setOpen(false);
                  setShowPassword(true);
                  onChangePasswordClick?.();
                }}
              />
              <MenuItem
                icon={<Settings size={16} />}
                label="Paramètres"
                onClick={() => {
                  setOpen(false);
                  setInfoModal({
                    title: 'Paramètres',
                    message:
                      "Les paramètres avancés ne sont pas encore disponibles dans cette version. Ils arrivent très bientôt !",
                  });
                  onSettingsClick?.();
                }}
              />
              <MenuItem
                icon={<BarChart3 size={16} />}
                label="Statistiques"
                onClick={() => {
                  setOpen(false);
                  setShowStats(true);
                }}
              />
              <MenuItem
                icon={<HelpCircle size={16} />}
                label="Aide & Support"
                onClick={() => {
                  setOpen(false);
                  setInfoModal({
                    title: 'Aide & Support',
                    message:
                      "Le centre d'aide est en cours de préparation. Contactez votre administrateur pour toute assistance.",
                  });
                  onHelpClick?.();
                }}
              />

              <hr className="my-2 border-gray-200" />

              <MenuItem
                icon={<LogOut size={16} />}
                label="Se déconnecter"
                danger
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
      <ChangePasswordModal
        isOpen={showPassword}
        onClose={() => setShowPassword(false)}
        userEmail={userEmail}
      />
      <StatsModal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
      />
      <InfoModal
        isOpen={!!infoModal}
        onClose={() => setInfoModal(null)}
        title={infoModal?.title || ''}
        message={infoModal?.message || ''}
      />
    </>
  );
}

// ============================================
// MENU ITEM
// ============================================

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-xl
        transition text-sm
        ${
          danger
            ? 'hover:bg-red-50 text-red-600 hover:text-red-700 font-bold'
            : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900'
        }
      `}
    >
      <span className={danger ? '' : 'text-gray-400'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}