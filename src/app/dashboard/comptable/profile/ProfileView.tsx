'use client';

// src/app/dashboard/commercial/components/profile/ProfileView.tsximport {
  User, Mail, Phone, MapPin, Briefcase, Building2,
  Calendar, ShieldCheck, UserCircle2,
} from 'lucide-react';
import type { UserProfile } from './ProfileModal';

export function ProfileView({ user }: { user: UserProfile }) {
  const initiales = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* En-tête avatar */}
      <div className="flex items-center gap-4 pb-5 border-b border-gray-200">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center border-4 border-amber-400 shadow-lg">
          <span className="text-2xl font-bold text-amber-400">{initiales}</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {user.prenom} {user.nom}
          </h3>
          <p className="text-sm text-gray-500">{user.fonction}</p>
          <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
            user.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {user.actif ? '● Actif' : '● Inactif'}
          </span>
        </div>
      </div>

      {/* Grille infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoRow icon={<UserCircle2 size={16} />} label="Nom" value={user.nom} />
        <InfoRow icon={<UserCircle2 size={16} />} label="Prénom" value={user.prenom} />
        <InfoRow icon={<User size={16} />} label="Sexe" value={user.sexe} />
        <InfoRow icon={<Mail size={16} />} label="Email" value={user.email} />
        <InfoRow icon={<Phone size={16} />} label="Téléphone" value={user.telephone} />
        <InfoRow icon={<MapPin size={16} />} label="Adresse" value={user.adresse} />
        <InfoRow icon={<MapPin size={16} />} label="Code postal" value={user.code_postal} />
        <InfoRow icon={<Building2 size={16} />} label="Département" value={user.departement} />
        <InfoRow icon={<Briefcase size={16} />} label="Fonction" value={user.fonction} />
        <InfoRow
          icon={<Calendar size={16} />}
          label="Dernière connexion"
          value={user.derniere_connexion
            ? new Date(user.derniere_connexion).toLocaleString('fr-FR')
            : '—'}
        />
        <InfoRow
          icon={<ShieldCheck size={16} />}
          label="Compte créé le"
          value={new Date(user.created_at).toLocaleDateString('fr-FR')}
        />
      </div>
    </div>
  );
}

function InfoRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
      <div className="text-blue-600 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-gray-900 font-medium truncate">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}