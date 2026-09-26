'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/profile/ChangePasswordModal.tsximport { useState } from 'react';
import { X, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export function ChangePasswordModal({ isOpen, onClose, userEmail }: Props) {
  const [step, setStep] = useState<'confirm' | 'sent'>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');

  if (!isOpen) return null;

  const handleRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/request-password-reset', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');
      setMaskedEmail(data.email || userEmail);
      setStep('sent');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-amber-600 to-amber-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ShieldCheck size={20} />
            Sécurité du mot de passe
          </h2>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <>
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Mail size={28} className="text-amber-600" />
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Pour des raisons de sécurité, la modification du mot de passe
                  se fait via un <strong>lien envoyé par email</strong> à votre
                  adresse professionnelle.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
                <p className="text-xs text-blue-700 font-semibold mb-1">
                  📧 Email de destination :
                </p>
                <p className="text-sm text-blue-900 font-mono break-all">
                  {userEmail}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">
                  ❌ {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-100 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRequest}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Mail size={16} /> Envoyer le lien
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'sent' && (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Email envoyé !
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Un email de réinitialisation vient d'être envoyé à{' '}
                  <strong className="text-gray-900">{maskedEmail}</strong>.
                </p>
                <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                  ⏱️ Le lien est valable <strong>15 minutes</strong> et ne peut
                  être utilisé qu'une seule fois.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Pensez à vérifier vos spams si vous ne le voyez pas.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
              >
                J'ai compris
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}