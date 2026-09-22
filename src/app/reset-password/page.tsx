'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [step, setStep] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [prenom, setPrenom] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Aucun token fourni');
      setStep('error');
      return;
    }
    fetch(`/api/auth/verify-reset-token?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setEmail(data.email);
          setPrenom(data.prenom);
          setStep('form');
        } else {
          setError(data.error || 'Token invalide');
          setStep('error');
        }
      })
      .catch(() => {
        setError('Erreur de vérification');
        setStep('error');
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Minimum 8 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('success');
      setTimeout(() => router.push('/login'), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {step === 'loading' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4 text-sm">Vérification du lien...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
            <p className="text-sm text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
            >
              Retour à la connexion
            </button>
          </div>
        )}

        {step === 'form' && (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Lock size={28} className="text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Nouveau mot de passe</h1>
              <p className="text-sm text-gray-500 mt-1">
                Bonjour <strong>{prenom}</strong> ({email})
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">
                  Confirmer
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Modification...' : 'Modifier mon mot de passe'}
              </button>
            </form>
          </>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">✅ Mot de passe modifié !</h1>
            <p className="text-sm text-gray-600">
              Vous allez être redirigé vers la page de connexion...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}