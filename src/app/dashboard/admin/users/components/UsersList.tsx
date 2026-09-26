'use client';

export const dynamic = 'force-dynamic';

// ============================================
// COMPOSANT - LISTE DES UTILISATEURS
// ============================================import { Edit2, Trash2, UserCheck, UserX, Mail, Phone, MapPin, Building2, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import { User } from '../types/user.types';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, actif: boolean) => void;
  loading?: boolean;
}

export function UsersList({ users, onEdit, onDelete, onToggleStatus, loading = false }: UsersListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <div className="text-6xl mb-4">👤</div>
        <h3 className="text-lg font-semibold text-gray-600">Aucun utilisateur</h3>
        <p className="text-sm text-gray-400">Aucun utilisateur ne correspond à vos critères</p>
      </div>
    );
  }

  const getRoleColor = (profil: string) => {
    const colors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-700',
      'ADMIN_SYSTEM': 'bg-blue-100 text-blue-700',
      'DG': 'bg-amber-100 text-amber-700',
      'PDG': 'bg-rose-100 text-rose-700',
      'CHEF_COMMERCIAL': 'bg-orange-100 text-orange-700',
      'COMMERCIAL': 'bg-emerald-100 text-emerald-700',
      'SUPERVISEUR': 'bg-cyan-100 text-cyan-700',
      'CAISSIER': 'bg-indigo-100 text-indigo-700',
      'COMPTABLE': 'bg-pink-100 text-pink-700',
    };
    return colors[profil] || 'bg-gray-100 text-gray-700';
  };

  // ✅ Fonction pour formater le nom complet
  const getFullName = (user: User) => {
    const nom = user.nom || 'Nom non défini';
    const prenom = user.prenom || 'Prénom non défini';
    return `${nom} ${prenom}`.trim();
  };

  // ✅ Fonction pour formater la zone de travail
  const formatZoneTravail = (zone: string | null | undefined) => {
    if (!zone) return 'Non défini';
    
    // Si c'est une zone encodée (format pays:1|provinces:...)
    if (zone.startsWith('pays:')) {
      const parts = zone.split('|');
      const pays = parts.find(p => p.startsWith('pays:'))?.split(':')[1] || '';
      const provinces = parts.find(p => p.startsWith('provinces:'))?.split(':')[1]?.split(',').length || 0;
      const villes = parts.find(p => p.startsWith('villes:'))?.split(':')[1]?.split(',').length || 0;
      
      if (provinces > 0 || villes > 0) {
        let result = `Pays: ${pays}`;
        if (provinces > 0) result += `, ${provinces} provinces`;
        if (villes > 0) result += `, ${villes} villes`;
        return result;
      }
      return `Pays: ${pays}`;
    }
    
    return zone;
  };

  return (
    <div className="space-y-3">
      {users.map((user, index) => (
        <motion.div
          key={user.id_user || user.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition ${!user.actif ? 'bg-gray-50 opacity-75' : ''}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Informations */}
            <div className="flex items-start gap-4 flex-1 min-w-[200px]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {user.prenom?.charAt(0) || '?'}{user.nom?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-bold text-gray-800">
                    {getFullName(user)}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.profil)}`}>
                    {user.profil || 'Visiteur'}
                  </span>
                  {!user.actif && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Inactif
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                  {/* Email */}
                  <span className="flex items-center gap-1">
                    <Mail size={14} />
                    {user.email || 'Email non défini'}
                  </span>
                  
                  {/* Téléphone */}
                  {user.telephone && user.telephone !== '0' && (
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {user.telephone}
                    </span>
                  )}
                  
                  {/* Fonction */}
                  {user.fonction && user.fonction !== 'Agent' && (
                    <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      <Briefcase size={12} />
                      {user.fonction}
                    </span>
                  )}
                  
                  {/* Département */}
                  {user.departement && user.departement !== 'À définir' && (
                    <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      <Building2 size={12} />
                      {user.departement}
                    </span>
                  )}
                </div>
                
                {/* Zone de travail - formatée */}
                {user.zone_travail && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin size={12} />
                    Zone: {formatZoneTravail(user.zone_travail)}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onToggleStatus(user.id_user || user.id, !user.actif)}
                className={`p-2 rounded-lg transition ${
                  user.actif
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
                title={user.actif ? 'Désactiver' : 'Activer'}
              >
                {user.actif ? <UserX size={18} /> : <UserCheck size={18} />}
              </button>
              <button
                onClick={() => onEdit(user)}
                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                title="Modifier"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => onDelete(user.id_user || user.id)}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                title="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}