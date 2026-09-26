'use client';

export const dynamic = 'force-dynamic';

// src/app/login/page.tsx


import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserCog,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-3 py-4 sm:p-4 relative overflow-hidden">

      {/* ═══════════════════════════════════════════
          🌊 FORMES DÉCORATIVES ANIMÉES
          ═══════════════════════════════════════════ */}
      <motion.div
        animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -right-40 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -80, 0], y: [0, 60, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* ═══════════════════════════════════════════
          CARTE DE CONNEXION
          ═══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', damping: 25 }}
        className="relative w-full max-w-md z-10 my-auto"
      >
        <div className="relative bg-white/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-900/10 border border-white/60 p-5 sm:p-8 md:p-10 overflow-hidden">

          {/* Reflet lumineux en haut */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

          {/* ═══════════════════════════════════════════
              LOGO + TITRE
              ═══════════════════════════════════════════ */}
          <div className="text-center mb-4 sm:mb-6">

            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: 'spring', damping: 15 }}
              className="flex justify-center mb-3 sm:mb-4 relative"
            >
              {/* Halo lumineux externe */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 m-auto w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-400/40 via-indigo-400/40 to-purple-400/40 blur-2xl -z-10"
              />

              <div className="relative">
                {/* Anneau lumineux rotatif */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6)',
                    padding: '2px',
                    WebkitMask:
                      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    opacity: 0.5,
                  }}
                />

                {/* Fond flouté derrière le logo */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-white via-blue-50 to-indigo-50 backdrop-blur-xl border border-white/80 shadow-2xl shadow-blue-500/20 flex items-center justify-center overflow-hidden">

                  {/* Reflet interne */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-60" />

                  {/* Particules décoratives */}
                  <motion.div
                    animate={{ y: [-5, 5, -5], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-2 right-3 w-1.5 h-1.5 rounded-full bg-blue-400"
                  />
                  <motion.div
                    animate={{ y: [5, -5, 5], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-3 left-4 w-1 h-1 rounded-full bg-indigo-400"
                  />

                  {/* ⬇️ LOGO ⬇️ */}
                  <Image
                    src="/icons/icon-192x192.png"
                    alt="Logo GDP"
                    width={192}
                    height={192}
                    priority
                    className="object-contain w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 relative z-10 drop-shadow-lg"
                  />
                </div>

                {/* ⭐ Badge Sparkles — BLEU ⭐ */}
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 border-2 border-white z-20"
                >
                  <Sparkles size={12} className="text-white sm:hidden" />
                  <Sparkles size={14} className="text-white hidden sm:block" />
                </motion.div>
              </div>
            </motion.div>

            {/* Titre */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent"
            >
              Connexion
            </motion.h2>

            {/* Sous-titre */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-500 text-xs sm:text-sm mt-0.5 font-medium flex items-center justify-center gap-1.5 sm:gap-2"
            >
              <UserCog size={14} className="text-blue-500 sm:hidden" />
              <UserCog size={16} className="text-blue-500 hidden sm:block" />
              Espace Administrateur
            </motion.p>

            {/* Barre décorative */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 32 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full mx-auto mt-2 sm:mt-3 shadow-sm shadow-blue-500/30"
            />
          </div>

          {/* ═══════════════════════════════════════════
              MESSAGE D'ERREUR
              ═══════════════════════════════════════════ */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 sm:mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-start gap-2 sm:gap-3"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500 sm:hidden" />
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-500 hidden sm:block" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════
              FORMULAIRE
              ═══════════════════════════════════════════ */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail
                    size={16}
                    className="text-gray-400 group-focus-within:text-blue-500 transition-colors sm:hidden"
                  />
                  <Mail
                    size={18}
                    className="text-gray-400 group-focus-within:text-blue-500 transition-colors hidden sm:block"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 bg-white/70 backdrop-blur border border-gray-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all duration-300"
                  placeholder="admin@exemple.com"
                />
              </div>
            </motion.div>

            {/* Mot de passe */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1 sm:mb-1.5">
                Mot de passe
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    size={16}
                    className="text-gray-400 group-focus-within:text-blue-500 transition-colors sm:hidden"
                  />
                  <Lock
                    size={18}
                    className="text-gray-400 group-focus-within:text-blue-500 transition-colors hidden sm:block"
                  />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-white/70 backdrop-blur border border-gray-200 rounded-xl sm:rounded-2xl text-sm sm:text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 focus:bg-white transition-all duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-500 transition"
                >
                  {showPassword ? (
                    <>
                      <EyeOff size={16} className="sm:hidden" />
                      <EyeOff size={18} className="hidden sm:block" />
                    </>
                  ) : (
                    <>
                      <Eye size={16} className="sm:hidden" />
                      <Eye size={18} className="hidden sm:block" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Se souvenir */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                      rememberMe
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}
                  >
                    {rememberMe && (
                      <CheckCircle size={12} className="text-white sm:hidden" />
                    )}
                    {rememberMe && (
                      <CheckCircle size={14} className="text-white hidden sm:block" />
                    )}
                  </div>
                </div>
                <span className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition">
                  Se souvenir de moi
                </span>
              </label>
            </motion.div>

            {/* Bouton connexion */}
            <motion.button
              type="submit"
              disabled={isLoading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold rounded-xl sm:rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn
                    size={16}
                    className="group-hover:rotate-12 transition-transform relative z-10 sm:hidden"
                  />
                  <LogIn
                    size={20}
                    className="group-hover:rotate-12 transition-transform relative z-10 hidden sm:block"
                  />
                  <span className="relative z-10">Se connecter</span>
                </>
              )}
            </motion.button>

            {/* Retour accueil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center"
            >
              <Link
                href="/"
                className="text-xs sm:text-sm text-gray-400 hover:text-blue-600 transition font-medium inline-flex items-center gap-1"
              >
                ← Retour à l'accueil
              </Link>
            </motion.div>
          </form>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-3 sm:mt-4"
        >
          <p className="text-gray-400 text-[10px] sm:text-xs font-medium">
            © 2026 Panneaux Pro. Tous droits réservés.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}