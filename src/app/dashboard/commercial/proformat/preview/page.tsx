'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/proformat/preview/page.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Printer, ArrowLeft, FileText, Save, CheckCircle,
  Loader2, AlertCircle, XCircle,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface LigneProformat {
  id_ligne: number;
  id_face: number;
  id_panneau: number;
  orientation: string;
  type_face: string;
  statut_diffusion: string;
  date_debut: string;
  date_fin: string;
  prix_vente_net?: number;
  prix_location_ligne?: number;
  prix_impression_ligne?: number;
  total_ligne?: number;
  panneau: { id: number | null; nom: string; adresse: string };
}

interface ReservationProformat {
  id_reservation: number;
  numero_commande: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  date_debut_campagne: string;
  date_fin_campagne: string;

  // ✅ Nouveaux champs (format corrigé)
  prix_location?: number;
  prix_impression?: number;
  total_reservation?: number;

  // 🟡 Legacy (compat)
  prix_saisi?: number;

  devise: 'CDF' | 'USD' | string;

  commercial_nom: string;
  commercial_prenom: string;
  commercial_email: string;
  commercial_nom_complet: string;
  lignes: LigneProformat[];

  // ✅ Champs additionnels
  statut?: string;
  notes?: string;
  date_expiration?: string | null;
  photoCampagneUrl?: string | null;
  created_at?: string | null;
}

interface ProformatPayload {
  generated_at?: string;
  devise?: string;
  devise_principale?: string;
  devises_utilisees?: string[];
  client_nom?: string;
  commercial_nom_complet?: string;
  commercial_email?: string;
  reservations: ReservationProformat[];
  totaux?: {
    total_location_usd?: number;
    total_impression_usd?: number;
    total_general_usd?: number;
    total_usd?: number;
    total_cdf?: number;
  };
}

