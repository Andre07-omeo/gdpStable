'use client';

// src/app/dashboard/admin/components/profile/ProfileView.tsx
import {
  User, Mail, Shield, Calendar, Edit, Phone,
  MapPin, Building2, Briefcase, Users, Hash,
  MapPinned, Globe, Activity, Crown, Server,
} from 'lucide-react';

interface ProfileViewProps {
  profile: any;
  onEdit: () => void;
}

// ============================================
// ✅ Badge de rôle coloré selon le profil
// ============================================
function RoleBadge({ code, libelle }: { code?: string; libelle?: string }) {
  const codeUpper = (code || '').toUpperCase();
  const label = libelle || code || 'Utilisateur';

  const styles: Record<string, { bg: string; text: string; icon: any }> = {
    SUPER_ADMIN: { bg: 'bg-red-100', text: 'text-red-700', icon: Crown },
    ADMIN_SYSTEM: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', icon: Server },
    ADMIN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Shield },
    SUPERVISEUR: { bg: 'bg-violet-100', text: 'text-violet-700', icon: Users },
    COMMERCIAL: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Briefcase },
  };

  const style = styles[codeUpper] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: Shield };
  const Icon = style.icon;

  return (
    <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ============================================
// ✅ Formatage des valeurs
// ============================================
function formatDate(value: any, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value);
}

// ============================================
// COMPOSANT
// ============================================
export function ProfileView({ profile, onEdit }: ProfileViewProps) {
  if (!profile) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        Aucune information disponible
      </div>
    );
  }

  // ✅ Nom complet
  const displayName = [profile.prenom, profile.nom].filter(Boolean).join(' ') || 'Utilisateur';
  const initial = displayName.charAt(0).toUpperCase();

  // ✅ Sections du profil (adaptées à ton schéma)
  const sections = [
    {
      title: 'Identité',
      fields: [
        { label: 'Nom', value: formatValue(profile.nom), icon: User },
        { label: 'Prénom', value: formatValue(profile.prenom), icon: User },
        { label: 'Sexe', value: formatValue(profile.sexe), icon: User },
        { label: 'Email', value: formatValue(profile.email), icon: Mail },
        { label: 'Téléphone', value: formatValue(profile.telephone), icon: Phone },
      ].filter((f) => f.value !== '—'),
    },
    {
      title: 'Poste & fonction',
      fields: [
        { label: 'Fonction', value: formatValue(profile.fonction), icon: Briefcase },
        { label: 'Département', value: formatValue(profile.departement), icon: Building2 },
        { label: 'Zone de travail', value: formatValue(profile.zone_travail), icon: MapPinned },
        { label: 'Niveau de zone', value: formatValue(profile.zone_niveau), icon: Activity },
      ].filter((f) => f.value !== '—'),
    },
    {
      title: 'Localisation',
      fields: [
        {
          label: 'Adresse',
          value: formatValue(profile.adresse),
          icon: MapPin,
        },
        {
          label: 'Code postal',
          value: formatValue(profile.code_postal),
          icon: Hash,
        },
        {
          label: 'Ville',
          value:
            profile.ville?.nom ||
            profile.ville_nom ||
            formatValue(profile.ville),
          icon: MapPin,
        },
        {
          label: 'Commune',
          value: profile.commune?.nom || formatValue(profile.commune),
          icon: MapPin,
        },
        {
          label: 'Province',
          value: profile.province?.nom || formatValue(profile.province),
          icon: Globe,
        },
      ].filter((f) => f.value && f.value !== '—'),
    },
    {
      title: 'Hiérarchie',
      fields: [
        {
          label: 'Manager',
          value: profile.manager
            ? `${profile.manager.prenom || ''} ${profile.manager.nom || ''}`.trim()
            : '—',
          icon: Users,
        },
      ].filter((f) => f.value !== '—'),
    },
    {
      title: 'Compte',
      fields: [
        { label: 'Statut', value: profile.actif ? 'Actif' : 'Inactif', icon: Activity },
        { label: 'Créé le', value: formatDate(profile.created_at), icon: Calendar },
        { label: 'Dernière connexion', value: formatDate(profile.derniere_connexion, true), icon: Calendar },
      ].filter((f) => f.value !== '—'),
    },
  ].filter((s) => s.fields.length > 0);

  return (
    <div className="space-y-4">
      {/* ============ AVATAR + NOM ============ */}
      <div className="flex flex-col items-center pb-4 border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-blue-50">
          {initial}
        </div>
        <h3 className="mt-3 text-lg font-bold text-gray-800 text-center">
          {displayName}
        </h3>
        <p className="text-sm text-gray-500">{profile.email || ''}</p>
        <RoleBadge code={profile.profil?.code} libelle={profile.profil?.libelle} />
      </div>

      {/* ============ SECTIONS ============ */}
      {sections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold px-1">
            {section.title}
          </p>
          <div className="space-y-1.5">
            {section.fields.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                      {f.label}
                    </p>
                    <p className="text-sm text-gray-800 font-medium break-words">
                      {f.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ============ BOUTON MODIFIER ============ */}
      <button
        onClick={onEdit}
        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/30 active:scale-[0.98]"
      >
        <Edit className="w-4 h-4" />
        Modifier mes informations
      </button>
    </div>
  );
}