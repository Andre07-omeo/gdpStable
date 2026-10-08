'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  MapPin,
  FileText,
  RefreshCw,
  Trash2,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface Reservation {
  id: string;
  idLigne: string | null;
  numeroCommande?: string;
  societeLocatrice: string;

  panneau: string;
  panneauAdresse?: string;
  panneauCommune?: string;
  panneauVille?: string;
  panneauDimension?: string;
  panneauId: string;

  faceId: string;
  faceOrientation?: string;
  faceActive?: boolean;

  dateDebut: string;
  dateFin: string;
  prix: number;
  statut: string;
  statutPaiement: string;
  validationComptable: boolean;
  agentNom?: string;
  createdAt: string;
}

interface Facture {
  id: string;
  numeroFacture: string;
  clientNom: string;
  commercialNom?: string;
  dateFacture: string;
  dateEcheance: string;
  statut: string;
  typeDocument: string;
  modePaiement: string;
  totalHt: number;
  totalTtc: number;
  devise: string;
  totalTtcCdf: number;
  totalTtcUsd: number;
  devisesUtilisees: string;
  createdAt: string;
}

interface AdminReservationsListProps {
  panneaux?: any[];
}

/* ------------------------------------------------------------------ */
/*  Utilitaires SÛRS (jamais de crash)                                */
/* ------------------------------------------------------------------ */
function parseLocalDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const s = String(str).slice(0, 10);
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (isNaN(date.getTime())) return null;
  return date;
}

function formatDateFR(str: string | null | undefined): string {
  const d = parseLocalDate(str);
  if (!d) return 'N/A';
  return d.toLocaleDateString('fr-FR');
}

function formatMoney(v: number, devise: string): string {
  return `${(Number(v) || 0).toLocaleString('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${devise}`;
}

