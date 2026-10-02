'use client';

// src/app/dashboard/admin/users/components/UserForm.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  X, Save, Eye, EyeOff, Loader2, ShieldAlert,
  User as UserIcon, Mail, Phone, Lock, Briefcase,
  Building2, MapPin, Info, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreateUserDTO,
  UpdateUserDTO,
  User,
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

const EMPTY_FORM: CreateUserDTO = {
  nom: '',
  prenom: '',
  email: '',
  password: '',
  telephone: '',
  adresse: '',
  ville: '',
  departement: '',
  fonction: '',
  id_profil: 0,
  zone_travail: '',
};

/* ── Petit composant : champ avec icône ── */
function Field({
  label,
  icon: Icon,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  icon: React.ElementType;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && (
          <span className="ml-auto text-[11px] font-normal text-gray-400">{hint}</span>
        )}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300';

export function UserForm({
  isOpen,
  onClose,
  onSave,
  user,
  roles,
  loading = false,
  currentUser,
}: UserFormProps) {
  const [formData, setFormData] = useState<CreateUserDTO | UpdateUserDTO>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  const isEditMode = !!user;
  const isPasswordRequired = !isEditMode;

  const editPermission = useMemo(
    () => canPerformAction('edit', currentUser, user || undefined),
    [currentUser, user]
  );

  const allowedRoles = useMemo(
    () => getAllowedRoles(currentUser, roles),
    [currentUser, roles]
  );

  const targetIsProtected = user ? isFounder(user) : false;

  /* Charger les données (édition) */
  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        password: '',
        telephone: user.telephone || '',
        adresse: user.adresse || '',
        ville: user.ville_nom || '',
        departement: user.departement || '',
        fonction: user.fonction || '',
        id_profil: user.id_profil || 0,
        zone_travail: '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setEmailError('');
  }, [user]);

  /* Auto-génération email */
  useEffect(() => {
    if (!user && formData.prenom && formData.prenom.trim() !== '') {
      const prenom = formData.prenom.trim().toLowerCase();
      const normalized = prenom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      setFormData((prev) => ({ ...prev, email: `${normalized}@dispro.cd` }));
      setEmailError('');
    }
  }, [formData.prenom, user]);

  /* Fermeture ESC */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  /* 🔒 Blocage permission */
  if (isEditMode && !editPermission.allowed) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Action non autorisée</h3>
            <p className="text-sm text-gray-600 mb-6">
              {editPermission.reason || "Vous n'avez pas les droits pour modifier cet utilisateur."}
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
            >
              Fermer
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || formData.email.trim() === '') {
      setEmailError("L'email est requis");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setEmailError("Format d'email invalide");
      return;
    }
    if (isPasswordRequired && (!formData.password || formData.password.length < 6)) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!formData.id_profil || formData.id_profil === 0) {
      alert('Veuillez sélectionner un rôle');
      return;
    }

    const dataToSave: any = { ...formData, zone_travail: null };
    if (formData.ville) dataToSave.ville_nom = formData.ville;

    await onSave(dataToSave);
  };

  /* Progression du formulaire */
  const requiredFilled = [
    formData.nom,
    formData.prenom,
    formData.email,
    isPasswordRequired ? formData.password : 'ok',
    formData.id_profil,
  ].filter(Boolean).length;
  const progress = Math.round((requiredFilled / 5) * 100);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="bg-white w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* ── HEADER ── */}
          <div className="relative px-6 py-5 bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-blue-200 uppercase tracking-[0.12em]">
                    {isEditMode ? 'Modification' : 'Création de compte'}
                  </p>
                  <h2 className="text-lg font-bold text-white leading-tight">
                    {isEditMode
                      ? `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Utilisateur'
                      : 'Nouvel utilisateur'}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                type="button"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barre de progression */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full"
                />
              </div>
              <span className="text-[11px] font-semibold text-white/80 tabular-nums">
                {progress}%
              </span>
            </div>
          </div>

          {/* Bandeau compte protégé */}
          {targetIsProtected && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2 flex-shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Compte fondateur protégé.</strong> Certaines actions sont restreintes.
              </p>
            </div>
          )}

          {/* ── CORPS SCROLLABLE ── */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto bg-gray-50/60"
            id="user-form"
          >
            <div className="p-6 space-y-6">
              {/* SECTION 1 : Identité */}
              <section>
                <SectionTitle icon={UserIcon} title="Identité" subtitle="Nom et prénom de l'utilisateur" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Prénom" icon={UserIcon} required>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Jean"
                      className={inputClass}
                      value={formData.prenom || ''}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    />
                  </Field>
                  <Field label="Nom" icon={UserIcon} required>
                    <input
                      type="text"
                      required
                      placeholder="Dupont"
                      className={inputClass}
                      value={formData.nom || ''}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    />
                  </Field>
                </div>
              </section>

              {/* SECTION 2 : Contact */}
              <section>
                <SectionTitle icon={Mail} title="Contact" subtitle="Coordonnées de connexion et de contact" />
                <div className="space-y-4">
                  <Field
                    label="Email professionnel"
                    icon={Mail}
                    required
                    error={emailError}
                    hint={!isEditMode ? 'auto-généré depuis le prénom' : undefined}
                  >
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="jean@dispro.cd"
                        className={`${inputClass} ${
                          emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-500/10' : ''
                        } ${!isEditMode && formData.email ? 'pr-10' : ''}`}
                        value={formData.email || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setEmailError('');
                        }}
                      />
                      {!isEditMode && formData.email && !emailError && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Téléphone" icon={Phone}>
                      <input
                        type="tel"
                        placeholder="+243 81 000 0000"
                        className={inputClass}
                        value={formData.telephone || ''}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      />
                    </Field>

                    <Field
                      label="Mot de passe"
                      icon={Lock}
                      required={isPasswordRequired}
                      hint={isEditMode ? 'laisser vide pour conserver' : undefined}
                    >
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={isPasswordRequired}
                          minLength={6}
                          placeholder={isEditMode ? '••••••••' : 'Min. 6 caractères'}
                          className={`${inputClass} pr-10`}
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                  </div>
                </div>
              </section>

              {/* SECTION 3 : Poste */}
              <section>
                <SectionTitle
                  icon={Briefcase}
                  title="Poste & Rôle"
                  subtitle="Fonction, département et niveau d'accès"
                />
                <div className="space-y-4">
                  <Field label="Rôle système" icon={ShieldAlert} required>
                    <select
                      required
                      className={`${inputClass} cursor-pointer`}
                      value={formData.id_profil || 0}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({ ...formData, id_profil: val === '' ? 0 : parseInt(val) });
                      }}
                    >
                      <option value="">— Sélectionner un rôle —</option>
                      {allowedRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.libelle} ({role.code})
                        </option>
                      ))}
                    </select>
                    {allowedRoles.length < roles.length && (
                      <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Certains rôles protégés ne sont pas affichés.
                      </div>
                    )}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Fonction" icon={Briefcase}>
                      <input
                        type="text"
                        placeholder="Ex : Commercial terrain"
                        className={inputClass}
                        value={formData.fonction || ''}
                        onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                      />
                    </Field>
                    <Field label="Département" icon={Building2}>
                      <input
                        type="text"
                        placeholder="Ex : Ventes"
                        className={inputClass}
                        value={formData.departement || ''}
                        onChange={(e) => setFormData({ ...formData, departement: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* SECTION 4 : Localisation */}
              <section>
                <SectionTitle
                  icon={MapPin}
                  title="Localisation"
                  subtitle="Adresse et zone géographique (facultatif)"
                />
                <div className="space-y-4">
                  <Field label="Adresse" icon={MapPin}>
                    <input
                      type="text"
                      placeholder="Ex : 123 avenue de la Paix"
                      className={inputClass}
                      value={formData.adresse || ''}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    />
                  </Field>
                  <Field label="Ville" icon={Building2}>
                    <input
                      type="text"
                      placeholder="Ex : Kinshasa"
                      className={inputClass}
                      value={formData.ville || ''}
                      onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    />
                  </Field>
                </div>
              </section>
            </div>
          </form>

          {/* ── FOOTER STICKY ── */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between gap-3">
            <p className="hidden sm:block text-xs text-gray-500">
              <span className="text-red-500">*</span> Champs obligatoires
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={loading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {isEditMode ? 'Mettre à jour' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ── Titre de section ── */
function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}