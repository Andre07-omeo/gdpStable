'use client';

// src/app/dashboard/admin/components/ProfileDropdown.tsx
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown, User, KeyRound, Settings, HelpCircle,
  LogOut, Shield, Crown, Mail, BadgeCheck, ShieldCheck,
  ExternalLink,
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
function getRoleConfig(profil: string) {
  switch (profil) {
    case 'SUPER_ADMIN':
      return {
        label: 'SUPER ADMIN',
        gradient: 'from-red-500 via-rose-500 to-red-600',
        bg: 'bg-red-500/15',
        text: 'text-red-300',
        border: 'border-red-500/30',
        glow: 'shadow-red-500/40',
        icon: <Crown size={11} />,
      };
    case 'ADMIN_SYSTEM':
      return {
        label: 'ADMIN SYSTÈME',
        gradient: 'from-fuchsia-500 via-purple-500 to-fuchsia-600',
        bg: 'bg-fuchsia-500/15',
        text: 'text-fuchsia-300',
        border: 'border-fuchsia-500/30',
        glow: 'shadow-fuchsia-500/40',
        icon: <Shield size={11} />,
      };
    case 'ADMIN':
      return {
        label: 'ADMINISTRATEUR',
        gradient: 'from-blue-500 via-indigo-500 to-blue-600',
        bg: 'bg-blue-500/15',
        text: 'text-blue-300',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/40',
        icon: <ShieldCheck size={11} />,
      };
    case 'DG':
      return {
        label: 'DIRECTION GÉNÉRALE',
        gradient: 'from-amber-500 via-yellow-500 to-amber-600',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/40',
        icon: <Crown size={11} />,
      };
    default:
      return {
        label: profil || 'UTILISATEUR',
        gradient: 'from-slate-500 via-slate-600 to-slate-700',
        bg: 'bg-slate-500/15',
        text: 'text-slate-300',
        border: 'border-slate-500/30',
        glow: 'shadow-slate-500/40',
        icon: <BadgeCheck size={11} />,
      };
  }
}

