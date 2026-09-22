// src/app/dashboard/commercial/components/profile/ProfileEditForm.tsx
'use client';

import { useState } from 'react';
import { Save, X, Lock } from 'lucide-react';
import type { UserProfile } from './ProfileModal';

interface Props {
  user: UserProfile;
  onCancel: () => void;
  onSaved: (user: UserProfile) => void;
}

export function ProfileEditForm({ user, onCancel, onSaved }: Props) {
  const [form, setForm] = useState({
    nom: user.nom || '',
    prenom: user.prenom || '',
    sexe: user.sexe || 'Masculin',
    adresse: user.adresse || '',
    code_postal: user.code_postal || '',   // ⬅️ devient "matricule" à l'affichage
    telephone: user.telephone || '',
    departement: user.departement || '',
    fonction: user.fonction || '',
    email: user.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation client rapide
    if (!form.nom.trim() || !form.prenom.trim()) {
      setError('Nom et prénom obligatoires');
      return;
    }

    setSaving(true);
    try {
      // ✅ On n'envoie QUE les champs modifiables
      // Fonction, département et email sont exclus (non modifiables)
      const payload = {
        nom: form.nom,
        prenom: form.prenom,
        sexe: form.sexe,
        adresse: form.adresse,
        code_postal: form.code_postal,  // "matricule" côté UI
        telephone: form.telephone,
        // ❌ departement: non envoyé
        // ❌ fonction: non envoyé
        // ❌ email: non envoyé
      };

      const res = await fetch('/api/user/update', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      onSaved(data.user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Bandeau d'information */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
        <Lock size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Les champs <strong>Email</strong>, <strong>Département</strong> et <strong>Fonction</strong> ne peuvent
          pas être modifiés directement. Contactez votre administrateur pour toute modification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nom *" value={form.nom} onChange={(v) => update('nom', v)} />
        <Field label="Prénom *" value={form.prenom} onChange={(v) => update('prenom', v)} />

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
            Sexe
          </label>
          <select
            value={form.sexe}
            onChange={(e) => update('sexe', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition bg-white"
          >
            <option>Masculin</option>
            <option>Féminin</option>
            <option>Autre</option>
          </select>
        </div>

        {/* ✅ Email — lecture seule */}
        <ReadOnlyField label="Email" value={form.email} />

        {/* ✅ Code postal → Matricule */}
        <Field
          label="Matricule"
          value={form.code_postal}
          onChange={(v) => update('code_postal', v)}
          placeholder="Ex: MAT-001"
        />

        <Field
          label="Téléphone"
          value={form.telephone}
          onChange={(v) => update('telephone', v)}
          placeholder="+243..."
        />

        <Field label="Adresse" value={form.adresse} onChange={(v) => update('adresse', v)} />

        {/* ✅ Département — lecture seule */}
        <ReadOnlyField label="Département" value={form.departement} />

        {/* ✅ Fonction — lecture seule */}
        <ReadOnlyField label="Fonction" value={form.fonction} />
      </div>

      {/* Footer collant avec boutons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition disabled:opacity-50"
        >
          <X size={16} /> Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save size={16} /> Valider
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================
// CHAMP ÉDITABLE
// ============================================

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
      />
    </div>
  );
}

// ============================================
// CHAMP LECTURE SEULE (avec cadenas)
// ============================================

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
        {label}
        <Lock size={10} className="text-gray-400" />
      </label>
      <div className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 flex items-center gap-2 cursor-not-allowed">
        <span className="truncate">{value || '—'}</span>
      </div>
    </div>
  );
}