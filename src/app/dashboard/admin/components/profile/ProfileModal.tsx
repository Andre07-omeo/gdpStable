'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/profile/ProfileModal.tsximport { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProfileView } from './ProfileView';
import { ProfileEditForm } from './ProfileEditForm';

export interface UserProfile {
  id_user: number;
  id_profil: number;
  nom: string;
  prenom: string;
  sexe: string;
  adresse: string;
  code_postal: string;
  telephone: string;
  departement: string;
  fonction: string;
  email: string;
  actif: number;
  derniere_connexion: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user: UserProfile) => void;
}

export function ProfileModal({ isOpen, onClose, onUserUpdated }: Props) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEditing(false);
    setLoading(true);
    setError(null);

    fetch('/api/user/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUser(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">
            {editing ? '✏️ Modifier mon profil' : '👤 Mon profil'}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
              ❌ {error}
            </div>
          )}

          {user && !loading && !error && (
            editing ? (
              <ProfileEditForm
                user={user}
                onCancel={() => setEditing(false)}
                onSaved={(updated) => {
                  setUser(updated);
                  setEditing(false);
                  onUserUpdated?.(updated);
                }}
              />
            ) : (
              <ProfileView user={user} />
            )
          )}
        </div>

        {/* Footer */}
        {user && !loading && !error && !editing && (
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition"
            >
              Fermer
            </button>
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
            >
              ✏️ Éditer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}