function factureStatusClass(statut: string): string {
  const s = (statut || '').toLowerCase();
  if (['payee', 'payée', 'paid', 'reglee', 'réglée'].includes(s))
    return 'bg-green-100 text-green-700 border-green-200';
  if (['validee', 'validée', 'valide', 'validé'].includes(s))
    return 'bg-blue-100 text-blue-700 border-blue-200';
  if (['brouillon', 'draft'].includes(s))
    return 'bg-gray-100 text-gray-600 border-gray-200';
  if (['rejetee', 'rejetée', 'annulee', 'annulée'].includes(s))
    return 'bg-red-100 text-red-700 border-red-200';
  if (['envoyee', 'envoyée', 'en_attente', 'attente'].includes(s))
    return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function factureStatusLabel(statut: string): string {
  const s = (statut || '').toLowerCase();
  const map: Record<string, string> = {
    payee: 'Payée', payée: 'Payée', paid: 'Payée',
    reglee: 'Réglée', réglée: 'Réglée',
    validee: 'Validée', validée: 'Validée', valide: 'Validée', validé: 'Validée',
    brouillon: 'Brouillon', draft: 'Brouillon',
    rejetee: 'Rejetée', rejetée: 'Rejetée',
    annulee: 'Annulée', annulée: 'Annulée',
    envoyee: 'Envoyée', envoyée: 'Envoyée',
    en_attente: 'En attente', attente: 'En attente',
  };
  return map[s] || statut || 'Inconnu';
}

/* ------------------------------------------------------------------ */
/*  Composant                                                         */
/* ------------------------------------------------------------------ */
export function AdminReservationsList(_props: AdminReservationsListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'enCours' | 'futures' | 'passees'>('enCours');
  const [view, setView] = useState<'reservations' | 'factures'>('reservations');

  /* ---------------- Chargement ---------------- */
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reservations', { cache: 'no-store' });
      if (!res.ok) {
        setError(`Erreur API (${res.status})`);
        setReservations([]);
        setFactures([]);
        return;
      }
      const data = await res.json();

      const rawReservations = Array.isArray(data) ? data : data.reservations || [];
      const rawFactures = Array.isArray(data) ? [] : data.factures || [];

      console.log('📊 Front reçoit réservations:', rawReservations);
      console.log('📊 Front reçoit factures:', rawFactures);

      const formattedReservations: Reservation[] = rawReservations.map((r: any) => ({
        ...r,
        prix: Number(r.prix) || 0,
        dateDebut: r.dateDebut ? String(r.dateDebut).slice(0, 10) : '',
        dateFin: r.dateFin ? String(r.dateFin).slice(0, 10) : '',
      }));

      setReservations(formattedReservations);
      setFactures(rawFactures);
    } catch (e: any) {
      console.error('Erreur chargement:', e);
      setError('Impossible de charger les données');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ---------------- Nettoyage ---------------- */
  const handleClean = useCallback(
    async (mode: 'expirees' | 'orphelines' | 'tout' = 'expirees') => {
      const labels = {
        expirees: 'les réservations expirées',
        orphelines: 'les réservations orphelines',
        tout: 'TOUTES les réservations obsolètes',
      };
      if (!confirm(`Voulez-vous vraiment nettoyer ${labels[mode]} ?\nCette action est irréversible.`)) return;

      setCleaning(true);
      try {
        const res = await fetch('/api/admin/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`❌ ${data.error || 'Erreur de nettoyage'}`);
          return;
        }
        alert(
          `✅ Nettoyage terminé\n` +
            `• Réservations supprimées : ${data.deletedReservations}\n` +
            `• Lignes supprimées : ${data.deletedLignes}`
        );
        await loadAll(true);
      } catch (e) {
        console.error(e);
        alert('❌ Erreur réseau lors du nettoyage');
      } finally {
        setCleaning(false);
      }
    },
    [loadAll]
  );

  /* ---------------- Filtrage (avec dates sûres) ---------------- */
  const { enCours, futures, passees } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enCours: Reservation[] = [];
    const futures: Reservation[] = [];
    const passees: Reservation[] = [];

    for (const r of reservations) {
      const debut = parseLocalDate(r.dateDebut);
      const fin = parseLocalDate(r.dateFin);

      // Aucune date exploitable → "passées" (on ne perd pas la ligne)
      if (!debut && !fin) {
        passees.push(r);
        continue;
      }

      // Cas normal
      if (debut && today < debut) {
        futures.push(r);
      } else if (fin && today > fin) {
        passees.push(r);
      } else {
        enCours.push(r);
      }
    }

    console.log('📊 Filtrage →', {
      today: today.toISOString().slice(0, 10),
      enCours: enCours.length,
      futures: futures.length,
      passees: passees.length,
    });

    return { enCours, futures, passees };
  }, [reservations]);

  const tabs = [
    { id: 'enCours' as const, label: 'En cours', count: enCours.length, icon: Clock },
    { id: 'futures' as const, label: 'Futures', count: futures.length, icon: Calendar },
    { id: 'passees' as const, label: 'Passées', count: passees.length, icon: CheckCircle2 },
  ];

  const data =
    activeTab === 'enCours' ? enCours : activeTab === 'futures' ? futures : passees;

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des réservations...</p>
      </div>
    );
  }

  /* ---------------- Rendu ---------------- */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {view === 'reservations' ? 'Réservations' : 'Factures'}
          </h2>
          <p className="text-sm text-gray-500">
            {view === 'reservations'
              ? 'Suivi des locations'
              : 'Suivi des factures et de leur statut'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAll()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={16} />
            Rafraîchir
          </button>

          {view === 'reservations' && (
            <>
              <button
                onClick={() => handleClean('expirees')}
                disabled={cleaning}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
              >
                <Trash2 size={16} />
                {cleaning ? 'Nettoyage...' : 'Nettoyer expirées'}
              </button>
              <button
                onClick={() => handleClean('tout')}
                disabled={cleaning}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
              >
                <Trash2 size={16} />
                Tout nettoyer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Switch vues */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setView('reservations')}
          className={
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ' +
            (view === 'reservations' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-800')
          }
        >
          <Calendar size={16} />
          Réservations
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
            {reservations.length}
          </span>
        </button>
        <button
          onClick={() => setView('factures')}
          className={
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition ' +
            (view === 'factures' ? 'bg-white text-emerald-600 shadow' : 'text-gray-600 hover:text-gray-800')
          }
        >
          <FileText size={16} />
          Factures
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
            {factures.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ============ RÉSERVATIONS ============ */}
      {view === 'reservations' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
              <p className="text-2xl font-bold text-emerald-600">{enCours.length}</p>
              <p className="text-xs text-gray-500">En cours</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-amber-600">{futures.length}</p>
              <p className="text-xs text-gray-500">Futures</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
              <p className="text-2xl font-bold text-gray-600">{passees.length}</p>
              <p className="text-xs text-gray-500">Passées</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ' +
                    (isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200')
                  }
                >
                  <tab.icon size={16} />
                  {tab.label}
                  <span
                    className={
                      'px-2 py-0.5 rounded-full text-xs ' +
                      (isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')
                    }
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {data.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <Calendar size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune réservation dans cette catégorie</p>
              </div>
            ) : (
              data.map((res, idx) => {
                const statusClass =
                  activeTab === 'enCours'
                    ? 'bg-emerald-100 text-emerald-700'
                    : activeTab === 'futures'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600';

                const statusLabel =
                  activeTab === 'enCours'
                    ? 'En cours'
                    : activeTab === 'futures'
                      ? 'À venir'
                      : 'Terminée';

                return (
                  <motion.div
                    key={res.idLigne || res.id || idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-gray-800">
                          {res.societeLocatrice || 'Société inconnue'}
                        </h3>
                        {res.numeroCommande && (
                          <p className="text-xs text-gray-400 font-mono">{res.numeroCommande}</p>
                        )}

                        <p className="text-sm text-gray-700 font-medium flex items-center gap-2 mt-1">
                          <MapPin size={14} className="text-blue-500" />
                          {res.panneau}
                          {res.panneauDimension && (
                            <span className="text-xs text-gray-400">({res.panneauDimension})</span>
                          )}
                        </p>

                        {(res.panneauAdresse || res.panneauVille || res.panneauCommune) && (
                          <p className="text-xs text-gray-400 ml-5">
                            {[res.panneauAdresse, res.panneauCommune, res.panneauVille]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}

                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-gray-400">FACE :</span>
                          <span className="font-medium text-gray-700">
                            {res.faceOrientation || res.faceId || 'N/A'}
                          </span>
                          {res.faceActive === false && (
                            <span className="text-xs text-red-500 font-semibold">(inactive)</span>
                          )}
                        </p>

                        {/* ✅ Dates avec helper sûr */}
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                          <Calendar size={14} />
                          {formatDateFR(res.dateDebut)} → {formatDateFR(res.dateFin)}
                        </p>

                        {res.prix > 0 && (
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {res.prix.toLocaleString('fr-FR')} $
                          </p>
                        )}

                        {res.agentNom && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Users size={12} />
                            Agent: {res.agentNom}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className={'px-3 py-1 rounded-full text-xs font-bold ' + statusClass}>
                          {statusLabel}
                        </span>
                        <span
                          className={
                            'px-2 py-0.5 rounded-full text-xs ' +
                            (res.statutPaiement === 'Payé'
                              ? 'bg-green-100 text-green-700'
                              : res.statutPaiement === 'Validé'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700')
                          }
                        >
                          {res.statutPaiement || 'En attente'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ============ FACTURES ============ */}
      {view === 'factures' && (
        <div className="space-y-3">
          {factures.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <FileText size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune facture trouvée</p>
            </div>
          ) : (
            factures.map((f, idx) => (
              <motion.div
                key={f.id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={16} className="text-emerald-600" />
                      <h3 className="font-bold text-gray-800 font-mono">{f.numeroFacture}</h3>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{f.clientNom}</p>
                    {f.commercialNom && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users size={12} />
                        Commercial: {f.commercialNom}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar size={14} />
                      Émise le {formatDateFR(f.dateFacture)}
                      {f.dateEcheance && <> · Échéance {formatDateFR(f.dateEcheance)}</>}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <DollarSign size={14} />
                        HT : {formatMoney(f.totalHt, f.devise)}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-gray-800">
                        TTC : {formatMoney(f.totalTtc, f.devise)}
                      </span>
                    </div>
                    {(f.totalTtcCdf > 0 || f.totalTtcUsd > 0) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {f.totalTtcCdf > 0 && `≈ ${f.totalTtcCdf.toLocaleString('fr-FR')} CDF`}
                        {f.totalTtcCdf > 0 && f.totalTtcUsd > 0 && ' · '}
                        {f.totalTtcUsd > 0 && `≈ ${f.totalTtcUsd.toLocaleString('fr-FR')} USD`}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={
                        'px-3 py-1 rounded-full text-xs font-bold border ' +
                        factureStatusClass(f.statut)
                      }
                    >
                      {factureStatusLabel(f.statut)}
                    </span>
                    {f.typeDocument && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                        {f.typeDocument}
                      </span>
                    )}
                    {f.modePaiement && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                        {f.modePaiement}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}