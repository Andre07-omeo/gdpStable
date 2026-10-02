'use client';

// src/app/dashboard/admin/components/profile/ProfileEditForm.tsx
import { useState } from 'react';
import { Loader2, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProfileEditFormProps {
  profile: any;
  onCancel: () => void;
  onSaved: (updated: any) => void;
}

// ============================================
// ✅ CHAMPS QUE L'UTILISATEUR PEUT MODIFIER
// ============================================
// ❌ NE JAMAIS inclure : id_profil, actif, zone_niveau, zone_travail,
//    id_manager, mot_de_passe_hash, email (si sensible), etc.
const EDITABLE_FIELDS = ['nom', 'prenom', 'telephone', 'sexe', 'adresse', 'code_postal'] as const;

export function ProfileEditForm({ profile, onCancel, onSaved }: ProfileEditFormProps) {
  const [form, setForm] = useState({
    nom: profile?.nom || '',
    prenom: profile?.prenom || '',
    telephone: profile?.telephone || '',
    sexe: profile?.sexe || '',
    adresse: profile?.adresse || '',
    code_postal: profile?.code_postal || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // ✅ Sécurité côté client : ne garder QUE les champs autorisés
    const payload: Record<string, string> = {};
    for (const key of EDITABLE_FIELDS) {
      payload[key] = form[key];
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erreur lors de la sauvegarde');
      }

      const updated = await res.json();
      setSuccess(true);
      setTimeout(() => onSaved(updated), 800);
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Profil mis à jour avec succès !</span>
        </div>
      )}

      {/* 🔒 Message de sécurité */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 text-blue-700 text-[11px]">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Seules vos informations personnelles sont modifiables. Le rôle, le statut et la zone sont gérés par un administrateur.
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Nom"
          value={form.nom}
          onChange={(v) => handleChange('nom', v)}
          required
          placeholder="Dupont"
        />
        <Field
          label="Prénom"
          value={form.prenom}
          onChange={(v) => handleChange('prenom', v)}
          required
          placeholder="Jean"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
          Sexe
        </label>
        <select
          value={form.sexe}
          onChange={(e) => handleChange('sexe', e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white"
        >
          <option value="">— Non spécifié —</option>
          <option value="Masculin">Masculin</option>
          <option value="Féminin">Féminin</option>
        </select>
      </div>

      <Field
        label="Téléphone"
        type="tel"
        value={form.telephone}
        onChange={(v) => handleChange('telephone', v)}
        placeholder="+243 812 345 678"
      />

      <Field
        label="Adresse"
        value={form.adresse}
        onChange={(v) => handleChange('adresse', v)}
        placeholder="123 Avenue de la Paix"
      />

      <Field
        label="Code postal"
        value={form.code_postal}
        onChange={(v) => handleChange('code_postal', v)}
        placeholder="KIN 001"
      />

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/30 disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
          ) : (
            <><Save className="w-4 h-4" /> Enregistrer</>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// Sous-composant champ
// ============================================
function Field({
  label, value, onChange, type = 'text', required, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}