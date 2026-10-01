'use client';

// src/app/dashboard/admin/components/ProfileDropdown.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown, User, KeyRound, Settings, HelpCircle,
  LogOut, Shield, Crown, Mail, BadgeCheck,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
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

// ============================================
// BADGE DE RÔLE
// ============================================
function getRoleBadge(profil: string) {
  switch (profil) {
    case 'SUPER_ADMIN':
      return {
        label: 'SUPER ADMIN',
        color: 'bg-red-500/20 text-red-300 border-red-500/30',
        icon: <Crown size={10} className="text-red-300" />,
      };
    case 'ADMIN_SYSTEM':
      return {
        label: 'ADMIN SYSTÈME',
        color: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
        icon: <Shield size={10} className="text-fuchsia-300" />,
      };
    case 'DG':
      return {
        label: 'DIRECTION',
        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        icon: <Crown size={10} className="text-amber-300" />,
      };
    default:
      return {
        label: profil || 'ADMIN',
        color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: <BadgeCheck size={10} className="text-blue-300" />,
      };
  }
}

// ============================================
// COMPOSANT
// ============================================
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Fermer au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const initials = useMemo(() => {
    if (!userName) return 'A';
    return userName
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }, [userName]);

  const roleBadge = useMemo(() => getRoleBadge(userProfil), [userProfil]);

  const handleAction = (action?: () => void) => {
    return () => {
      setIsOpen(false);
      action?.();
    };
  };

  // Filtrer les extraActions visibles
  const visibleExtraActions = extraActions.filter((a) => !a.hidden);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ============================================
          BOUTON AVATAR
          ============================================ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          group flex items-center gap-2 pl-1 pr-2 py-1
          rounded-full
          bg-white/5 hover:bg-white/10
          border border-white/10 hover:border-white/20
          transition-all duration-300
          active:scale-95
        "
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="relative">
          <div className="
            w-8 h-8 rounded-full
            bg-gradient-to-br from-blue-500 to-indigo-600
            flex items-center justify-center
            text-white text-xs font-bold
            shadow-lg
            ring-2 ring-white/20
          ">
            {initials}
          </div>
          {/* Point "online" */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-900" />
        </div>

        {/* Nom (caché sur petit écran) */}
        <div className="hidden lg:block text-left max-w-[120px]">
          <p className="text-xs font-semibold text-white truncate leading-tight">
            {userName}
          </p>
          <p className="text-[9px] text-white/50 truncate leading-tight">
            {roleBadge.label}
          </p>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ============================================
          DROPDOWN MENU
          ============================================ */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 w-72 sm:w-80
            bg-slate-900/98 backdrop-blur-xl
            border border-white/10
            rounded-2xl
            shadow-2xl shadow-black/50
            overflow-hidden
            z-[100]
            animate-dropdownIn
          "
          role="menu"
        >
          {/* ---- En-tête profil ---- */}
          <div className="px-4 py-4 bg-gradient-to-br from-blue-900/50 to-indigo-900/30 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="
                w-12 h-12 rounded-full
                bg-gradient-to-br from-blue-500 to-indigo-600
                flex items-center justify-center
                text-white text-base font-bold
                shadow-lg
                ring-2 ring-white/20
                flex-shrink-0
              ">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {userName || 'Administrateur'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Mail size={10} className="text-white/40 flex-shrink-0" />
                  <p className="text-[10px] text-white/60 truncate italic">
                    {userEmail || 'admin@gdp.com'}
                  </p>
                </div>
                {/* Badge rôle */}
                <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold tracking-wider ${roleBadge.color}`}>
                  {roleBadge.icon}
                  <span>{roleBadge.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Extra actions (modules admin) ---- */}
          {visibleExtraActions.length > 0 && (
            <div className="py-1.5 border-b border-white/10 max-h-64 overflow-y-auto dropdown-scroll">
              {visibleExtraActions.map((action) => (
                <button
                  key={action.id}
                  onClick={handleAction(action.onClick)}
                  className="
                    w-full flex items-center gap-3 px-4 py-2
                    text-white/85 hover:text-white hover:bg-white/5
                    text-xs font-medium
                    transition-colors duration-150
                    active:bg-white/10
                  "
                  role="menuitem"
                >
                  <span className="flex-shrink-0 text-white/50">
                    {action.icon}
                  </span>
                  <span className="flex-1 text-left truncate">{action.label}</span>
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="min-w-[18px] h-4 px-1 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* ---- Actions compte ---- */}
          <div className="py-1.5">
            {onProfileClick && (
              <button
                onClick={handleAction(onProfileClick)}
                className="
                  w-full flex items-center gap-3 px-4 py-2
                  text-white/85 hover:text-white hover:bg-white/5
                  text-xs font-medium
                  transition-colors duration-150
                  active:bg-white/10
                "
                role="menuitem"
              >
                <User size={14} className="flex-shrink-0 text-white/50" />
                <span>Mon profil</span>
              </button>
            )}

            {onChangePasswordClick && (
              <button
                onClick={handleAction(onChangePasswordClick)}
                className="
                  w-full flex items-center gap-3 px-4 py-2
                  text-white/85 hover:text-white hover:bg-white/5
                  text-xs font-medium
                  transition-colors duration-150
                  active:bg-white/10
                "
                role="menuitem"
              >
                <KeyRound size={14} className="flex-shrink-0 text-white/50" />
                <span>Changer le mot de passe</span>
              </button>
            )}

            {onSettingsClick && (
              <button
                onClick={handleAction(onSettingsClick)}
                className="
                  w-full flex items-center gap-3 px-4 py-2
                  text-white/85 hover:text-white hover:bg-white/5
                  text-xs font-medium
                  transition-colors duration-150
                  active:bg-white/10
                "
                role="menuitem"
              >
                <Settings size={14} className="flex-shrink-0 text-white/50" />
                <span>Paramètres</span>
              </button>
            )}

            <button
              onClick={handleAction(onHelpClick)}
              className="
                w-full flex items-center gap-3 px-4 py-2
                text-white/85 hover:text-white hover:bg-white/5
                text-xs font-medium
                transition-colors duration-150
                active:bg-white/10
              "
              role="menuitem"
            >
              <HelpCircle size={14} className="flex-shrink-0 text-white/50" />
              <span>Aide & Support</span>
            </button>
          </div>

          {/* ---- Déconnexion ---- */}
          <div className="border-t border-white/10 py-1.5">
            <button
              onClick={handleAction(onLogout)}
              className="
                w-full flex items-center gap-3 px-4 py-2
                text-red-400 hover:text-red-300 hover:bg-red-500/10
                text-xs font-semibold
                transition-colors duration-150
                active:bg-red-500/20
              "
              role="menuitem"
            >
              <LogOut size={14} className="flex-shrink-0" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}

      {/* ✅ Animations + scrollbar */}
      <style jsx global>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-dropdownIn {
          animation: dropdownIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dropdown-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
        }
        .dropdown-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .dropdown-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
        .dropdown-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}