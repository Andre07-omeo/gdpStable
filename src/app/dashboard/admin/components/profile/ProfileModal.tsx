'use client';

// src/app/dashboard/admin/components/profile/ProfileModal.tsx
import { useState, useEffect } from 'react';
import { X, User, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { ProfileView } from './ProfileView';
import { ProfileEditForm } from './ProfileEditForm';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Charger le profil à l'ouverture
  useEffect(() => {
    if (!isOpen) {
      setMode('view');
      setError(null);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          // ✅ Extraire l'utilisateur si l'API renvoie { user: {...} }
          setProfile(data.user || data);
        } else {
          setProfile(user);
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setProfile(user);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, user]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bloquer le scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProfile = profile || user;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />

      {/* Contenu */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scaleIn">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-bold text-base sm:text-lg truncate">
                {mode === 'view' ? 'Mon profil' : 'Modifier le profil'}
              </h2>
              <p className="text-blue-100 text-[11px] truncate">
                {mode === 'view' ? 'Informations personnelles' : 'Mettre à jour vos informations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-white transition flex-shrink-0"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Chargement du profil...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : mode === 'view' ? (
            <ProfileView
              profile={currentProfile}
              onEdit={() => setMode('edit')}
            />
          ) : (
            <ProfileEditForm
              profile={currentProfile}
              onCancel={() => setMode('view')}
              onSaved={(updated) => {
                // ✅ Merger avec les relations existantes pour ne pas les perdre
                setProfile((prev: any) => ({ ...prev, ...updated }));
                setMode('view');
              }}
            />
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-scaleIn { animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}