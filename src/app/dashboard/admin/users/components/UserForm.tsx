'use client';

// src/app/dashboard/admin/users/components/UserForm.tsx
import { useState, useEffect, useMemo } from 'react';
import { X, Save, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { LocationSelector } from '@/components/locations/LocationSelector';
import {
  CreateUserDTO,
  UpdateUserDTO,
  User,
  LocationSelection,
  stringToLocationSelection,
  locationSelectionToString,
  isFounder,
  getAllowedRoles,
  canPerformAction,
} from '../types/user.types';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateUserDTO | UpdateUserDTO) => Promise<void>;
  user?: User | null;
  roles: { id: number; code: string; libelle: string }[];
  loading?: boolean;
  currentUser?: { id_user?: number; id?: number; email?: string; profil?: string } | null;
}

export function UserForm({
  isOpen,
  onClose,
  onSave,
  user,
  roles,
  loading = false,
  currentUser,
}: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserDTO | UpdateUserDTO>({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    departement: '',
    fonction: '',
    id_profil: 0,
    zone_travail: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [locationSelection, setLocationSelection] = useState<LocationSelection>({});
  const [emailError, setEmailError] = useState('');

  const isEditMode = !!user;
  const isPasswordRequired = !isEditMode;

  // 🔒 Permissions
  const editPermission = useMemo(
    () => canPerformAction('edit', currentUser, user || undefined),
    [currentUser, user]
  );

  // 🔒 Filtre les rôles
  const allowedRoles = useMemo(
    () => getAllowedRoles(currentUser, roles),
    [currentUser, roles]
  );

  const targetIsProtected = user ? isFounder(user) : false;

  // Charger les données (édition)
  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        password: '',
        telephone: user.telephone || '',
        adresse: user.adresse || '',
        code_postal: user.code_postal || '',
        ville: user.ville_nom || '',
        departement: user.departement || '',
        fonction: user.fonction || '',
        id_profil: user.id_profil || 0,
        zone_travail: user.zone_travail || '',
      });

      const zoneRaw = user.zone_travail;
      if (zoneRaw && typeof zoneRaw === 'string') {
        try {
          const parsed = stringToLocationSelection(zoneRaw);
          setLocationSelection(parsed);
        } catch {
          setLocationSelection({});
        }
      } else {
        setLocationSelection({});
      }
    } else {
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: '',
        departement: '',
        fonction: '',
        id_profil: 0,
        zone_travail: '',
      });
      setLocationSelection({});
    }
  }, [user]);

  // Auto-génération email
  useEffect(() => {
    if (!user && formData.prenom && formData.prenom.trim() !== '') {
      const prenom = formData.prenom.trim().toLowerCase();
      const normalizedPrenom = prenom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const email = `${normalizedPrenom}@dispro.cd`;
      setFormData((prev) => ({ ...prev, email }));
      setEmailError('');
    }
  }, [formData.prenom, user]);

  if (!isOpen) return null;

  // 🔒 Formulaire bloqué
  if (isEditMode && !editPermission.allowed) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Action non autorisée</h3>
            <p className="text-sm text-gray-600 mb-6">
              {editPermission.reason || 'Vous n\'avez pas les droits pour modifier cet utilisateur.'}
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation email
    if (!formData.email || formData.email.trim() === '') {
      setEmailError('L\'email est requis');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError('Format d\'email invalide');
      return;
    }

    // Validation mot de passe
    if (isPasswordRequired && (!formData.password || formData.password.length < 6)) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Validation rôle
    if (!formData.id_profil || formData.id_profil === 0) {
      alert('Veuillez sélectionner un rôle');
      return;
    }

    // ✅ Construire la zone de travail
    let zoneTravail: string | null = null;
    if (locationSelection.paysId) {
      zoneTravail = locationSelectionToString(locationSelection);
    } else if (formData.zone_travail) {
      zoneTravail = formData.zone_travail;
    }

    // ✅ Payload final
    const dataToSave: any = {
      ...formData,
      zone_travail: zoneTravail,
    };

    // ✅ Mapper ville → ville_nom
    if (formData.ville) {
      dataToSave.ville_nom = formData.ville;
    }

    await onSave(dataToSave);
  };

  const generateEmailFromPrenom = (prenom: string) => {
    if (!prenom || prenom.trim() === '') return '';
    const normalized = prenom.trim().toLowerCase();
    return normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[201] bg-white rounded-2xl shadow-2xl flex flex-col max-w-2xl mx-auto border border-white/20"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                {isEditMode ? 'Modification' : 'Nouvel utilisateur'}
              </p>
              <h2 className="text-xl font-bold text-white">
                {isEditMode
                  ? `Modifier ${user?.nom || ''} ${user?.prenom || ''}`
                  : 'Créer un compte'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition text-white"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bandeau compte protégé */}
        {targetIsProtected && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Compte fondateur protégé.</strong> Certaines actions sont restreintes.
            </p>
          </div>
        )}

        {/* Formulaire */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.nom || ''}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.prenom || ''}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.email || ''}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailError('');
                }}
                placeholder="prenom@dispro.cd"
              />
              {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe{' '}
                {isPasswordRequired ? <span className="text-red-500">*</span> : '(laisser vide pour conserver)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={isPasswordRequired}
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEditMode ? 'Nouveau mot de passe...' : 'Mot de passe'}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.telephone || ''}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.id_profil || 0}
                // ✅ FIX : éviter NaN quand valeur vide
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, id_profil: val === '' ? 0 : parseInt(val) });
                }}
              >
                <option value="">Sélectionner un rôle</option>
                {allowedRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.libelle} ({role.code})
                  </option>
                ))}
              </select>
              {allowedRoles.length < roles.length && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Certains rôles protégés ne sont pas affichés.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.fonction || ''}
                  onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.departement || ''}
                  onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.adresse || ''}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.ville || ''}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.code_postal || ''}
                  onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                />
              </div>
            </div>

            {/* Zone de travail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zone de travail
              </label>
              <LocationSelector
                value={locationSelection}
                onChange={setLocationSelection}
                className="mb-4"
              />

              {locationSelection.paysId && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-800 text-sm">Zones sélectionnées :</p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    {locationSelection.provinceIds && locationSelection.provinceIds.length > 0 && (
                      <li>• {locationSelection.provinceIds.length} province(s)</li>
                    )}
                    {locationSelection.villeIds && locationSelection.villeIds.length > 0 && (
                      <li>• {locationSelection.villeIds.length} ville(s)</li>
                    )}
                    {locationSelection.communeIds && locationSelection.communeIds.length > 0 && (
                      <li>• {locationSelection.communeIds.length} commune(s)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                {isEditMode ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}