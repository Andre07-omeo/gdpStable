'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/ReservationModal.tsximport { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Loader2, Search, Calendar, Check, AlertCircle,
  User, Phone, Clock, FileText, Building2, AlertTriangle,
  ChevronLeft, ChevronRight, Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  face: any;
  panneau: any;
  user: any;
  onSuccess: () => void;
}

interface Client {
  id_client: number;
  raison_sociale: string;
  telephone: string;
}

interface ExpirationInfo {
  dateCreation: string;
  dateExpiration: string;
  expirationISO: string;
  heuresEffectives: number;
  joursOuvrables: boolean;
  expirationMySQL?: string;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export function ReservationModal({ isOpen, onClose, face, panneau, user, onSuccess }: ReservationModalProps) {
  // ============================================
  // ÉTATS
  // ============================================
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Client
  const [searchClient, setSearchClient] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clientPhone, setClientPhone] = useState('');
  const [showPhoneField, setShowPhoneField] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dates
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // Confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expirationInfo, setExpirationInfo] = useState<ExpirationInfo | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // ============================================
  // CONSTANTES
  // ============================================
  const MIN_DATE = new Date().toISOString().split('T')[0];

  // ============================================
  // FERMETURE DU DROPDOWN
  // ============================================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================
  // RECHERCHE CLIENTS
  // ============================================
  const searchClients = useCallback(async (query: string) => {
    if (query.length < 1) {
      setClients([]);
      setShowDropdown(false);
      return;
    }

    try {
      const res = await fetch(`/api/commercials/clients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Erreur recherche clients:', error);
    }
  }, []);

  // Debounce pour la recherche
  useEffect(() => {
    if (searchClient.length > 0) {
      const timer = setTimeout(() => searchClients(searchClient), 300);
      return () => clearTimeout(timer);
    } else {
      setClients([]);
      setShowDropdown(false);
      setShowPhoneField(false);
      setClientPhone('');
    }
  }, [searchClient, searchClients]);

  // ============================================
  // SÉLECTION D'UN CLIENT
  // ============================================
  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchClient(client.raison_sociale);
    setShowDropdown(false);
    setShowPhoneField(false);
    setClientPhone(client.telephone || '');
    setError(null);
  };

  // ============================================
  // GESTION DU CHANGEMENT DE SAISIE CLIENT
  // ============================================
  const handleClientInputChange = (value: string) => {
    setSearchClient(value);
    setSelectedClient(null);
    setError(null);

    if (value.length > 0) {
      const exactMatch = clients.find(c =>
        c.raison_sociale.toLowerCase() === value.toLowerCase()
      );

      if (exactMatch) {
        selectClient(exactMatch);
        return;
      }

      const hasResults = clients.some(c =>
        c.raison_sociale.toLowerCase().includes(value.toLowerCase())
      );

      if (!hasResults && value.length > 1) {
        setShowPhoneField(true);
      } else {
        setShowPhoneField(false);
      }
    } else {
      setShowPhoneField(false);
      setClientPhone('');
    }
  };

  // ============================================
  // CRÉATION AUTOMATIQUE DU CLIENT
  // ============================================
  const createClient = async (name: string, phone: string) => {
    setIsCreatingClient(true);
    setError(null);

    try {
      const res = await fetch('/api/commercials/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raison_sociale: name.trim(),
          telephone: phone.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const client: Client = {
          id_client: data.id_client,
          raison_sociale: name.trim(),
          telephone: phone.trim()
        };
        setSelectedClient(client);
        setSearchClient(client.raison_sociale);
        setClients([]);
        setShowDropdown(false);
        setShowPhoneField(false);
        setClientPhone('');
        setError(null);
        setIsCreatingClient(false);
        return client;
      } else {
        setError(data.error || 'Erreur lors de la création du client');
        setIsCreatingClient(false);
        return null;
      }
    } catch (error) {
      setError('Erreur lors de la création du client');
      setIsCreatingClient(false);
      return null;
    }
  };

  // ============================================
  // VALIDATION DES DATES
  // ============================================
  const validateDates = (debut: string, fin: string): boolean => {
    if (!debut || !fin) {
      setDateError('Veuillez sélectionner les dates');
      return false;
    }

    const d = new Date(debut);
    const f = new Date(fin);

    if (d >= f) {
      setDateError('La date de début doit être avant la date de fin');
      return false;
    }

    setDateError(null);
    return true;
  };

  // ============================================
  // CALCUL DE L'EXPIRATION
  // ============================================
  const calculateExpiration = async () => {
    try {
      const now = new Date();
      const res = await fetch('/api/commercials/reservations/calculate-expiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateCreation: now.toISOString() })
      });
      const data = await res.json();
      if (data.success) {
        setExpirationInfo(data);
        return true;
      }
      return false;
    } catch (error) {
      setError('Erreur lors du calcul de l\'expiration');
      return false;
    }
  };

  // ============================================
  // OUVERTURE DE LA CONFIRMATION (BOÎTE DE DIALOGUE)
  // ============================================
  const openConfirmation = async () => {
    if (!selectedClient) {
      setError('Veuillez sélectionner un client');
      return;
    }
    if (!validateDates(dateDebut, dateFin)) {
      return;
    }

    const success = await calculateExpiration();
    if (success) {
      setShowConfirmation(true); // ✅ Ouvre la boîte de dialogue de confirmation
      setError(null);
    }
  };

  // ============================================
  // CONFIRMATION FINALE DE LA RÉSERVATION
  // ============================================
  const confirmReservation = async () => {
    setIsConfirming(true);
    setError(null);

    try {
      const userId = user?.id_user || user?.id || user?.userId || null;

      if (!userId) {
        setError('Utilisateur non identifié. Veuillez vous reconnecter.');
        setIsConfirming(false);
        return;
      }

      // ✅ 1. Calculer l'expiration
      const now = new Date();
      const expRes = await fetch('/api/commercials/reservations/calculate-expiration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateCreation: now.toISOString() })
      });
      const expData = await expRes.json();

      if (!expData.success) {
        setError('Erreur lors du calcul de l\'expiration');
        setIsConfirming(false);
        return;
      }

      // ✅ 2. Créer la réservation avec la date d'expiration
      const data = {
        id_face: face.id_face || face.id,
        id_client: selectedClient!.id_client,
        id_commercial: userId,
        date_debut: dateDebut,
        date_fin: dateFin,
        prix_vente_net: 0,
        notes: '',
        date_expiration: expData.expirationMySQL
      };

      const res = await fetch('/api/commercials/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        setSuccess('✅ Réservation créée avec succès !');
        setShowConfirmation(false);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        if (result.error?.includes('chevauchement')) {
          setError('⚠️ Cette période est déjà réservée pour cette face');
        } else {
          setError(result.error || 'Erreur lors de la réservation');
        }
        setShowConfirmation(false);
      }
    } catch (error) {
      setError('Erreur lors de la réservation');
      setShowConfirmation(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setExpirationInfo(null);
  };

  // ============================================
  // SOUMISSION
  // ============================================
  const handleSubmit = async () => {
    if (!selectedClient && !searchClient.trim()) {
      setError('Veuillez sélectionner ou saisir un client');
      return;
    }

    let clientId = selectedClient?.id_client;
    if (!clientId && searchClient.trim()) {
      const newClient = await createClient(searchClient, clientPhone);
      if (!newClient) {
        return;
      }
      clientId = newClient.id_client;
    }

    if (!clientId) {
      setError('Veuillez sélectionner un client');
      return;
    }

    if (!validateDates(dateDebut, dateFin)) {
      return;
    }

    // ✅ Ouvre la boîte de dialogue de confirmation
    await openConfirmation();
  };

  // ============================================
  // RENDU - MODAL DE CONFIRMATION (BOÎTE DE DIALOGUE)
  // ============================================
  const renderConfirmationModal = () => (
    <AnimatePresence>
      {showConfirmation && expirationInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeConfirmation}
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-400/20 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">📋 Confirmation de réservation</h3>
                    <p className="text-sm text-amber-200">Vérifiez toutes les informations avant de valider</p>
                  </div>
                </div>
                <button
                  onClick={closeConfirmation}
                  className="p-2 bg-white/20 hover:bg-red-500/80 rounded-xl transition text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body - Informations à vérifier */}
            <div className="p-6 space-y-4">
              
              {/* ⚠️ AVERTISSEMENT D'EXPIRATION */}
              <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-xl p-4 border-2 border-red-700 shadow-lg animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-300 animate-pulse" />
                      ⚠️ ATTENTION - EXPIRATION AUTOMATIQUE
                    </p>
                    <p className="text-sm text-white/90 mt-1 font-semibold">
                      Cette réservation sera <span className="text-yellow-300 font-bold">automatiquement annulée</span> si le paiement n'est pas effectué dans les
                      <span className="text-yellow-300 font-bold text-lg mx-1">72 heures</span> ouvrables
                    </p>
                    <div className="mt-2 p-3 bg-black/30 rounded-xl border border-white/20">
                      <p className="text-xs text-white/80">📅 Créée le : {expirationInfo.dateCreation}</p>
                      <p className="text-xs font-bold text-yellow-300 text-lg">
                        ⏰ Expire le : {expirationInfo.dateExpiration}
                      </p>
                    </div>
                    <p className="text-[10px] text-white/60 mt-1">
                      * Les week-ends (samedi & dimanche) ne sont pas comptés dans le délai de 72h
                    </p>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">👤 Client</p>
                <p className="text-lg font-bold text-gray-800">{selectedClient?.raison_sociale}</p>
                {selectedClient?.telephone && (
                  <p className="text-sm text-gray-600">📞 {selectedClient.telephone}</p>
                )}
              </div>

              {/* Commercial */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">💼 Commercial</p>
                <p className="text-lg font-bold text-blue-800">
                  {user?.nom} {user?.prenom}
                </p>
                <p className="text-sm text-blue-600">{user?.email}</p>
              </div>

              {/* Panneau / Face */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">📌 Panneau</p>
                  <p className="text-sm font-bold text-gray-800">{panneau?.nom || 'N/A'}</p>
                  <p className="text-xs text-gray-400">{panneau?.adresse}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">🔄 Face</p>
                  <p className="text-sm font-bold text-gray-800">Orientation: {face?.orientation || 'N/A'}</p>
                  <p className="text-xs text-gray-400">ID: {face?.id_face || face?.id || 'N/A'}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Début
                  </p>
                  <p className="text-sm font-bold text-emerald-800">
                    {new Date(dateDebut).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fin
                  </p>
                  <p className="text-sm font-bold text-amber-800">
                    {new Date(dateFin).toLocaleDateString('fr-FR', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Durée */}
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                <span className="text-sm text-blue-800">
                  📆 Durée: <strong>
                    {Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24))}
                  </strong> jours
                </span>
              </div>
            </div>

            {/* Footer - Boutons d'action */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 sticky bottom-0">
              <button
                onClick={closeConfirmation}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                🔙 Retour
              </button>
              <button
                onClick={confirmReservation}
                disabled={isConfirming}
                className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                  isConfirming
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg'
                }`}
              >
                {isConfirming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {isConfirming ? 'Traitement...' : '✅ Confirmer la réservation'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal principale */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-4 md:inset-8 lg:inset-16 z-[301] bg-white rounded-2xl shadow-2xl flex flex-col max-w-2xl mx-auto border border-white/20 max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">📝 Réservation</p>
              <h2 className="text-xl font-bold text-white">Nouvelle réservation</h2>
              <p className="text-sm text-emerald-200">
                {panneau?.nom || 'Panneau'} - Face {face?.orientation || 'N/A'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Formulaire */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client */}
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1.5">
              Client *
              {selectedClient && (
                <span className="ml-2 text-xs text-emerald-600 font-normal">
                  ✅ {selectedClient.raison_sociale}
                </span>
              )}
            </label>

            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tapez le nom du client..."
                  className={`w-full px-4 py-2.5 bg-white rounded-xl border-2 outline-none transition pr-10 ${
                    error && !selectedClient
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                  value={searchClient}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleClientInputChange(e.target.value)}
                  onFocus={() => {
                    if (searchClient.length > 0 && clients.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                />
                <Search className="absolute right-3 top-2.5 text-gray-400 w-5 h-5" />
                {isCreatingClient && (
                  <Loader2 className="absolute right-3 top-2.5 text-emerald-500 w-5 h-5 animate-spin" />
                )}
              </div>

              {showDropdown && clients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-xl border-2 border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                  {clients.map((client) => (
                    <button
                      key={client.id_client}
                      onClick={() => selectClient(client)}
                      className="w-full px-4 py-2 text-left hover:bg-emerald-50 transition flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium">{client.raison_sociale}</span>
                        {client.telephone && (
                          <span className="text-xs text-gray-400 ml-2">{client.telephone}</span>
                        )}
                      </div>
                      {selectedClient?.id_client === client.id_client && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchClient.length > 0 && !selectedClient && clients.length === 0 && !isCreatingClient && (
                <div className="mt-2 space-y-2">
                  <div className="text-sm text-blue-600 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Le client "{searchClient}" sera créé automatiquement</span>
                  </div>

                  {showPhoneField && (
                    <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <input
                        type="text"
                        placeholder="Téléphone (optionnel)"
                        className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition text-sm"
                        value={clientPhone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClientPhone(e.target.value)}
                      />
                      <span className="text-xs text-gray-400">Optionnel</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && !selectedClient && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>

          {/* Dates */}
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1.5">
              Période de la campagne *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="date"
                  className={`w-full px-4 py-2.5 bg-white rounded-xl border-2 outline-none transition ${
                    dateError
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                  value={dateDebut}
                  min={MIN_DATE}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setDateDebut(e.target.value);
                    if (dateError) validateDates(e.target.value, dateFin);
                  }}
                  onBlur={() => {
                    if (dateDebut && dateFin) validateDates(dateDebut, dateFin);
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">Date de début</p>
              </div>
              <div>
                <input
                  type="date"
                  className={`w-full px-4 py-2.5 bg-white rounded-xl border-2 outline-none transition ${
                    dateError
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400'
                  }`}
                  value={dateFin}
                  min={dateDebut || MIN_DATE}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setDateFin(e.target.value);
                    if (dateError) validateDates(dateDebut, e.target.value);
                  }}
                  onBlur={() => {
                    if (dateDebut && dateFin) validateDates(dateDebut, dateFin);
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">Date de fin</p>
              </div>
            </div>

            {dateDebut && dateFin && !dateError && (
              <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  Durée: <strong>
                    {Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / (1000 * 60 * 60 * 24))}
                  </strong> jours
                </span>
              </div>
            )}

            {dateError && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {dateError}
              </p>
            )}
          </div>

          {success && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-700 text-sm">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && selectedClient && !dateError && (
            <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
          >
            ❌ Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || loading || !searchClient.trim()}
            className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
              isSubmitting || loading || !searchClient.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg'
            }`}
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
            {isSubmitting ? 'Traitement...' : '📝 Vérifier et réserver'}
          </button>
        </div>
      </motion.div>

      {/* ✅ MODAL DE CONFIRMATION (BOÎTE DE DIALOGUE) */}
      {renderConfirmationModal()}
    </>
  );
}