// ============================================
// COMPOSANT PRINCIPAL
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ Fermeture au clic extérieur / Échap
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

  // ✅ Reset scroll à l'ouverture
  useEffect(() => {
    if (isOpen && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [isOpen]);

  // ✅ Initiales
  const initials = useMemo(() => {
    if (!userName) return 'A';
    return userName
      .split(' ')
      .map((n) => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }, [userName]);

  const roleConfig = useMemo(() => getRoleConfig(userProfil), [userProfil]);
  const isSuperAdmin = userProfil === 'SUPER_ADMIN';

  const handleAction = (action?: () => void) => () => {
    setIsOpen(false);
    action?.();
  };

  const visibleExtraActions = extraActions.filter((a) => !a.hidden);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ============================================
          BOUTON AVATAR
          ============================================ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          group relative flex items-center gap-2 pl-1 pr-2.5 py-1
          rounded-full
          bg-white/5 hover:bg-white/10
          border border-white/10 hover:border-white/25
          transition-all duration-300
          active:scale-95
          hover:shadow-lg hover:shadow-white/5
        "
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="relative">
          {isSuperAdmin && (
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 opacity-60 blur-sm group-hover:opacity-100 transition-opacity duration-300" />
          )}
          <div className={`
            relative w-8 h-8 rounded-full
            bg-gradient-to-br ${isSuperAdmin ? 'from-amber-400 via-orange-500 to-red-500' : 'from-blue-500 via-indigo-500 to-purple-600'}
            flex items-center justify-center
            text-white text-[11px] font-black
            shadow-lg
            ring-2 ring-white/20
          `}>
            {initials}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-blue-900 shadow-lg shadow-emerald-500/50 animate-pulse" />
        </div>

        <div className="hidden lg:block text-left max-w-[130px]">
          <p className="text-xs font-bold text-white truncate leading-tight">
            {userName}
          </p>
          <p className={`text-[9px] ${roleConfig.text} truncate leading-tight font-semibold tracking-wide`}>
            {roleConfig.label}
          </p>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-white/60 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* ============================================
          DROPDOWN PREMIUM — FIXED ANCRÉ HAUT+BAS
          ============================================ */}
      {isOpen && (
        <div
          className="
            fixed right-2 sm:right-4
            top-[70px]
            bottom-3
            w-[calc(100vw-16px)] sm:w-[360px]
            bg-slate-950/95 backdrop-blur-2xl
            border border-white/10
            rounded-2xl
            shadow-2xl shadow-black/60
            overflow-hidden
            flex flex-col
            animate-dropdownIn
          "
          style={{ zIndex: 100 }}
          role="menu"
        >
          {/* ─────────── EN-TÊTE FIXE ─────────── */}
          <div className="relative px-5 pt-5 pb-4 overflow-hidden flex-shrink-0">
            <div className={`absolute inset-0 bg-gradient-to-br ${roleConfig.gradient} opacity-10`} />
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-white/5 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="relative flex-shrink-0">
                {isSuperAdmin && (
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 opacity-70 blur" />
                )}
                <div className={`
                  relative w-14 h-14 rounded-2xl
                  bg-gradient-to-br ${isSuperAdmin ? 'from-amber-400 via-orange-500 to-red-500' : 'from-blue-500 via-indigo-500 to-purple-600'}
                  flex items-center justify-center
                  text-white text-lg font-black
                  shadow-xl
                  ring-2 ring-white/20
                `}>
                  {initials}
                </div>
                {isSuperAdmin && (
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-slate-950">
                    <Crown className="w-3.5 h-3.5 text-blue-950" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-white truncate leading-tight">
                  {userName || 'Administrateur'}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Mail size={11} className="text-white/40 flex-shrink-0" />
                  <p className="text-[11px] text-white/60 truncate">
                    {userEmail || 'admin@gdp.com'}
                  </p>
                </div>

                <div className={`
                  inline-flex items-center gap-1.5 mt-2 
                  px-2.5 py-1 rounded-full 
                  ${roleConfig.bg} ${roleConfig.border} ${roleConfig.text}
                  border backdrop-blur-sm
                  text-[10px] font-black tracking-wider uppercase
                  shadow-lg ${roleConfig.glow}
                `}>
                  {roleConfig.icon}
                  <span>{roleConfig.label}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent flex-shrink-0" />

          {/* ─────────── ZONE SCROLLABLE UNIQUE ─────────── */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain dropdown-scroll"
            style={{
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* ---- Modules ---- */}
            {visibleExtraActions.length > 0 && (
              <div className="py-2">
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-black px-5 py-1.5">
                  Modules
                </p>
                {visibleExtraActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={handleAction(action.onClick)}
                    className="
                      group w-full flex items-center gap-3 px-5 py-2.5
                      text-white/80 hover:text-white 
                      hover:bg-gradient-to-r hover:from-white/5 hover:to-transparent
                      text-[13px] font-medium
                      transition-all duration-200
                      relative
                    "
                    role="menuitem"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-blue-400 rounded-r transition-all duration-300 group-hover:h-full" />
                    <span className="flex-shrink-0 text-white/50 group-hover:text-blue-400 transition-colors duration-200">
                      {action.icon}
                    </span>
                    <span className="flex-1 text-left truncate">{action.label}</span>
                    {action.badge !== undefined && action.badge > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-gradient-to-br from-red-500 to-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30">
                        {action.badge > 99 ? '99+' : action.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* ---- Mon compte ---- */}
            <div className="py-2">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-black px-5 py-1.5">
                Mon compte
              </p>

              {onProfileClick && (
                <MenuItem
                  icon={<User size={15} />}
                  label="Mon profil"
                  description="Voir mes informations"
                  onClick={handleAction(onProfileClick)}
                  color="blue"
                />
              )}

              {onChangePasswordClick && (
                <MenuItem
                  icon={<KeyRound size={15} />}
                  label="Changer le mot de passe"
                  description="Sécurité du compte"
                  onClick={handleAction(onChangePasswordClick)}
                  color="amber"
                />
              )}

              {onSettingsClick && (
                <MenuItem
                  icon={<Settings size={15} />}
                  label="Paramètres"
                  description="Préférences personnelles"
                  onClick={handleAction(onSettingsClick)}
                  color="violet"
                />
              )}

              <MenuItem
                icon={<HelpCircle size={15} />}
                label="Aide & Support"
                description="Documentation, contact"
                onClick={handleAction(onHelpClick)}
                color="cyan"
                external
              />
            </div>
          </div>

          {/* ─────────── FOOTER FIXE — DÉCONNEXION ─────────── */}
          <div className="flex-shrink-0 border-t border-white/10 bg-black/30">
            <div className="p-2">
              <button
                onClick={handleAction(onLogout)}
                className="
                  w-full flex items-center gap-3 px-4 py-3
                  rounded-xl
                  text-red-400 hover:text-white
                  bg-red-500/5 hover:bg-gradient-to-r hover:from-red-500 hover:to-rose-600
                  text-[13px] font-bold
                  transition-all duration-300
                  group
                  shadow-lg shadow-transparent hover:shadow-red-500/30
                "
                role="menuitem"
              >
                <LogOut size={16} className="flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5" />
                <span>Se déconnecter</span>
              </button>
            </div>

            {/* Footer discret */}
            <div className="px-5 py-2.5 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest">
                  GDP • v1.0
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] text-emerald-400/80 font-bold">EN LIGNE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Animations + scrollbar */}
      <style jsx global>{`
        @keyframes dropdownIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-dropdownIn {
          animation: dropdownIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
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

// ============================================
// MENU ITEM réutilisable
// ============================================
function MenuItem({
  icon,
  label,
  description,
  onClick,
  color = 'blue',
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  color?: 'blue' | 'amber' | 'violet' | 'cyan' | 'emerald';
  external?: boolean;
}) {
  const colorMap = {
    blue: 'group-hover:text-blue-400 group-hover:bg-blue-500/10',
    amber: 'group-hover:text-amber-400 group-hover:bg-amber-500/10',
    violet: 'group-hover:text-violet-400 group-hover:bg-violet-500/10',
    cyan: 'group-hover:text-cyan-400 group-hover:bg-cyan-500/10',
    emerald: 'group-hover:text-emerald-400 group-hover:bg-emerald-500/10',
  };

  return (
    <button
      onClick={onClick}
      className="
        group w-full flex items-center gap-3 px-5 py-2.5
        text-white/80 hover:text-white 
        transition-all duration-200
        relative
      "
      role="menuitem"
    >
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-r transition-all duration-300 group-hover:h-8 ${colorMap[color].split(' ')[1]}`} />

      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 bg-white/5 ${colorMap[color]}`}>
        {icon}
      </span>

      <div className="flex-1 text-left min-w-0">
        <p className="text-[13px] font-semibold truncate">{label}</p>
        {description && (
          <p className="text-[10px] text-white/40 truncate">{description}</p>
        )}
      </div>

      {external && (
        <ExternalLink size={12} className="text-white/30 group-hover:text-white/60 flex-shrink-0 transition-colors" />
      )}
    </button>
  );
}