// src/app/dashboard/commercial/components/TeamManagementModal.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Crown,
  Briefcase,
  Save,
  AlertCircle,
  Key,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

// ============================================
// TYPES
// ============================================
interface TeamMember {
  id_user: number;
  id_profil: number;
  id_manager?: number | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sexe: string;
  fonction: string;
  departement: string;
  actif: number;
  derniere_connexion: string | null;
  zone_travail: string | null;
  zone_niveau: string;
  created_at: string;
  profil_code: string;
  profil_libelle: string;
  niveauHierarchique: number;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// ✅ CONFIGURATION
// ============================================
const DEFAULT_PASSWORD = '1234567890';
const EMAIL_DOMAIN = 'dispro.cd';

// ============================================
// ✅ HELPER : GÉNÉRER L'EMAIL DEPUIS LE PRÉNOM
// ============================================
function generateEmailFromPrenom(prenom: string): string {
  if (!prenom || prenom.trim() === '') return '';
  const normalized = prenom
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9]/g, ''); // Garder uniquement lettres et chiffres
  return `${normalized}@${EMAIL_DOMAIN}`;
}

// ============================================
// MODAL PRINCIPAL
// ============================================
export function TeamManagementModal({
  isOpen,
  onClose,
}: TeamManagementModalProps) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<
    'TOUS' | 'COMMERCIAL' | 'CHEF_COMMERCIAL'
  >('TOUS');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const canManageTeam =
    user?.profil === 'COMMERCIAL' ||
    user?.profil === 'CHEF_COMMERCIAL' ||
    user?.profil === 'SUPER_ADMIN' ||
    user?.profil === 'ADMIN_SYSTEM' ||
    user?.profil === 'DG' ||
    user?.profil === 'PDG';

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/commercials/team', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setMembers(data.data || []);
      } else {
        console.error('Erreur:', data.error);
      }
    } catch (error) {
      console.error('Erreur chargement équipe:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen]);

  const filteredMembers = members.filter((m) => {
    if (filterRole !== 'TOUS' && m.profil_code !== filterRole) return false;

    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      return (
        m.nom.toLowerCase().includes(search) ||
        m.prenom.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        (m.telephone || '').includes(search)
      );
    }

    return true;
  });

  const stats = {
    total: members.length,
    commerciaux: members.filter((m) => m.profil_code === 'COMMERCIAL').length,
    chefs: members.filter((m) => m.profil_code === 'CHEF_COMMERCIAL').length,
    actifs: members.filter((m) => m.actif === 1).length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* HEADER BLEU */}
        <div className="bg-gradient-to-r from-[#00539B] to-[#0077cc] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">
                Gestion d'équipe
              </p>
              <h2 className="text-lg font-bold text-white">
                Mon équipe commerciale
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition"
            title="Fermer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* STATS COMPACTES */}
        <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          {[
            {
              icon: Users,
              value: stats.total,
              label: 'Total',
              color: 'text-gray-700',
              bg: 'bg-gray-100',
            },
            {
              icon: Briefcase,
              value: stats.commerciaux,
              label: 'Commerciaux',
              color: 'text-blue-700',
              bg: 'bg-blue-100',
            },
            {
              icon: Crown,
              value: stats.chefs,
              label: 'Chefs',
              color: 'text-purple-700',
              bg: 'bg-purple-100',
            },
            {
              icon: CheckCircle,
              value: stats.actifs,
              label: 'Actifs',
              color: 'text-emerald-700',
              bg: 'bg-emerald-100',
            },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200"
              >
                <div
                  className={`w-7 h-7 rounded-md ${s.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-base font-bold ${s.color} leading-none`}>
                    {s.value}
                  </p>
                  <p className="text-[9px] text-gray-500 truncate">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* FILTRES */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-1">
              {[
                { value: 'TOUS', label: 'Tous', color: 'blue' },
                { value: 'COMMERCIAL', label: 'Commerciaux', color: 'blue' },
                {
                  value: 'CHEF_COMMERCIAL',
                  label: 'Chefs',
                  color: 'purple',
                },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterRole(f.value as any)}
                  className={`
                    px-2.5 py-1.5 rounded-lg text-xs font-bold transition
                    ${
                      filterRole === f.value
                        ? f.color === 'purple'
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMembers}
              disabled={loading}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              title="Actualiser"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>

            {canManageTeam && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            )}
          </div>
        </div>

        {/* LISTE DES MEMBRES */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-2">
                Chargement de l'équipe...
              </p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-14 h-14 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-bold text-sm">
                Aucun membre trouvé
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm || filterRole !== 'TOUS'
                  ? 'Essayez de modifier vos filtres'
                  : "Ajoutez votre premier membre à l'équipe"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMembers.map((member) => {
                const isChef = member.profil_code === 'CHEF_COMMERCIAL';
                const isActive = member.actif === 1;

                return (
                  <div
                    key={member.id_user}
                    className={`
                      border-2 rounded-xl p-3 transition hover:shadow-md
                      ${isChef ? 'border-purple-200 bg-purple-50/30' : 'border-blue-200 bg-blue-50/30'}
                    `}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className={`
                          w-9 h-9 rounded-full flex items-center justify-center
                          font-bold text-white text-xs flex-shrink-0
                          ${
                            isChef
                              ? 'bg-gradient-to-br from-purple-500 to-purple-700'
                              : 'bg-gradient-to-br from-blue-500 to-blue-700'
                          }
                        `}
                      >
                        {`${member.prenom?.[0] || ''}${member.nom?.[0] || ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">
                          {member.prenom} {member.nom}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`
                              text-[9px] px-1.5 py-0.5 rounded-full font-bold
                              ${
                                isChef
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-blue-100 text-blue-700'
                              }
                            `}
                          >
                            {isChef ? '👑' : '💼'} {member.profil_libelle}
                          </span>
                          <span
                            className={`
                              w-2 h-2 rounded-full
                              ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}
                            `}
                            title={isActive ? 'Actif' : 'Inactif'}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.telephone && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{member.telephone}</span>
                        </div>
                      )}
                      {member.fonction && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Briefcase className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{member.fonction}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        {member.zone_niveau || 'National'}
                      </span>
                      {isActive ? (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold">
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-bold">
                          <XCircle className="w-3 h-3" />
                          Inactif
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-500">
            {filteredMembers.length} / {members.length} membre(s)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-sm transition"
          >
            Fermer
          </button>
        </div>
      </motion.div>

      {/* MODAL D'AJOUT */}
      <TeamMemberForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          setIsFormOpen(false);
          fetchMembers();
        }}
        canManageTeam={canManageTeam}
      />
    </div>
  );
}

// ============================================
// ✅ SOUS-COMPOSANT : FORMULAIRE D'AJOUT
// ============================================
function TeamMemberForm({
  isOpen,
  onClose,
  onSuccess,
  canManageTeam,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canManageTeam: boolean;
}) {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    sexe: 'Non spécifié',
    fonction: 'Agent commercial',
    departement: 'Commercial',
    adresse: '',
    id_profil: 3,
    zone_niveau: 'National',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);

  // ✅ AUTO-GÉNÉRATION DE L'EMAIL quand le prénom change
  useEffect(() => {
    if (!emailManuallyEdited && formData.prenom.trim() !== '') {
      const generatedEmail = generateEmailFromPrenom(formData.prenom);
      setFormData((prev) => ({ ...prev, email: generatedEmail }));
    }
  }, [formData.prenom, emailManuallyEdited]);

  // ✅ Reset du formulaire quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        sexe: 'Non spécifié',
        fonction: 'Agent commercial',
        departement: 'Commercial',
        adresse: '',
        id_profil: 3,
        zone_niveau: 'National',
      });
      setEmailManuallyEdited(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/commercials/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          password: DEFAULT_PASSWORD, // ✅ Mot de passe par défaut
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          `${data.message || 'Membre créé avec succès'}\n\nEmail: ${formData.email}\nMot de passe: ${DEFAULT_PASSWORD}`
        );
        setTimeout(() => {
          onSuccess();
        }, 2500);
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Prévisualisation de l'email généré
  const previewEmail = generateEmailFromPrenom(formData.prenom);

  if (!isOpen || !canManageTeam) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">
                Ajouter un membre
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-white/20 hover:bg-red-500 rounded-lg transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Corps */}
          <form
            onSubmit={handleSubmit}
            className="p-5 space-y-3 overflow-y-auto flex-1"
          >
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 whitespace-pre-line">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Nom + Prénom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) =>
                    setFormData({ ...formData, nom: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Dupont"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => {
                    setFormData({ ...formData, prenom: e.target.value });
                    setEmailManuallyEdited(false); // Reset si prénom change
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jean"
                />
                {/* ✅ Prévisualisation de l'email */}
                {formData.prenom && (
                  <p className="text-[10px] text-blue-500 mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Email auto: {previewEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Email (auto-généré, modifiable) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
                <span className="ml-2 text-[10px] font-normal text-blue-500">
                  (généré automatiquement)
                </span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailManuallyEdited(true);
                }}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30"
                placeholder="prenom@dispro.cd"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Format : <code className="text-blue-600">prenom@dispro.cd</code>
              </p>
            </div>

            {/* Mot de passe par défaut (info) */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
              <Key className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-bold">Mot de passe par défaut</p>
                <p className="font-mono bg-amber-100 px-1.5 py-0.5 rounded inline-block mt-1">
                  {DEFAULT_PASSWORD}
                </p>
                <p className="text-[10px] text-amber-600 mt-1">
                  L'utilisateur devra le changer à la première connexion.
                </p>
              </div>
            </div>

            {/* Téléphone + Sexe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) =>
                    setFormData({ ...formData, telephone: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+243..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Sexe
                </label>
                <select
                  value={formData.sexe}
                  onChange={(e) =>
                    setFormData({ ...formData, sexe: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Masculin">Masculin</option>
                  <option value="Féminin">Féminin</option>
                  <option value="Non spécifié">Non spécifié</option>
                </select>
              </div>
            </div>

            {/* Fonction + Département */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Fonction
                </label>
                <input
                  type="text"
                  value={formData.fonction}
                  onChange={(e) =>
                    setFormData({ ...formData, fonction: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Département
                </label>
                <input
                  type="text"
                  value={formData.departement}
                  onChange={(e) =>
                    setFormData({ ...formData, departement: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Rôle <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.id_profil}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    id_profil: parseInt(e.target.value),
                  })
                }
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={3}>💼 Commercial</option>
                <option value={10}>👑 Chef Commercial</option>
              </select>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Adresse
              </label>
              <input
                type="text"
                value={formData.adresse}
                onChange={(e) =>
                  setFormData({ ...formData, adresse: e.target.value })
                }
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Kinshasa, RDC"
              />
            </div>
          </form>

          {/* Boutons */}
          <div className="flex gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.nom || !formData.prenom}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Créer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}