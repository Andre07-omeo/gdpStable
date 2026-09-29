'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/PendingReservationsTab.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Calendar, Building2, User,
  Loader2, RefreshCw, Eye, CheckSquare, Square,
  FileText, Printer
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
  client: {
    nom: string;
    email: string;
    telephone: string;
  };
  commercial: {
    nom: string;
    prenom: string;
    email: string;
  };
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
    panneau: {
      id: number;
      nom: string;
      adresse: string;
    };
  }[];
}

interface PendingReservationsTabProps {
  user: any;
}

type Devise = 'CDF' | 'USD' | '';

// ✅ Helper : lecture sûre de localStorage (retourne '' si indisponible)
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
  const [prixSaisis, setPrixSaisis] = useState<Record<number, string>>({});
  const [devisesSaisies, setDevisesSaisies] = useState<Record<number, Devise>>({});

  // ✅ Récupérer l'utilisateur depuis localStorage
  const getUserFromStorage = () => {
    try {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (savedUser) {
        return JSON.parse(savedUser);
      }

      const nom = safeGetItem('user_nom');
      const prenom = safeGetItem('user_prenom');
      const email = safeGetItem('user_email');
      const profil = safeGetItem('user_profil');

      if (nom || prenom || email) {
        return { nom, prenom, email, profil };
      }

      return null;
    } catch (e) {
      console.error('Erreur récupération utilisateur:', e);
      return null;
    }
  };

  // ✅ Nom complet
  const getUserNameFromStorage = (): string => {
    const nomComplet = safeGetItem('user_nom_complet');
    if (nomComplet && nomComplet.trim() !== '') {
      return nomComplet;
    }

    const user = getUserFromStorage();
    if (user) {
      if (user.prenom && user.nom) {
        return `${user.prenom} ${user.nom}`.trim();
      }
      if (user.nom) return user.nom;
    }

    return 'Commercial';
  };

  // ✅ Email
  const getUserEmailFromStorage = (): string => {
    const email = safeGetItem('user_email');
    if (email) return email;

    const user = getUserFromStorage();
    if (user && user.email) return user.email;

    return '';
  };

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
        const prixInit: Record<number, string> = {};
        const devisesInit: Record<number, Devise> = {};
        data.data.forEach((r: PendingReservation) => {
          prixInit[r.id_reservation] = '';
          devisesInit[r.id_reservation] = '';
        });
        setPrixSaisis(prixInit);
        setDevisesSaisies(devisesInit);
        console.log(`📊 ${data.total} réservations en attente chargées`);
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

  useEffect(() => {
    fetchPendingReservations();
  }, []);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reservations.map(r => r.id_reservation));
    }
    setSelectAll(!selectAll);
  };

  const updatePrix = (id: number, valeur: string) => {
    setPrixSaisis(prev => ({ ...prev, [id]: valeur }));
  };

  const updateDevise = (id: number, valeur: 'CDF' | 'USD') => {
    setDevisesSaisies(prev => ({ ...prev, [id]: valeur }));
  };

  const verifierPrix = () => {
    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    const prixManquants: number[] = [];

    for (const r of selectedReservations) {
      const prix = prixSaisis[r.id_reservation] || '';
      const devise = devisesSaisies[r.id_reservation] || '';
      if (!prix || parseFloat(prix) <= 0 || !devise) {
        prixManquants.push(r.id_reservation);
      }
    }

    return prixManquants;
  };

  // ✅ Lister les devises utilisées (info, plus un blocage)
  const listerDevisesUtilisees = (): string[] => {
    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    return [...new Set(
      selectedReservations
        .map(r => devisesSaisies[r.id_reservation])
        .filter(d => d === 'CDF' || d === 'USD')
    )].sort();
  };

  // ✅ Calcul des totaux séparés par devise
  const calculerTotauxParDevise = () => {
    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    let totalCDF = 0;
    let totalUSD = 0;

    for (const r of selectedReservations) {
      const prix = parseFloat(prixSaisis[r.id_reservation] || '0') || 0;
      const devise = devisesSaisies[r.id_reservation];
      if (devise === 'USD') totalUSD += prix;
      else if (devise === 'CDF') totalCDF += prix;
    }

    return { totalCDF, totalUSD };
  };

  // ============================================
  // ✅ CRÉER UN PROFORMAT (multi-devises autorisé)
  // ============================================
  const creerFacture = async () => {
    if (selectedIds.length === 0) {
      alert('Veuillez sélectionner au moins une réservation');
      return;
    }

    const userData = getUserFromStorage();
    const nomComplet = getUserNameFromStorage();
    const emailCommercial = getUserEmailFromStorage();

    const nom = userData?.nom || safeGetItem('user_nom');
    const prenom = userData?.prenom || safeGetItem('user_prenom');
    const email = emailCommercial || userData?.email || '';

    console.log('📋 Données utilisateur depuis localStorage:', {
      nom, prenom, email, nomComplet, userData,
    });

    if (!nom || !prenom) {
      alert(
        '⚠️ Impossible de créer le proformat :\n\n' +
        'Vos informations personnelles (nom et prénom) sont incomplètes.\n\n' +
        'Veuillez vous déconnecter et vous reconnecter.\n' +
        "Si le problème persiste, contactez l'administrateur."
      );
      return;
    }

    if (!email) {
      alert(
        '⚠️ Impossible de créer le proformat :\n\n' +
        'Votre adresse email est manquante.\n\n' +
        'Veuillez vous déconnecter et vous reconnecter.\n' +
        "Si le problème persiste, contactez l'administrateur."
      );
      return;
    }

    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    const clientIds = [...new Set(selectedReservations.map(r => r.client?.nom))];

    if (clientIds.length > 1) {
      alert(
        '⚠️ Vous ne pouvez pas créer une facture avec plusieurs clients !\n' +
        'Les clients concernés : ' + clientIds.join(', ')
      );
      return;
    }

    const prixManquants = verifierPrix();
    if (prixManquants.length > 0) {
      const commandes = prixManquants.map(id => {
        const r = reservations.find(res => res.id_reservation === id);
        const prix = prixSaisis[id] || '';
        const devise = devisesSaisies[id] || '';
        let raison = '';
        if (!prix || parseFloat(prix) <= 0) raison = 'prix manquant';
        if (!devise) raison = raison ? `${raison} + devise manquante` : 'devise manquante';
        return `- ${r?.numero_commande || id} : ${raison}`;
      });
      alert(`⚠️ Veuillez compléter les informations suivantes :\n\n${commandes.join('\n')}`);
      return;
    }

    // ✅ Multi-devises AUTORISÉ — on collecte juste les infos
    const devisesUtilisees = listerDevisesUtilisees();
    const deviseProformat = devisesUtilisees.length === 1 ? devisesUtilisees[0] : 'MULTI';
    const { totalCDF, totalUSD } = calculerTotauxParDevise();

    const nomCompletFinal = `${prenom} ${nom}`.trim();

    try {
      const factureData = selectedReservations.map(r => ({
        id_reservation: r.id_reservation,
        numero_commande: r.numero_commande,
        id_client: r.client?.nom,
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
        prix_saisi: parseFloat(prixSaisis[r.id_reservation] || '0'),
        devise: devisesSaisies[r.id_reservation] || 'CDF',
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
      }));

      localStorage.setItem('proformat_selected_reservations', JSON.stringify(factureData));
      localStorage.setItem('proformat_client_nom', clientIds[0] || '');
      localStorage.setItem('proformat_devise', deviseProformat);
      localStorage.setItem('proformat_devises_utilisees', devisesUtilisees.join(','));
      localStorage.setItem('proformat_total_cdf', String(totalCDF));
      localStorage.setItem('proformat_total_usd', String(totalUSD));

      router.push('/dashboard/commercial/proformat/preview');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la préparation du proformat');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getExpirationStatus = (joursRestants: number | null) => {
    if (joursRestants === null) return { color: 'text-gray-500', label: 'Non défini' };
    if (joursRestants < 0) return { color: 'text-red-600', label: '⚠️ Expiré' };
    if (joursRestants <= 3) return { color: 'text-red-500 animate-pulse', label: `⏳ ${joursRestants} jour(s)` };
    if (joursRestants <= 7) return { color: 'text-amber-500', label: `⏳ ${joursRestants} jour(s)` };
    return { color: 'text-green-600', label: `✅ ${joursRestants} jour(s)` };
  };

  const getClientInfo = () => {
    const selectedReservations = reservations.filter(r => selectedIds.includes(r.id_reservation));
    if (selectedReservations.length === 0) return null;

    const clients = [...new Set(selectedReservations.map(r => r.client?.nom))];
    if (clients.length > 1) {
      return { type: 'multiple', message: `⚠️ ${clients.length} clients différents sélectionnés` };
    }
    return {
      type: 'unique',
      client: clients[0] || 'Client inconnu',
      count: selectedReservations.length,
    };
  };

  const clientInfo = getClientInfo();
  const prixManquants = verifierPrix();
  const devisesUtilisees = listerDevisesUtilisees();
  const deviseMixte = devisesUtilisees.length > 1;
  const { totalCDF, totalUSD } = calculerTotauxParDevise();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="mt-4 text-gray-500 px-2 text-center">Chargement des réservations en attente...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 px-2 bg-white rounded-xl border-2 border-red-200">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-600 font-bold break-words">{error}</p>
        <button
          onClick={fetchPendingReservations}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16 px-2 bg-white rounded-xl border-2 border-gray-200">
        <div className="text-6xl mb-4">✅</div>
        <p className="text-gray-500 font-bold text-lg">Aucune réservation en attente</p>
        <p className="text-gray-400 text-sm mt-1">
          Toutes vos réservations ont été validées par la comptabilité
        </p>
        <button
          onClick={fetchPendingReservations}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={16} />
          Rafraîchir
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-2 sm:p-3 md:p-4 lg:p-6 2xl:p-8 w-full max-w-full overflow-x-hidden">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-800">
            📋 Réservations en attente
          </h3>
          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-amber-500 text-white rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
            {reservations.length} en attente
          </span>
          {selectedIds.length > 0 && (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500 text-white rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
              {selectedIds.length} sélectionnée(s)
            </span>
          )}
          {prixManquants.length > 0 && selectedIds.length > 0 && (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-bold animate-pulse whitespace-nowrap">
              ⚠️ {prixManquants.length} incomplet(s)
            </span>
          )}
          {deviseMixte && (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-500 text-white rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
              💱 Multi-devises : {devisesUtilisees.join(' + ')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPendingReservations}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden xs:inline sm:inline">Rafraîchir</span>
          </button>
        </div>
      </div>

      {/* Résumé totaux par devise (si sélection) */}
      {selectedIds.length > 0 && (
        <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm border-l-4 border-blue-500">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-bold text-gray-700">💰 Totaux :</span>
            {totalCDF > 0 && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-bold">
                CDF : {totalCDF.toLocaleString()} FC
              </span>
            )}
            {totalUSD > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-bold">
                USD : {totalUSD.toLocaleString()} $
              </span>
            )}
            {totalCDF === 0 && totalUSD === 0 && (
              <span className="text-xs text-gray-400">Aucun prix saisi</span>
            )}
          </div>
        </div>
      )}

      {/* Barre d'actions haut */}
      <div className="bg-white rounded-xl p-2 sm:p-3 md:p-4 mb-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition"
            >
              {selectAll ? <CheckSquare size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Square size={16} className="sm:w-[18px] sm:h-[18px]" />}
              <span className="whitespace-nowrap">
                {selectAll ? 'Tout désélectionner' : 'Tout sélectionner'}
              </span>
            </button>
            <span className="text-sm text-gray-400 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {selectedIds.length} sélectionnée(s)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {clientInfo && clientInfo.type === 'multiple' && (
              <span className="text-xs sm:text-sm text-red-500 font-bold break-words">
                {clientInfo.message}
              </span>
            )}
            {clientInfo && clientInfo.type === 'unique' && selectedIds.length > 0 && (
              <span className="text-xs sm:text-sm text-green-600 break-words">
                Client: <strong>{clientInfo.client}</strong> ({clientInfo.count})
              </span>
            )}
            <button
              onClick={creerFacture}
              disabled={selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0}
              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm transition w-full sm:w-auto ${selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
              Créer un proformat
            </button>
          </div>
        </div>
      </div>

      {/* Liste des réservations */}
      <div className="space-y-3 sm:space-y-4">
        {reservations.map((reservation, idx) => {
          const expiration = getExpirationStatus(reservation.jours_restants);
          const panneauNom = reservation.lignes[0]?.panneau?.nom || 'Panneau non spécifié';
          const faceOrientation = reservation.lignes[0]?.orientation || 'N/A';
          const isSelected = selectedIds.includes(reservation.id_reservation);
          const prix = prixSaisis[reservation.id_reservation] || '';
          const isPrixValide = prix && parseFloat(prix) > 0;
          const deviseResa = devisesSaisies[reservation.id_reservation] || '';
          const isDeviseValide = deviseResa === 'CDF' || deviseResa === 'USD';
          const isLigneComplete = isPrixValide && isDeviseValide;

          return (
            <motion.div
              key={reservation.id_reservation}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-xl border-2 transition-all overflow-hidden ${isSelected
                  ? 'border-blue-500 shadow-md shadow-blue-100'
                  : 'border-amber-200 hover:border-amber-400'
                }`}
            >
              <div className="p-2 sm:p-3 md:p-4">
                <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                  <div className="pt-1 shrink-0">
                    <button
                      onClick={() => toggleSelection(reservation.id_reservation)}
                      className="focus:outline-none"
                    >
                      {isSelected ? (
                        <CheckSquare size={20} className="sm:w-6 sm:h-6 text-blue-600" />
                      ) : (
                        <Square size={20} className="sm:w-6 sm:h-6 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3">
                          <h4 className="font-bold text-gray-800 text-sm sm:text-base md:text-lg break-all">
                            {reservation.numero_commande || 'N/A'}
                          </h4>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                            {reservation.statut || 'En attente'}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-bold whitespace-nowrap ${expiration.color}`}>
                            {expiration.label}
                          </span>
                          {isSelected && isLigneComplete && (
                            <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap">
                              ✅ Prix + Devise OK
                            </span>
                          )}
                          {isSelected && !isPrixValide && (
                            <span className="px-2 py-0.5 bg-red-500 text-white rounded-full text-[10px] sm:text-xs font-bold animate-pulse whitespace-nowrap">
                              ⚠️ Prix requis
                            </span>
                          )}
                          {isSelected && isPrixValide && !isDeviseValide && (
                            <span className="px-2 py-0.5 bg-orange-500 text-white rounded-full text-[10px] sm:text-xs font-bold animate-pulse whitespace-nowrap">
                              ⚠️ Devise requise
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                          <Building2 size={14} className="inline mr-1 shrink-0" />
                          {panneauNom} - Face {faceOrientation}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 break-words">
                          <User size={12} className="inline mr-1 shrink-0" />
                          {reservation.client?.nom || 'Client non spécifié'}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm text-gray-500 font-medium whitespace-nowrap">
                            Prix/mois:
                          </span>
                          <input
                            type="number"
                            className={`w-24 sm:w-28 p-1.5 sm:p-2 border-2 rounded-lg text-right font-bold text-xs sm:text-sm ${isSelected
                                ? isPrixValide
                                  ? 'border-green-400 bg-green-50 text-green-700'
                                  : 'border-red-400 bg-red-50 text-red-700'
                                : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            value={prix}
                            onChange={(e) => {
                              if (isSelected) {
                                updatePrix(reservation.id_reservation, e.target.value);
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            min="0"
                            step="100"
                            placeholder="Prix"
                            disabled={!isSelected}
                          />
                          <select
                            value={deviseResa}
                            onChange={(e) =>
                              updateDevise(reservation.id_reservation, e.target.value as 'CDF' | 'USD')
                            }
                            disabled={!isSelected}
                            className={`p-1.5 sm:p-2 border-2 rounded-lg text-xs sm:text-sm font-bold transition ${!isSelected
                                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                                : !isDeviseValide
                                  ? 'border-orange-400 bg-orange-50 text-orange-700 animate-pulse'
                                  : 'border-green-400 bg-green-50 text-green-700'
                              }`}
                            title={!isDeviseValide ? 'Devise obligatoire' : 'Devise sélectionnée'}
                          >
                            <option value="">Devise</option>
                            <option value="CDF">CDF (FC)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                        </div>
                        <button className="px-2 sm:px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] sm:text-xs font-bold transition flex items-center gap-1 justify-center whitespace-nowrap">
                          <Eye size={14} />
                          Détails
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 min-w-0">
                        <User size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate">{reservation.client?.nom || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 min-w-0">
                        <Calendar size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate">
                          {formatDate(reservation.date_debut_campagne)} → {formatDate(reservation.date_fin_campagne)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 min-w-0">
                        <Clock size={14} className="text-gray-400 shrink-0" />
                        <span className="truncate">Créée le {formatDate(reservation.created_at)}</span>
                      </div>
                    </div>

                    {reservation.notes && (
                      <div className="mt-3 text-[11px] sm:text-xs text-gray-500 bg-gray-50 p-2 rounded-lg break-words">
                        📝 {reservation.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Barre d'action bas */}
      <div className="mt-4 sm:mt-6 bg-white rounded-xl p-2 sm:p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition"
            >
              {selectAll ? <CheckSquare size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Square size={16} className="sm:w-[18px] sm:h-[18px]" />}
              <span className="whitespace-nowrap">
                {selectAll ? 'Tout désélectionner' : 'Tout sélectionner'}
              </span>
            </button>
            <span className="text-sm text-gray-400 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {selectedIds.length} sélectionnée(s)
            </span>
            {clientInfo && clientInfo.type === 'unique' && selectedIds.length > 0 && (
              <span className="text-xs sm:text-sm text-green-600 break-words">
                Client: <strong>{clientInfo.client}</strong>
              </span>
            )}
            {clientInfo && clientInfo.type === 'multiple' && (
              <span className="text-xs sm:text-sm text-red-500 font-bold animate-pulse break-words">
                ⚠️ {clientInfo.message} - Une facture ne peut avoir qu'un seul client !
              </span>
            )}
            {prixManquants.length > 0 && selectedIds.length > 0 && (
              <span className="text-xs sm:text-sm text-red-500 font-bold animate-pulse whitespace-nowrap">
                ⚠️ {prixManquants.length} incomplet(s)
              </span>
            )}
            {deviseMixte && (
              <span className="text-xs sm:text-sm text-blue-600 font-bold break-words">
                💱 Multi-devises : {devisesUtilisees.join(' + ')} — totaux séparés
              </span>
            )}
          </div>
          <button
            onClick={creerFacture}
            disabled={selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0}
            className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm transition w-full lg:w-auto ${selectedIds.length === 0 || clientInfo?.type === 'multiple' || prixManquants.length > 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
              }`}
          >
            <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
            Générer le proformat ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
}