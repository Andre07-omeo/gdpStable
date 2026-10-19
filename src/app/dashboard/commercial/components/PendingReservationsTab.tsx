'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/PendingReservationsTab.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Calendar, Building2, User,
  Loader2, RefreshCw, CheckSquare, Square,
  FileText, TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PendingReservation {
  id_reservation: number;
  numero_commande: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  statut: string;
  photoCampagneUrl: string | null;
  notes: string;
  created_at: string;
  date_expiration: string | null;
  jours_restants: number | null;
  client: { nom: string; email: string; telephone: string; };
  commercial: { nom: string; prenom: string; email: string; };
  lignes: {
    id_ligne: number;
    id_face: number;
    id_panneau: number;
    orientation: string;
    type_face: string;
    statut_diffusion: string;
    date_debut: string;
    date_fin: string;
    prix_vente_net: number;
    panneau: { id: number; nom: string; adresse: string; };
  }[];
}

interface PendingReservationsTabProps { user: any; }

const safeGetItem = (key: string): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) || '';
};

export function PendingReservationsTab({ user: userProp }: PendingReservationsTabProps) {
  const router = useRouter();
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // ✅ Tout en USD
  const [prixLocation, setPrixLocation] = useState<Record<number, string>>({});
  const [prixImpression, setPrixImpression] = useState<Record<number, string>>({});

  // ============================================
  // UTILISATEUR
  // ============================================
  const getUserFromStorage = () => {
    try {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (savedUser) return JSON.parse(savedUser);
      const nom = safeGetItem('user_nom');
      const prenom = safeGetItem('user_prenom');
      const email = safeGetItem('user_email');
      const profil = safeGetItem('user_profil');
      if (nom || prenom || email) return { nom, prenom, email, profil };
      return null;
    } catch { return null; }
  };

  const getUserNameFromStorage = (): string => {
    const nomComplet = safeGetItem('user_nom_complet');
    if (nomComplet?.trim()) return nomComplet;
    const user = getUserFromStorage();
    if (user?.prenom && user?.nom) return `${user.prenom} ${user.nom}`.trim();
    if (user?.nom) return user.nom;
    return 'Commercial';
  };

  const getUserEmailFromStorage = (): string => {
    const email = safeGetItem('user_email');
    if (email) return email;
    const user = getUserFromStorage();
    return user?.email || '';
  };

  // ============================================
  // CHARGEMENT
  // ============================================
  const fetchPendingReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/commercials/reservations/attente', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setReservations(data.data);

        const locInit: Record<number, string> = {};
        const impInit: Record<number, string> = {};

        data.data.forEach((r: PendingReservation) => {
          locInit[r.id_reservation] = '';
          impInit[r.id_reservation] = '';
        });

        setPrixLocation(locInit);
        setPrixImpression(impInit);
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPendingReservations(); }, []);

  // ============================================
  // SÉLECTION
  // ============================================
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectAll ? [] : reservations.map(r => r.id_reservation));
    setSelectAll(!selectAll);
  };

  // ============================================
  // UPDATES
  // ============================================
  const updatePrixLocation = (id: number, v: string) =>
    setPrixLocation(p => ({ ...p, [id]: v }));

  const updatePrixImpression = (id: number, v: string) =>
    setPrixImpression(p => ({ ...p, [id]: v }));

  // ============================================
  // TOTAL D'UNE RÉSERVATION (tout en USD)
  // ============================================
  const totalReservation = (id: number): number => {
    const loc = parseFloat(prixLocation[id] || '0') || 0;
    const imp = parseFloat(prixImpression[id] || '0') || 0;
    return loc + imp;
  };

  // ============================================
  // TOTAUX GLOBAUX
  // ============================================
  const totauxGlobaux = () => {
    const selected = reservations.filter(r => selectedIds.includes(r.id_reservation));
    let totalLoc = 0;
    let totalImp = 0;

    for (const r of selected) {
      totalLoc += parseFloat(prixLocation[r.id_reservation] || '0') || 0;
      totalImp += parseFloat(prixImpression[r.id_reservation] || '0') || 0;
    }

    return { totalLoc, totalImp, totalGeneral: totalLoc + totalImp };
  };

  // ============================================
  // VÉRIFICATIONS
  // ============================================
  const verifierPrix = () => {
    const selected = reservations.filter(r => selectedIds.includes(r.id_reservation));
    const manquants: number[] = [];
    for (const r of selected) {
      const loc = parseFloat(prixLocation[r.id_reservation] || '0') || 0;
      if (loc <= 0) manquants.push(r.id_reservation);
    }
    return manquants;
  };

  // ============================================
  // CRÉER PROFORMAT
  // ============================================
  const creerFacture = async () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une réservation');
      return;
    }

    const userData = getUserFromStorage();
    const nom = userData?.nom || safeGetItem('user_nom');
    const prenom = userData?.prenom || safeGetItem('user_prenom');
    const email = getUserEmailFromStorage() || userData?.email || '';

    if (!nom || !prenom) {
      alert('⚠️ Nom et prénom manquants. Reconnectez-vous.');
      return;
    }
    if (!email) {
      alert('⚠️ Email manquant. Reconnectez-vous.');
      return;
    }

    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    const clientIds = [...new Set(selectedReservations.map(r => r.client?.nom))];

    if (clientIds.length > 1) {
      alert('⚠️ Un seul client par facture !\n' + clientIds.join(', '));
      return;
    }

    const prixManquants = verifierPrix();
    if (prixManquants.length > 0) {
      const details = prixManquants.map(id => {
        const r = reservations.find(x => x.id_reservation === id);
        return `- ${r?.numero_commande || id}`;
      });
      alert(`⚠️ Prix location manquant pour :\n${details.join('\n')}`);
      return;
    }

    const totaux = totauxGlobaux();
    const nomCompletFinal = `${prenom} ${nom}`.trim();

    try {
      const factureData = selectedReservations.map(r => {
        const loc = parseFloat(prixLocation[r.id_reservation] || '0') || 0;
        const imp = parseFloat(prixImpression[r.id_reservation] || '0') || 0;

        return {
          id_reservation: r.id_reservation,
          numero_commande: r.numero_commande,
          client_nom: r.client?.nom,
          client_email: r.client?.email,
          client_telephone: r.client?.telephone,
          commercial_nom: nom,
          commercial_prenom: prenom,
          commercial_email: email,
          commercial_nom_complet: nomCompletFinal,
          date_debut_campagne: r.date_debut_campagne,
          date_fin_campagne: r.date_fin_campagne,
          statut: r.statut,
          notes: r.notes,
          date_expiration: r.date_expiration,

          // ✅ Prix location (USD)
          prix_location: loc,
          // ✅ Prix impression (USD) — constituera une colonne du tableau
          prix_impression: imp,
          // ✅ Total = loc + imp
          total_reservation: loc + imp,

          devise: 'USD',

          lignes: r.lignes.map(l => ({
            id_ligne: l.id_ligne,
            id_face: l.id_face,
            id_panneau: l.id_panneau,
            orientation: l.orientation,
            type_face: l.type_face,
            statut_diffusion: l.statut_diffusion,
            date_debut: l.date_debut,
            date_fin: l.date_fin,
            panneau: {
              id: l.panneau?.id,
              nom: l.panneau?.nom,
              adresse: l.panneau?.adresse,
            },
          })),
        };
      });

      localStorage.setItem('proformat_selected_reservations', JSON.stringify(factureData));
      localStorage.setItem('proformat_client_nom', clientIds[0] || '');
      localStorage.setItem('proformat_devise', 'USD');
      localStorage.setItem('proformat_devises_utilisees', 'USD');

      // Totaux (tout en USD)
      localStorage.setItem('proformat_total_location_usd', String(totaux.totalLoc));
      localStorage.setItem('proformat_total_impression_usd', String(totaux.totalImp));
      localStorage.setItem('proformat_total_general_usd', String(totaux.totalGeneral));

      // Compatibilité avec l'ancien code (au cas où)
      localStorage.setItem('proformat_total_usd', String(totaux.totalGeneral));
      localStorage.setItem('proformat_total_cdf', '0');

      router.push('/dashboard/commercial/proformat/preview');
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de la préparation du proformat');
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (d: string | null) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return d; }
  };

  const formatUSD = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getExpirationBadge = (j: number | null) => {
    if (j === null) return { color: 'bg-gray-100 text-gray-600', label: '—' };
    if (j < 0) return { color: 'bg-red-100 text-red-700', label: 'Expiré' };
    if (j <= 3) return { color: 'bg-red-100 text-red-700 animate-pulse', label: `${j}j` };
    if (j <= 7) return { color: 'bg-amber-100 text-amber-700', label: `${j}j` };
    return { color: 'bg-green-100 text-green-700', label: `${j}j` };
  };

  const getClientInfo = () => {
    const selected = reservations.filter(r => selectedIds.includes(r.id_reservation));
    if (selected.length === 0) return null;
    const clients = [...new Set(selected.map(r => r.client?.nom))];
    if (clients.length > 1) return { type: 'multiple', count: clients.length };
    return { type: 'unique', client: clients[0] };
  };

  const clientInfo = getClientInfo();
  const prixManquants = verifierPrix();
  const totaux = totauxGlobaux();

  // ============================================
  // RENDU
  // ============================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-sm text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-3 bg-white rounded-xl border-2 border-red-200">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-bold text-sm break-words">{error}</p>
        <button onClick={fetchPendingReservations}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700">
          Réessayer
        </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16 px-3 bg-white rounded-xl border-2 border-gray-200">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-gray-500 font-bold text-base">Aucune réservation en attente</p>
        <p className="text-gray-400 text-xs mt-1">Toutes vos réservations sont facturées ou validées</p>
        <button onClick={fetchPendingReservations}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 mx-auto">
          <RefreshCw size={16} /> Rafraîchir
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-2 sm:p-3 lg:p-4 xl:p-6 2xl:p-8 w-full max-w-full overflow-x-hidden">

      {/* ===== EN-TÊTE ===== */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <h3 className="text-sm sm:text-base lg:text-lg 2xl:text-xl font-bold text-gray-800">
            📋 Réservations en attente
          </h3>
          <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs 2xl:text-sm font-bold">
            {reservations.length}
          </span>
          {selectedIds.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-500 text-white rounded-full text-[10px] sm:text-xs 2xl:text-sm font-bold">
              {selectedIds.length} sélectionnée(s)
            </span>
          )}
          {prixManquants.length > 0 && selectedIds.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] sm:text-xs 2xl:text-sm font-bold animate-pulse">
              ⚠️ {prixManquants.length}
            </span>
          )}
          <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] sm:text-xs 2xl:text-sm font-bold">
            💵 USD
          </span>
        </div>
        <button onClick={fetchPendingReservations}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-1.5 w-full sm:w-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Rafraîchir
        </button>
      </div>

      {/* ===== RÉSUMÉ TOTAUX ===== */}
      {selectedIds.length > 0 && (
        <div className="bg-white rounded-lg p-2 sm:p-3 mb-3 border-l-4 border-blue-500 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm 2xl:text-base">
            <div className="flex items-center justify-between gap-2 bg-blue-50 rounded-md px-2 py-1.5">
              <span className="font-bold text-blue-700">📺 Location</span>
              <span className="font-bold text-blue-800">${formatUSD(totaux.totalLoc)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-purple-50 rounded-md px-2 py-1.5">
              <span className="font-bold text-purple-700">🖨️ Impression</span>
              <span className="font-bold text-purple-800">${formatUSD(totaux.totalImp)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md px-2 py-1.5">
              <span className="font-bold flex items-center gap-1">
                <TrendingUp size={14} /> TOTAL
              </span>
              <span className="font-bold">${formatUSD(totaux.totalGeneral)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== BARRE D'ACTIONS ===== */}
      <div className="bg-white rounded-lg p-2 sm:p-3 mb-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-blue-600">
            {selectAll ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectAll ? 'Aucun' : 'Tout'}</span>
          </button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs sm:text-sm text-gray-600">
            {selectedIds.length} sélectionnée(s)
          </span>
          {clientInfo?.type === 'multiple' && (
            <span className="text-xs text-red-500 font-bold">⚠️ {clientInfo.count} clients</span>
          )}
          {clientInfo?.type === 'unique' && selectedIds.length > 0 && (
            <span className="text-xs text-green-600 truncate">👤 {clientInfo.client}</span>
          )}
        </div>
        <button onClick={creerFacture}
          disabled={selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0}
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition w-full sm:w-auto ${
            selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <FileText size={14} />
          Créer proformat
        </button>
      </div>

      {/* ===== LISTE COMPACTE ===== */}
      <div className="space-y-1.5 sm:space-y-2">
        {reservations.map((reservation, idx) => {
          const expiration = getExpirationBadge(reservation.jours_restants);
          const panneauNom = reservation.lignes[0]?.panneau?.nom || 'Panneau';
          const faceOrientation = reservation.lignes[0]?.orientation || 'N/A';
          const isSelected = selectedIds.includes(reservation.id_reservation);

          const loc = prixLocation[reservation.id_reservation] || '';
          const imp = prixImpression[reservation.id_reservation] || '';
          const isLocValide = loc && parseFloat(loc) > 0;
          const total = totalReservation(reservation.id_reservation);

          return (
            <motion.div
              key={reservation.id_reservation}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className={`bg-white rounded-lg border-2 transition-all ${
                isSelected ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:border-amber-300'
              }`}
            >
              <div className="p-2 sm:p-2.5 lg:p-3">
                {/* LIGNE 1 : CHECKBOX + INFOS */}
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleSelection(reservation.id_reservation)}
                    className="pt-0.5 focus:outline-none shrink-0">
                    {isSelected
                      ? <CheckSquare size={18} className="text-blue-600" />
                      : <Square size={18} className="text-gray-400 hover:text-gray-600" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                      <span className="font-bold text-gray-800 text-xs sm:text-sm 2xl:text-base break-all">
                        {reservation.numero_commande || 'N/A'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] 2xl:text-xs font-bold whitespace-nowrap ${expiration.color}`}>
                        {expiration.label}
                      </span>
                      <span className="hidden sm:inline text-[10px] 2xl:text-xs text-gray-400 truncate">
                        {reservation.statut}
                      </span>
                      {isSelected && isLocValide && (
                        <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-[9px] sm:text-[10px] font-bold">✓</span>
                      )}
                      {isSelected && !isLocValide && (
                        <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[9px] sm:text-[10px] font-bold animate-pulse">
                          Prix requis
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] sm:text-[11px] 2xl:text-xs text-gray-500">
                      <span className="flex items-center gap-0.5 truncate max-w-[200px] sm:max-w-[300px]">
                        <Building2 size={10} className="shrink-0" />
                        {panneauNom} · {faceOrientation}
                      </span>
                      <span className="flex items-center gap-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                        <User size={10} className="shrink-0" />
                        {reservation.client?.nom || 'Client'}
                      </span>
                      <span className="hidden md:flex items-center gap-0.5">
                        <Calendar size={10} className="shrink-0" />
                        {formatDate(reservation.date_debut_campagne)}→{formatDate(reservation.date_fin_campagne)}
                      </span>
                      <span className="hidden lg:flex items-center gap-0.5">
                        <Clock size={10} className="shrink-0" />
                        {formatDate(reservation.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* LIGNE 2 : SAISIE PRIX (LOC + IMP + TOTAL) */}
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2">

                  {/* Prix Location */}
                  <div className="sm:col-span-4 flex items-center gap-1 bg-blue-50/50 border border-blue-200 rounded-md p-1 sm:p-1.5">
                    <span className="text-[9px] sm:text-[10px] 2xl:text-xs font-bold text-blue-700 uppercase whitespace-nowrap px-0.5">
                      📺 Loc.
                    </span>
                    <input
                      type="number"
                      className={`flex-1 min-w-0 w-full p-1 sm:p-1.5 border rounded text-right font-bold text-[11px] sm:text-xs 2xl:text-sm ${
                        isSelected
                          ? isLocValide
                            ? 'border-green-400 bg-white text-green-700'
                            : 'border-red-300 bg-white text-red-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                      value={loc}
                      onChange={(e) => isSelected && updatePrixLocation(reservation.id_reservation, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      min="0" step="10" placeholder="0.00"
                      disabled={!isSelected}
                    />
                    <span className="text-[11px] sm:text-xs 2xl:text-sm font-bold text-blue-700 px-1">$</span>
                  </div>

                  {/* Prix Impression */}
                  <div className="sm:col-span-4 flex items-center gap-1 bg-purple-50/50 border border-purple-200 rounded-md p-1 sm:p-1.5">
                    <span className="text-[9px] sm:text-[10px] 2xl:text-xs font-bold text-purple-700 uppercase whitespace-nowrap px-0.5">
                      🖨️ Imp.
                    </span>
                    <input
                      type="number"
                      className={`flex-1 min-w-0 w-full p-1 sm:p-1.5 border rounded text-right font-bold text-[11px] sm:text-xs 2xl:text-sm ${
                        isSelected
                          ? (imp && parseFloat(imp) > 0)
                            ? 'border-green-400 bg-white text-green-700'
                            : 'border-purple-300 bg-white text-purple-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                      value={imp}
                      onChange={(e) => isSelected && updatePrixImpression(reservation.id_reservation, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      min="0" step="10" placeholder="0.00"
                      disabled={!isSelected}
                    />
                    <span className="text-[11px] sm:text-xs 2xl:text-sm font-bold text-purple-700 px-1">$</span>
                  </div>

                  {/* Total réservation */}
                  <div className="sm:col-span-4 flex items-center justify-between gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md p-1 sm:p-1.5 px-2 sm:px-3">
                    <span className="text-[9px] sm:text-[10px] 2xl:text-xs font-bold uppercase whitespace-nowrap">
                      Total
                    </span>
                    <span className="font-bold text-[11px] sm:text-xs 2xl:text-sm whitespace-nowrap">
                      ${formatUSD(total)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ===== BARRE D'ACTIONS BAS ===== */}
      <div className="mt-3 bg-white rounded-lg p-2 sm:p-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-blue-600">
            {selectAll ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{selectAll ? 'Aucun' : 'Tout'}</span>
          </button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs sm:text-sm text-gray-600">
            {selectedIds.length} sélectionnée(s)
          </span>
          {selectedIds.length > 0 && (
            <span className="text-xs sm:text-sm font-bold text-blue-700">
              Total : ${formatUSD(totaux.totalGeneral)}
            </span>
          )}
        </div>
        <button onClick={creerFacture}
          disabled={selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0}
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition w-full sm:w-auto ${
            selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <FileText size={14} />
          Générer le proformat ({selectedIds.length})
        </button>
      </div>
    </div>
  );
}