export default function ProformatPreviewPage() {
  const router = useRouter();
  const { getUserName, getUserEmail, user } = useAuth();

  const [reservations, setReservations] = useState<ReservationProformat[]>([]);
  const [clientNom, setClientNom] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // ✅ Totaux séparés (location / impression / général) + par devise
  const [totalLocationUSD, setTotalLocationUSD] = useState(0);
  const [totalImpressionUSD, setTotalImpressionUSD] = useState(0);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalCDF, setTotalCDF] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [devisesUtilisees, setDevisesUtilisees] = useState<string[]>(['USD']);
  const [deviseProformat, setDeviseProformat] = useState<'CDF' | 'USD' | 'MULTI'>('USD');

  const [commercialInfo, setCommercialInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    nomComplet: '',
  });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // ✅ Date de génération figée (évite les variations entre renders/print)
  const [dateGeneration, setDateGeneration] = useState<string>(
    new Date().toLocaleDateString('fr-FR')
  );

  // ✅ Numéro issu de la BD (prévisionnel puis définitif)
  const [numeroFacture, setNumeroFacture] = useState('Chargement...');
  const [numeroBD, setNumeroBD] = useState<string | null>(null);
  const [idFacture, setIdFacture] = useState<number | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  const hasPrintedRef = useRef(false);

  // ============================================
  // ZOOM responsive (avec compensation de hauteur)
  // ============================================
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setZoom(window.innerWidth / 850);
      } else {
        setZoom(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // HELPER : lecture brute
  // ============================================
  const lireLocalStorage = (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try { return localStorage.getItem(key); } catch { return null; }
  };

  // ============================================
  // CHARGEMENT (✅ nouveau format prioritaire, fallback legacy)
  // ============================================
  useEffect(() => {
    // ---- 1) Priorité : nouveau payload complet ----
    const rawData = lireLocalStorage('proformat_data');
    const legacyData = lireLocalStorage('proformat_selected_reservations');

    // Fallback sur client/devise legacy
    const clientLegacy = lireLocalStorage('proformat_client_nom');
    const deviseLegacy = lireLocalStorage('proformat_devise');

    let parsedReservations: ReservationProformat[] = [];
    let payloadMeta: ProformatPayload | null = null;

    if (rawData) {
      try {
        const payload = JSON.parse(rawData) as ProformatPayload;
        payloadMeta = payload;
        if (Array.isArray(payload.reservations)) {
          parsedReservations = payload.reservations;
        }
      } catch (e) {
        console.warn('proformat_data invalide, fallback legacy:', e);
      }
    }

    // Fallback legacy (si nouveau format absent ou vide)
    if (parsedReservations.length === 0 && legacyData) {
      try {
        const legacy = JSON.parse(legacyData);
        if (Array.isArray(legacy)) {
          // ✅ Migration à la volée : ancien format → nouveau
          parsedReservations = legacy.map((r: any) => ({
            ...r,
            prix_location:
              typeof r.prix_location === 'number'
                ? r.prix_location
                : Number(r.prix_saisi) || 0,
            prix_impression:
              typeof r.prix_impression === 'number' ? r.prix_impression : 0,
            total_reservation:
              typeof r.total_reservation === 'number'
                ? r.total_reservation
                : Number(r.prix_saisi) || 0,
            devise: r.devise || 'USD',
            lignes: Array.isArray(r.lignes) ? r.lignes : [],
          }));
        }
      } catch (e) {
        console.error('Erreur parsing legacy:', e);
      }
    }

    const clientNomFinal =
      payloadMeta?.client_nom || clientLegacy || parsedReservations[0]?.client_nom || '';
    const deviseFinale =
      payloadMeta?.devise ||
      deviseLegacy ||
      parsedReservations[0]?.devise ||
      'USD';

    if (parsedReservations.length === 0) {
      setError(
        'Aucune donnée trouvée. Veuillez sélectionner des réservations depuis la page commerciale.'
      );
      setLoading(false);
      return;
    }

    const first = parsedReservations[0];
    const nomCommercial = first.commercial_nom || '';
    const prenomCommercial = first.commercial_prenom || '';
    const emailCommercial = first.commercial_email || '';
    const nomCompletPayload =
      first.commercial_nom_complet ||
      `${prenomCommercial} ${nomCommercial}`.trim();

    const finalNomComplet = getUserName() || nomCompletPayload;
    const finalEmail = getUserEmail() || emailCommercial;

    setReservations(parsedReservations);
    setClientNom(clientNomFinal);
    setDateGeneration(new Date().toLocaleDateString('fr-FR'));

    setCommercialInfo({
      nom: nomCommercial,
      prenom: prenomCommercial,
      email: finalEmail,
      nomComplet: finalNomComplet,
    });

    // ---- 2) Calcul des totaux (location / impression / général) ----
    let locUSD = 0;
    let impUSD = 0;
    let sumCDF = 0;
    let sumUSD = 0;
    const devisesSet = new Set<string>();

    for (const r of parsedReservations) {
      const loc = Number(r.prix_location ?? r.prix_saisi ?? 0) || 0;
      const imp = Number(r.prix_impression ?? 0) || 0;
      const totalR = Number(r.total_reservation ?? loc + imp) || 0;

      const devise = (r.devise || 'USD').toUpperCase();
      devisesSet.add(devise === 'CDF' ? 'CDF' : 'USD');

      if (devise === 'USD') {
        locUSD += loc;
        impUSD += imp;
        sumUSD += totalR;
      } else {
        // CDF legacy : on stocke tel quel
        sumCDF += totalR;
      }
    }

    // ✅ Si le payload fournit des totaux explicites, on les utilise en priorité
    if (payloadMeta?.totaux) {
      const t = payloadMeta.totaux;
      if (typeof t.total_location_usd === 'number') locUSD = t.total_location_usd;
      if (typeof t.total_impression_usd === 'number') impUSD = t.total_impression_usd;
      if (typeof t.total_general_usd === 'number') sumUSD = t.total_general_usd;
      if (typeof t.total_cdf === 'number') sumCDF = t.total_cdf;
    }

    setTotalLocationUSD(locUSD);
    setTotalImpressionUSD(impUSD);
    setTotalCDF(sumCDF);
    setTotalUSD(sumUSD);
    setTotalGeneral(sumUSD + sumCDF);

    const devisesArr = Array.from(devisesSet).sort();
    if (devisesArr.length === 0) devisesArr.push('USD');
    setDevisesUtilisees(devisesArr);

    if (devisesArr.length === 1) {
      setDeviseProformat(devisesArr[0] as 'CDF' | 'USD');
    } else if (devisesArr.length > 1) {
      setDeviseProformat('MULTI');
    } else if (deviseFinale === 'CDF' || deviseFinale === 'USD') {
      setDeviseProformat(deviseFinale);
    } else {
      setDeviseProformat('USD');
    }

    // ---- 3) Numéro : définitif existant > API > placeholder ----
    const lastNumero = lireLocalStorage('last_facture_numero');
    const lastId = lireLocalStorage('last_facture_id');

    (async () => {
      try {
        const resp = await fetch('/api/facture/next-numero?prefix=PRO', {
          method: 'GET',
          credentials: 'include',
        });
        const res = await resp.json();
        if (res.success && res.numero) {
          setNumeroFacture(res.numero);
        } else if (lastNumero) {
          setNumeroFacture(lastNumero);
        } else {
          setNumeroFacture('PRO-XXXX-XXXXXX');
        }
        if (lastId) setIdFacture(Number(lastId) || null);
      } catch (e) {
        console.error('Erreur récupération numéro:', e);
        setNumeroFacture(lastNumero || 'PRO-XXXX-XXXXXX');
      }
    })();

    setLoading(false);
  }, [getUserName, getUserEmail]);

  // ============================================
  // VALIDATION
  // ============================================
  const validateProformat = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!clientNom || clientNom.trim() === '') {
      errors.push('❌ Le nom du client est requis');
    }

    const commercialNom = commercialInfo.nomComplet || getUserName();
    if (
      !commercialNom ||
      commercialNom === 'Commercial' ||
      commercialNom.trim() === ''
    ) {
      errors.push('❌ Le nom du commercial est requis. Veuillez vous reconnecter.');
    }

    const commercialEmail = commercialInfo.email || getUserEmail();
    if (!commercialEmail || commercialEmail.trim() === '') {
      errors.push("❌ L'email du commercial est requis. Veuillez vous reconnecter.");
    }

    if (!reservations || reservations.length === 0) {
      errors.push('❌ Aucune réservation sélectionnée');
    } else {
      const sansPrix = reservations.filter((r) => {
        const loc = Number(r.prix_location ?? r.prix_saisi ?? 0) || 0;
        return loc <= 0;
      });
      if (sansPrix.length > 0) {
        errors.push(`❌ ${sansPrix.length} réservation(s) sans prix location valide`);
      }

      const sansDevise = reservations.filter(
        (r) => r.devise !== 'CDF' && r.devise !== 'USD'
      );
      if (sansDevise.length > 0) {
        errors.push(`❌ ${sansDevise.length} réservation(s) sans devise valide`);
      }

      const sansId = reservations.filter((r) => !r.id_reservation);
      if (sansId.length > 0) {
        errors.push(`❌ ${sansId.length} réservation(s) sans ID`);
      }

      const sansLignes = reservations.filter(
        (r) => !r.lignes || r.lignes.length === 0
      );
      if (sansLignes.length > 0) {
        errors.push(`❌ ${sansLignes.length} réservation(s) sans lignes`);
      }

      const clientNames = [...new Set(reservations.map((r) => r.client_nom))];
      if (clientNames.length > 1) {
        errors.push(
          `❌ Plusieurs clients différents sélectionnés: ${clientNames.join(', ')}`
        );
      }
    }

    if (totalGeneral <= 0) {
      errors.push('❌ Le total doit être supérieur à 0');
    }

    for (const r of reservations) {
      if (r.date_debut_campagne && r.date_fin_campagne) {
        const debut = new Date(r.date_debut_campagne);
        const fin = new Date(r.date_fin_campagne);
        if (debut > fin) {
          errors.push(
            `❌ La date de début (${r.date_debut_campagne}) est après la date de fin (${r.date_fin_campagne})`
          );
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // ============================================
  // DOUBLON
  // ============================================
  const checkDuplicate = async (): Promise<{
    isDuplicate: boolean;
    message?: string;
    numero_facture?: string;
    id_facture?: number;
  }> => {
    try {
      const ids = reservations.map((r) => r.id_reservation).join(',');
      const response = await fetch(
        `/api/facture/check-duplicate?reservations=${ids}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      );
      return await response.json();
    } catch (error) {
      console.error('Erreur vérification doublon:', error);
      return { isDuplicate: false };
    }
  };

  // ============================================
  // IMPRESSION ROBUSTE (évite double appel)
  // ============================================
  const triggerPrint = (delay = 300) => {
    if (hasPrintedRef.current) return;
    hasPrintedRef.current = true;
    setTimeout(() => {
      try {
        console.log('🖨️ window.print() appelé');
        window.print();
      } catch (e) {
        console.error('❌ Erreur window.print():', e);
        alert(
          "⚠️ Impossible de lancer l'impression. Vérifiez les paramètres de votre navigateur."
        );
      } finally {
        // Permet une nouvelle impression manuelle après la précédente
        setTimeout(() => { hasPrintedRef.current = false; }, 2000);
      }
    }, delay);
  };

  // ============================================
  // ENREGISTRER + IMPRIMER
  // ============================================
  const handleSaveAndPrint = async () => {
    if (saved) {
      triggerPrint(200);
      return;
    }
    if (saving) return;

    const validation = validateProformat();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setShowValidationModal(true);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const duplicateCheck = await checkDuplicate();
      if (duplicateCheck.isDuplicate) {
        if (duplicateCheck.numero_facture) {
          setNumeroBD(duplicateCheck.numero_facture);
          setNumeroFacture(duplicateCheck.numero_facture);
        }
        setSaveError(
          `⚠️ ${duplicateCheck.message || 'Une facture existe déjà pour ces réservations'}`
        );
        setSaving(false);
        return;
      }

      const commercialNom = commercialInfo.nomComplet || getUserName();
      const commercialEmail = commercialInfo.email || getUserEmail();

      // ✅ Construction du payload API avec les BONS champs
      const factureData = {
        client_nom: clientNom,
        client_id: clientId,
        commercial_nom: commercialNom,
        commercial_email: commercialEmail,
        commercial_id: user?.id || null,
        devise:
          deviseProformat === 'MULTI' ? 'USD' : deviseProformat, // devise principale
        devises_utilisees: devisesUtilisees.join(','),
        total: totalGeneral,
        total_cdf: totalCDF,
        total_usd: totalUSD,
        total_location_usd: totalLocationUSD,
        total_impression_usd: totalImpressionUSD,
        reservations: reservations.map((r) => {
          const loc = Number(r.prix_location ?? r.prix_saisi ?? 0) || 0;
          const imp = Number(r.prix_impression ?? 0) || 0;
          const totalR = Number(r.total_reservation ?? loc + imp) || 0;
          return {
            id_reservation: r.id_reservation,
            numero_commande: r.numero_commande,
            id_face: r.lignes[0]?.id_face || null,
            id_panneau: r.lignes[0]?.id_panneau || null,
            prix_location: loc,
            prix_impression: imp,
            total_reservation: totalR,
            // Compat API historique
            prix_saisi: totalR,
            devise: r.devise || 'USD',
            panneau_nom: r.lignes[0]?.panneau?.nom || '',
            panneau_adresse: r.lignes[0]?.panneau?.adresse || '',
            orientation: r.lignes[0]?.orientation || '',
            type_face: r.lignes[0]?.type_face || '',
            date_debut: r.date_debut_campagne,
            date_fin: r.date_fin_campagne,
            lignes: r.lignes.map((l) => ({
              id_ligne: l.id_ligne,
              id_face: l.id_face,
              id_panneau: l.id_panneau,
              orientation: l.orientation,
              type_face: l.type_face,
              statut_diffusion: l.statut_diffusion,
              date_debut: l.date_debut,
              date_fin: l.date_fin,
              prix_vente_net: l.prix_vente_net ?? 0,
              prix_location_ligne: l.prix_location_ligne ?? 0,
              prix_impression_ligne: l.prix_impression_ligne ?? 0,
              total_ligne: l.total_ligne ?? 0,
              panneau_nom: l.panneau?.nom || '',
              panneau_adresse: l.panneau?.adresse || '',
            })),
          };
        }),
        notes: '',
        conditions_paiement: 'Paiement à 30 jours',
      };

      const response = await fetch('/api/facture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(factureData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSaved(true);
        setSaveSuccess(
          `✅ Proformat enregistré avec succès ! N°: ${result.data.numero_facture}`
        );
        setNumeroFacture(result.data.numero_facture);
        setIdFacture(result.data.id_facture);

        try {
          localStorage.setItem('last_facture_id', String(result.data.id_facture));
          localStorage.setItem('last_facture_numero', result.data.numero_facture);
        } catch { /* ignore */ }

        triggerPrint(1200);
      } else {
        setSaveError(
          result.message || "❌ Erreur lors de l'enregistrement du proformat"
        );
        console.error('❌ Erreur API:', result);
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      setSaveError(`❌ Erreur technique: ${error.message || 'Veuillez réessayer'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleManualPrint = () => {
    triggerPrint(100);
  };

  const handleRetour = () => {
    router.back();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '...';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const getDeviseSymbole = (d: string) => (d === 'USD' ? '$' : 'FC');

  const formatNumber = (n: number | string | undefined) => {
    const v = Number(n) || 0;
    return v.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // ============================================
  // RENDUS D'ÉTAT
  // ============================================
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border-2 border-red-200">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-3">Erreur</h2>
          <p className="text-gray-700 whitespace-pre-line">{error}</p>
          <button
            onClick={handleRetour}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Chargement du proformat...</p>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune réservation sélectionnée</p>
          <button
            onClick={handleRetour}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const afficherTotalCDF = totalCDF > 0;
  const afficherTotalUSD = totalUSD > 0;
  const afficherLesDeux = afficherTotalCDF && afficherTotalUSD;
  const afficherBlocLocation = totalLocationUSD > 0;
  const afficherBlocImpression = totalImpressionUSD > 0;

  return (
    <div className="page-container">
      {/* Modal validation */}
      {showValidationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <XCircle size={24} className="text-red-500" />
              <h2 className="text-xl font-bold text-red-600">
                Validation échouée
              </h2>
            </div>
            <div className="modal-body">
              <p className="text-gray-600 mb-3">
                Veuillez corriger les erreurs suivantes :
              </p>
              <ul className="error-list">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="error-item">{err}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowValidationModal(false)}
                className="btn-modal-close"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'actions */}
      <div className="no-print mobile-actions">
        <button className="btn-back" onClick={handleRetour}>
          <ArrowLeft size={16} className="mr-2" />
          RETOUR
        </button>

        <button
          className={`btn-action ${saved ? 'btn-print-mode' : 'btn-save-mode'}`}
          onClick={handleSaveAndPrint}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Enregistrement...
            </>
          ) : saved ? (
            <>
              <Printer size={16} className="mr-2" />
              IMPRIMER
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Enregistrer & Imprimer
            </>
          )}
        </button>

        {saved && (
          <button
            className="btn-manual-print"
            onClick={handleManualPrint}
            title="Imprimer manuellement"
          >
            <Printer size={16} className="mr-2" />
            Impression manuelle
          </button>
        )}

        {saved && (
          <span className="status-badge">
            <CheckCircle size={14} className="mr-1" />
            Enregistré
          </span>
        )}
      </div>

      {/* Messages */}
      {saveSuccess && (
        <div className="no-print success-message">
          <CheckCircle size={18} className="mr-2" />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="no-print error-message">
          <AlertCircle size={18} className="mr-2" />
          {saveError}
          <button
            onClick={() => setSaveError(null)}
            className="ml-4 text-white underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ✅ Feuille A4 */}
      <div
        className="zoom-wrapper"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'top center',
          // ✅ Compense le décalage visuel dû au scale
          marginBottom: `${(zoom - 1) * 1123}px`,
        }}
      >
        <div className="sheet">
          {/* DATE */}
          <div
            style={{
              position: 'absolute',
              top: '66mm',
              left: '155mm',
              fontSize: '17px',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {dateGeneration}
          </div>

          {/* NUMÉRO PROFORMAT — prévisionnel ou définitif */}
          <div
            style={{
              position: 'absolute',
              top: '76mm',
              left: '50mm',
              fontSize: '18px',
              fontWeight: 'bold',
              color: saved ? '#003366' : '#000',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {numeroFacture}
          </div>

          {/* INFOS CLIENT */}
          <div
            style={{
              position: 'absolute',
              top: '75mm',
              left: '135mm',
              width: '60mm',
              lineHeight: '1.5',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                fontSize: '14px',
                textTransform: 'uppercase',
              }}
            >
              {clientNom}
            </div>
            <div
              style={{
                marginTop: '3mm',
                fontSize: '10px',
                textTransform: 'uppercase',
              }}
            >
              Établi par : {commercialInfo.nomComplet}
            </div>
            <div style={{ fontSize: '10px', color: '#333' }}>
              {commercialInfo.email}
            </div>
          </div>

          {/* EN-TÊTE TABLEAU (colonnes Location / Impression / Total) */}
          <div
            style={{
              position: 'absolute',
              top: '104mm',
              left: '10mm',
              width: '180mm',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '10px',
              fontWeight: 'bold',
              borderBottom: '1px solid #333',
              paddingBottom: '1mm',
              display: 'flex',
            }}
          >
            <div style={{ width: '22mm', textAlign: 'center' }}>Qté</div>
            <div style={{ width: '105mm', paddingLeft: '3mm' }}>Désignation</div>
            <div style={{ width: '25mm', textAlign: 'right', paddingRight: '3mm' }}>
              Location
            </div>
            <div style={{ width: '28mm', textAlign: 'right', paddingRight: '3mm' }}>
              Impression
            </div>
            <div style={{ width: '26mm', textAlign: 'right' }}>Total</div>
          </div>

          {/* TABLEAU — ✅ Plus de ligne d'en-tête CMD-XXXX, police 12px */}
          <div
            style={{
              position: 'absolute',
              top: '110mm',
              left: '10mm',
              width: '180mm',
              fontFamily: "'Courier New', Courier, monospace",
              maxHeight: '130mm',
              overflow: 'hidden',
            }}
          >
            {reservations.map((reservation, idx) => {
              const deviseR = reservation.devise || 'USD';
              const sym = getDeviseSymbole(deviseR);

              return (
                <div key={idx} style={{ marginBottom: '2mm' }}>
                  {/* ✅ On affiche directement les lignes, sans en-tête de commande */}
                  {reservation.lignes.map((ligne, lIdx) => {
                    const locL = Number(ligne.prix_location_ligne ?? 0) || 0;
                    const impL = Number(ligne.prix_impression_ligne ?? 0) || 0;
                    const totL = Number(ligne.total_ligne ?? locL + impL) || 0;

                    return (
                      <div
                        key={lIdx}
                        style={{
                          display: 'flex',
                          minHeight: '12mm',
                          alignItems: 'flex-start',
                          fontSize: '12px',
                          paddingLeft: '2mm',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        {/* Qté */}
                        <div
                          style={{
                            width: '22mm',
                            textAlign: 'center',
                            paddingTop: '2mm',
                            fontSize: '12px',
                          }}
                        >
                          1
                        </div>

                        {/* Désignation */}
                        <div
                          style={{
                            width: '105mm',
                            paddingLeft: '3mm',
                            paddingTop: '2mm',
                            lineHeight: '1.35',
                            fontSize: '12px',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              fontSize: '12px',
                            }}
                          >
                            {ligne.panneau?.nom || 'Panneau'} - Face{' '}
                            {ligne.orientation || 'N/A'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#111' }}>
                            {ligne.panneau?.adresse || ''}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontStyle: 'italic',
                              color: '#666',
                            }}
                          >
                            type Media: {ligne.type_face || ''} |{' '}
                            {formatDate(ligne.date_debut)} →{' '}
                            {formatDate(ligne.date_fin)}
                          </div>
                        </div>

                        {/* Prix Location */}
                        <div
                          style={{
                            width: '25mm',
                            textAlign: 'right',
                            paddingRight: '3mm',
                            paddingTop: '2mm',
                            fontSize: '12px',
                          }}
                        >
                          {formatNumber(locL)} {sym}
                        </div>

                        {/* Prix Impression */}
                        <div
                          style={{
                            width: '28mm',
                            textAlign: 'right',
                            paddingRight: '3mm',
                            paddingTop: '2mm',
                            fontSize: '12px',
                          }}
                        >
                          {formatNumber(impL)} {sym}
                        </div>

                        {/* Total ligne */}
                        <div
                          style={{
                            width: '26mm',
                            textAlign: 'right',
                            paddingTop: '2mm',
                            fontWeight: 'bold',
                            fontSize: '12px',
                          }}
                        >
                          {formatNumber(totL)} {sym}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* TOTAUX */}
          <div
            style={{
              position: 'absolute',
              top: afficherLesDeux ? '235mm' : '245mm',
              left: '110mm',
              width: '80mm',
              textAlign: 'right',
              fontWeight: 'bold',
              fontSize: afficherLesDeux ? '12px' : '14px',
              fontFamily: "'Courier New', Courier, monospace",
              color: saved ? '#003366' : '#000',
              lineHeight: '1.6',
            }}
          >
            {afficherBlocLocation && (
              <div>
                Total Location USD : {formatNumber(totalLocationUSD)} $
              </div>
            )}
            {afficherBlocImpression && (
              <div>
                Total Impression USD : {formatNumber(totalImpressionUSD)} $
              </div>
            )}
            {afficherTotalCDF && (
              <div>Total CDF : {formatNumber(totalCDF)} FC</div>
            )}
            
            {!afficherTotalCDF && !afficherTotalUSD && (
              <div>0 {getDeviseSymbole(deviseProformat)}</div>
            )}
            <div
              style={{
                marginTop: '2mm',
                paddingTop: '2mm',
                borderTop: '1px solid #333',
                fontSize: '15px',
              }}
            >
              TOTAL GÉNÉRAL : {formatNumber(totalGeneral)}{' '}
              {getDeviseSymbole(deviseProformat === 'MULTI' ? 'USD' : deviseProformat)}
            </div>
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .page-container {
          background-color: #525659;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-bottom: 50px;
        }
        .zoom-wrapper {
          margin-top: 80px;
          transition: transform 0.2s ease-out;
        }
        .sheet {
          background-color: white;
          width: 210mm;
          height: 297mm;
          position: relative;
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
          color: black;
          font-family: 'Courier New', Courier, monospace;
          overflow: hidden;
        }
        .mobile-actions {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: #333;
          padding: 15px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
          flex-wrap: wrap;
        }
        .btn-back {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 5px;
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        .btn-back:hover {
          background: #c0392b;
        }
        .btn-action {
          border: none;
          padding: 10px 25px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 5px;
          font-size: 14px;
          display: flex;
          align-items: center;
          transition: all 0.3s;
          min-width: 200px;
          justify-content: center;
        }
        .btn-save-mode {
          background: #f39c12;
          color: white;
        }
        .btn-save-mode:hover:not(:disabled) {
          background: #e67e22;
          transform: scale(1.02);
        }
        .btn-print-mode {
          background: #27ae60;
          color: white;
        }
        .btn-print-mode:hover:not(:disabled) {
          background: #219a52;
          transform: scale(1.02);
        }
        .btn-manual-print {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 18px;
          font-weight: bold;
          cursor: pointer;
          border-radius: 5px;
          font-size: 13px;
          display: flex;
          align-items: center;
          transition: all 0.3s;
        }
        .btn-manual-print:hover {
          background: #2980b9;
        }
        .btn-action:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .status-badge {
          background: #27ae60;
          color: white;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        .success-message {
          position: fixed;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99;
          background: #27ae60;
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          box-shadow: 0 4px 15px rgba(39, 174, 96, 0.4);
          animation: slideDown 0.5s ease;
        }
        .error-message {
          position: fixed;
          top: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99;
          background: #e74c3c;
          color: white;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: bold;
          display: flex;
          align-items: center;
          box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
          animation: slideDown 0.5s ease;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }
        .modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        .modal-body {
          padding: 20px 24px;
        }
        .error-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .error-item {
          padding: 8px 12px;
          margin-bottom: 6px;
          background: #fef2f2;
          border-left: 3px solid #ef4444;
          border-radius: 4px;
          color: #b91c1c;
          font-size: 13px;
        }
        .modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }
        .btn-modal-close {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 24px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media print {
          .page-container {
            background: none;
            padding: 0;
            display: block;
          }
          .zoom-wrapper {
            transform: none !important;
            margin: 0 !important;
          }
          .sheet {
            box-shadow: none;
            margin: 0;
            width: 100%;
            height: 100vh;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
        .print-only {
          display: none;
        }
        @media (max-width: 600px) {
          .btn-back,
          .btn-action {
            padding: 8px 12px;
            font-size: 12px;
            min-width: 140px;
          }
          .mobile-actions {
            flex-wrap: wrap;
            gap: 8px;
          }
          .status-badge {
            font-size: 10px;
            padding: 4px 10px;
          }
          .modal-content {
            max-width: 95%;
          }
        }
      `}</style>
    </div>
  );
}