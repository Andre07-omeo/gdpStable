'use client';

// src/app/dashboard/admin/components/AdminSupport.tsx
import React, { useMemo, useState } from 'react';
import {
  HelpCircle, MessageSquare, Mail, Phone, Globe, BookOpen,
  Search, ChevronDown, Copy, Check, Send, Loader2,
  Activity, Server, ShieldCheck, Clock, ExternalLink,
  LifeBuoy, FileText, Video, AlertCircle, Zap,
  QrCode, Download, Share2, Link as LinkIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Faq {
  id: string;
  categorie: 'Panneaux' | 'Utilisateurs' | 'Réservations' | 'Système';
  question: string;
  answer: string;
}

const FAQS: Faq[] = [
  {
    id: 'faq-1',
    categorie: 'Panneaux',
    question: 'Comment ajouter un panneau ?',
    answer: 'Allez dans l’onglet « Panneaux » puis cliquez sur « Nouveau ». Remplissez le nom, la localisation, les dimensions et ajoutez les faces.',
  },
  {
    id: 'faq-2',
    categorie: 'Panneaux',
    question: 'Comment modifier ou supprimer un panneau ?',
    answer: 'Dans la liste des panneaux, utilisez les icônes ✏️ (modifier) ou 🗑️ (supprimer) à droite de chaque ligne. La suppression efface aussi les faces et réservations liées.',
  },
  {
    id: 'faq-3',
    categorie: 'Utilisateurs',
    question: 'Comment créer un utilisateur ?',
    answer: 'Allez dans « Utilisateurs » > « Nouveau ». Le rôle détermine les permissions. L’email est auto-généré à partir du prénom.',
  },
  {
    id: 'faq-4',
    categorie: 'Utilisateurs',
    question: 'Pourquoi certains rôles ne sont pas visibles ?',
    answer: 'Les rôles protégés (SUPER_ADMIN, ADMIN_SYSTEM) ne peuvent être attribués que par un SUPER_ADMIN. Si vous voyez un bandeau ambré, c’est normal.',
  },
  {
    id: 'faq-5',
    categorie: 'Réservations',
    question: 'Comment gérer les réservations ?',
    answer: 'L’onglet « Réservations » liste toutes les demandes. Utilisez les filtres pour voir celles en cours, futures ou passées.',
  },
  {
    id: 'faq-6',
    categorie: 'Réservations',
    question: 'Une réservation supprimée est-elle récupérable ?',
    answer: 'Non. La suppression est définitive et entraîne la suppression des photos et historiques associés.',
  },
  {
    id: 'faq-7',
    categorie: 'Système',
    question: 'Comment changer mon mot de passe ?',
    answer: 'Cliquez sur votre avatar en haut à droite puis sur « Changer le mot de passe ».',
  },
  {
    id: 'faq-8',
    categorie: 'Système',
    question: 'Que faire si l’application est lente ?',
    answer: 'Vérifiez votre connexion. Si le problème persiste, ouvrez l’onglet « Admin Système » pour voir l’état des services, puis contactez le support.',
  },
];

const CONTACTS = [
  { icon: Mail, label: 'Email', value: 'support@dispro.cd', href: 'mailto:support@panneaux.cd' },
  { icon: Phone, label: 'Téléphone', value: '+243 815 023 699', href: 'tel:+243815023699' },
  { icon: Globe, label: 'Documentation', value: 'docs.panneaux.cd', href: 'https://docs.panneaux.cd' },
];

const RESSOURCES = [
  { icon: BookOpen, label: 'Guide de démarrage', desc: 'Premiers pas avec la plateforme' },
  { icon: Video, label: 'Tutoriels vidéo', desc: 'Démonstrations pas à pas' },
  { icon: FileText, label: 'Documentation API', desc: 'Pour les développeurs' },
  { icon: ShieldCheck, label: 'Bonnes pratiques', desc: 'Sécurité & permissions' },
];

/** URL cible du QR code (page de connexion) */
const LOGIN_URL = 'https://gestiondigitalepanneaux.com/login';

/** URL du QR généré dynamiquement via une API publique gratuite */
const QR_IMAGE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
  LOGIN_URL
)}`;

export function AdminSupport() {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const [copied, setCopied] = useState<string | null>(null);

  // Formulaire contact
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const filteredFaqs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.categorie.toLowerCase().includes(q)
    );
  }, [search]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  /** Partage natif (mobile) ou copie du lien */
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Gestion Panneaux Pro',
          text: 'Accédez à la plateforme de gestion des panneaux',
          url: LOGIN_URL,
        });
      } else {
        await handleCopy(LOGIN_URL);
      }
    } catch {
      /* utilisateur a annulé */
    }
  };

  /** Télécharge le QR code en PNG */
  const handleDownloadQr = async () => {
    try {
      const res = await fetch(QR_IMAGE_URL);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'qr-connexion-panneaux.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Impossible de télécharger le QR code');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sujet.trim() || !message.trim()) {
      alert('Merci de renseigner un sujet et un message.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sujet, message }),
      });
      if (res.ok) {
        alert('✅ Votre message a été envoyé au support.');
        setSujet('');
        setMessage('');
      } else {
        window.location.href = `mailto:support@panneaux.cd?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(message)}`;
      }
    } catch {
      window.location.href = `mailto:support@panneaux.cd?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(message)}`;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <LifeBuoy className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Centre d’aide & Support
            </h1>
            <p className="text-sm text-blue-100 mt-1">
              Trouvez des réponses, contactez l’équipe, ou explorez nos ressources.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-400/20 border border-emerald-300/30 self-start sm:self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-emerald-100">Support en ligne</span>
          </div>
        </div>

        {/* Barre de recherche FAQ */}
        <div className="relative mt-6 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher une question (ex : réservation, utilisateur, mot de passe...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-gray-800 text-sm outline-none shadow-lg shadow-blue-900/20 focus:ring-4 focus:ring-white/30 transition placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── STATUT SYSTÈME ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard icon={Server} label="API" value="Opérationnelle" tone="emerald" />
        <StatusCard icon={Activity} label="Base de données" value="Connectée" tone="emerald" />
        <StatusCard icon={ShieldCheck} label="Authentification" value="Sécurisée" tone="blue" />
        <StatusCard icon={Clock} label="Dernière synchro" value={new Date().toLocaleTimeString('fr-FR')} tone="gray" />
      </div>

      {/* ── GRILLE PRINCIPALE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne FAQ */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BookOpen size={20} className="text-blue-600" />
              Questions fréquentes
              <span className="text-xs font-normal text-gray-400">
                ({filteredFaqs.length})
              </span>
            </h2>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <AlertCircle size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Aucune question ne correspond à « {search} »</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFaqs.map((faq) => {
                const isOpen = openId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`bg-white rounded-xl border transition-all ${isOpen ? 'border-blue-300 shadow-md shadow-blue-500/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : faq.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                          {faq.categorie}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {faq.question}
                        </span>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 pt-0 border-t border-gray-100">
                        <p className="text-sm text-gray-600 leading-relaxed pt-3">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ressources */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Ressources utiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RESSOURCES.map((r) => {
                const Icon = r.icon;
                return (
                  <a
                    key={r.label}
                    href="#"
                    className="group flex items-start gap-3 p-3.5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition">
                      <Icon size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        {r.label}
                        <ExternalLink size={11} className="text-gray-400" />
                      </p>
                      <p className="text-xs text-gray-500 truncate">{r.desc}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne Contact + QR */}
        <div className="space-y-4">
          {/* ✅ NOUVEAU : QR CODE d'accès rapide */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <QrCode size={18} className="text-indigo-600" />
              Accès rapide à la plateforme
            </h3>

            <div className="flex flex-col items-center">
              {/* QR Code */}
              <div className="relative p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm">
                <QRCodeSVG
                  value={LOGIN_URL}
                  size={180}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                  marginSize={2}
                />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-white shadow">
                  <QrCode size={13} className="text-white" />
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-3 mb-4 leading-relaxed">
                Scannez pour ouvrir directement la page de connexion
                <br />
                <span className="font-mono text-[10px] text-gray-400 break-all">
                  {LOGIN_URL.replace('https://', '')}
                </span>
              </p>

              {/* Actions QR */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition text-[10px] font-bold"
                  title="Télécharger le QR code"
                >
                  <Download size={14} />
                  Télécharger
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(LOGIN_URL)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition text-[10px] font-bold"
                  title="Copier le lien"
                >
                  {copied === LOGIN_URL ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <LinkIcon size={14} />
                  )}
                  {copied === LOGIN_URL ? 'Copié' : 'Copier'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition text-[10px] font-bold"
                  title="Partager"
                >
                  <Share2 size={14} />
                  Partager
                </button>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-600" />
              Nous contacter
            </h3>
            <div className="space-y-2">
              {CONTACTS.map((c) => {
                const Icon = c.icon;
                const isCopied = copied === c.value;
                return (
                  <div
                    key={c.value}
                    className="group flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <Icon size={15} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        {c.label}
                      </p>
                      <a
                        href={c.href}
                        className="text-sm text-gray-800 font-medium hover:text-blue-600 truncate block"
                      >
                        {c.value}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(c.value)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-white transition"
                      title="Copier"
                    >
                      {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulaire contact */}
          <form onSubmit={handleSendMessage} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-800 text-sm">Envoyer un message</h3>
            <input
              type="text"
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Sujet"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre problème..."
              rows={4}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition resize-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              Envoyer
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              Réponse habituelle sous 24h ouvrées
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: 'emerald' | 'blue' | 'gray';
}) {
  const tones = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-600',
  };
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${tones[tone]}`}>
      <Icon size={18} className="flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold opacity-70">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}