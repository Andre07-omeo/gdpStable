// src/app/dashboard/commercial/proformat/preview/page.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Printer, ArrowLeft, FileText, Save, CheckCircle, Loader2, AlertCircle, XCircle } from 'lucide-react';

interface LigneProformat {
  id_ligne: number;
  id_face: number;
  id_panneau: number;
  orientation: string;
  type_face: string;
  statut_diffusion: string;
  date_debut: string;
  date_fin: string;
  panneau: { id: number; nom: string; adresse: string };
}

interface ReservationProformat {
  id_reservation: number;
  numero_commande: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  date_debut_campagne: string;
  date_fin_campagne: string;
  prix_saisi: number;
  commercial_nom: string;
  commercial_prenom: string;
  commercial_email: string;
  commercial_nom_complet: string;
  lignes: LigneProformat[];
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
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [commercialInfo, setCommercialInfo] = useState({
    nom: '',
    prenom: '',
    email: '',
    nomComplet: '',
  });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [numeroFacture, setNumeroFacture] = useState('');
  const [idFacture, setIdFacture] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [conditions, setConditions] = useState('Paiement à 30 jours');
  const [showValidationModal, setShowValidationModal] = useState(false);

  // ✅ Pour éviter les doubles impressions
  const hasPrintedRef = useRef(false);

  // ============================================
  // ZOOM responsive
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
  // CHARGEMENT DU localStorage
  // ============================================
  useEffect(() => {
    const date = new Date();
    const year = date.getFullYear();
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    setNumeroFacture(`PRO-${year}-${random}`);

    const data =
      typeof window !== 'undefined'
        ? localStorage.getItem('proformat_selected_reservations')
        : null;
    const client =
      typeof window !== 'undefined'
        ? localStorage.getItem('proformat_client_nom')
        : null;

    if (!data || !client) {
      setError(
        'Aucune donnée trouvée. Veuillez sélectionner des réservations depuis la page commerciale.'
      );
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(data);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setError('Aucune réservation sélectionnée.');
        setLoading(false);
        return;
      }

      const first = parsed[0];
      const nomCommercial = first.commercial_nom || '';
      const prenomCommercial = first.commercial_prenom || '';
      const emailCommercial = first.commercial_email || '';
      const nomComplet =
        first.commercial_nom_complet ||
        `${prenomCommercial} ${nomCommercial}`.trim();

      const finalNomComplet = getUserName() || nomComplet;
      const finalEmail = getUserEmail() || emailCommercial;

      setReservations(parsed);
      setClientNom(client);

      setCommercialInfo({
        nom: nomCommercial,
        prenom: prenomCommercial,
        email: finalEmail,
        nomComplet: finalNomComplet,
      });

      const total = parsed.reduce(
        (sum: number, r: ReservationProformat) => sum + (r.prix_saisi || 0),
        0
      );
      setTotalGeneral(total);
    } catch (e) {
      console.error('Erreur de chargement:', e);
      setError('Erreur lors du chargement des données.');
    }
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
      errors.push(
        '❌ Le nom du commercial est requis. Veuillez vous reconnecter.'
      );
    }

    const commercialEmail = commercialInfo.email || getUserEmail();
    if (!commercialEmail || commercialEmail.trim() === '') {
      errors.push(
        "❌ L'email du commercial est requis. Veuillez vous reconnecter."
      );
    }

    if (!reservations || reservations.length === 0) {
      errors.push('❌ Aucune réservation sélectionnée');
    } else {
      const sansPrix = reservations.filter(
        (r) => !r.prix_saisi || r.prix_saisi <= 0
      );
      if (sansPrix.length > 0) {
        errors.push(`❌ ${sansPrix.length} réservation(s) sans prix valide`);
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
  // IMPRESSION ROBUSTE
  // ============================================
  const triggerPrint = (delay = 300) => {
    setTimeout(() => {
      try {
        console.log('🖨️ window.print() appelé');
        window.print();
      } catch (e) {
        console.error('❌ Erreur window.print():', e);
        alert(
          "⚠️ Impossible de lancer l'impression. Vérifiez les paramètres de votre navigateur."
        );
      }
    }, delay);
  };

  // ============================================
  // ENREGISTRER + IMPRIMER
  // ============================================
  const handleSaveAndPrint = async () => {
    console.log('🟢 [1] handleSaveAndPrint, saved =', saved);

    if (saved) {
      console.log('🟢 [2] Déjà enregistré, impression directe');
      triggerPrint(200);
      return;
    }

    if (saving) {
      console.log('⏸️ [3] Déjà en cours');
      return;
    }

    console.log('🟢 [4] Validation...');
    const validation = validateProformat();
    console.log('🟢 [5] Résultat:', validation);

    if (!validation.isValid) {
      console.error('❌ [6] Validation échouée:', validation.errors);
      setValidationErrors(validation.errors);
      setShowValidationModal(true);
      return;
    }

    console.log('🟢 [7] Vérification doublon...');
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const duplicateCheck = await checkDuplicate();
      console.log('🟢 [8] Doublon:', duplicateCheck);

      if (duplicateCheck.isDuplicate) {
        setSaveError(
          `⚠️ ${duplicateCheck.message || 'Une facture existe déjà pour ces réservations'}`
        );
        setSaving(false);
        return;
      }

      const commercialNom = commercialInfo.nomComplet || getUserName();
      const commercialEmail = commercialInfo.email || getUserEmail();

      const factureData = {
        client_nom: clientNom,
        client_id: clientId,
        commercial_nom: commercialNom,
        commercial_email: commercialEmail,
        commercial_id: user?.id || null,
        reservations: reservations.map((r) => ({
          id_reservation: r.id_reservation,
          numero_commande: r.numero_commande,
          id_face: r.lignes[0]?.id_face || null,
          id_panneau: r.lignes[0]?.id_panneau || null,
          prix_saisi: r.prix_saisi || 0,
          panneau_nom: r.lignes[0]?.panneau?.nom || '',
          panneau_adresse: r.lignes[0]?.panneau?.adresse || '',
          orientation: r.lignes[0]?.orientation || '',
          type_face: r.lignes[0]?.type_face || '',
          date_debut: r.date_debut_campagne,
          date_fin: r.date_fin_campagne,
          currency: 'CDF',
        })),
        total: totalGeneral,
        currency: 'CDF',
        notes,
        conditions_paiement: conditions,
      };

      console.log('🟢 [10] Envoi POST /api/facture');

      const response = await fetch('/api/facture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(factureData),
      });

      console.log('🟢 [11] Status:', response.status);
      const result = await response.json();
      console.log('🟢 [12] Body:', result);

      if (response.ok && result.success) {
        setSaved(true);
        setSaveSuccess(
          `✅ Proformat enregistré avec succès ! N°: ${result.data.numero_facture}`
        );
        setNumeroFacture(result.data.numero_facture);
        setIdFacture(result.data.id_facture);

        localStorage.setItem('last_facture_id', result.data.id_facture);
        localStorage.setItem('last_facture_numero', result.data.numero_facture);

        // ✅ Impression auto APRÈS re-render
        console.log('🟢 [13] Impression programmée');
        triggerPrint(1200);
      } else {
        setSaveError(
          result.message || "❌ Erreur lors de l'enregistrement du proformat"
        );
        console.error('❌ [13-bis] Erreur API:', result);
      }
    } catch (error: any) {
      console.error('❌ [15] Exception:', error);
      setSaveError(`❌ Erreur technique: ${error.message || 'Veuillez réessayer'}`);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // IMPRESSION MANUELLE
  // ============================================
  const handleManualPrint = () => {
    console.log('🖨️ Impression manuelle');
    triggerPrint(100);
  };

  const handleRetour = () => {
    router.back();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '...';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // ============================================
  // AFFICHAGES D'ERREUR / CHARGEMENT
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
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
                  <li key={idx} className="error-item">
                    {err}
                  </li>
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
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
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
            {new Date().toLocaleDateString('fr-FR')}
          </div>

          {/* NUMÉRO PROFORMAT */}
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
            {saved
              ? numeroFacture
              : `PRO-${new Date().getFullYear()}-${String(
                  Math.floor(Math.random() * 10000)
                ).padStart(4, '0')}`}
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

          {/* TABLEAU */}
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
            {reservations.map((reservation, idx) => (
              <div key={idx} style={{ marginBottom: '2mm' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '1mm 0',
                    borderBottom: '1px dashed #ccc',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    height: '6mm',
                    alignItems: 'center',
                  }}
                >
                  <span>{reservation.numero_commande}</span>
                  <span>
                    {reservation.prix_saisi?.toLocaleString()} FCFA/mois
                  </span>
                </div>

                {reservation.lignes.map((ligne, lIdx) => (
                  <div
                    key={lIdx}
                    style={{
                      display: 'flex',
                      height: '10mm',
                      alignItems: 'flex-start',
                      fontSize: '9px',
                      paddingLeft: '5mm',
                      borderBottom:
                        lIdx === reservation.lignes.length - 1
                          ? 'none'
                          : '1px solid #f0f0f0',
                    }}
                  >
                    <div
                      style={{
                        width: '22mm',
                        textAlign: 'center',
                        paddingTop: '2mm',
                      }}
                    >
                      1
                    </div>
                    <div
                      style={{
                        width: '105mm',
                        paddingLeft: '3mm',
                        paddingTop: '2mm',
                        lineHeight: '1.2',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          fontSize: '8px',
                        }}
                      >
                        {ligne.panneau?.nom || 'Panneau'} - Face{' '}
                        {ligne.orientation || 'N/A'}
                      </div>
                      <div style={{ fontSize: '8px', color: '#111' }}>
                        {ligne.panneau?.adresse || ''}
                      </div>
                      <div
                        style={{
                          fontSize: '7px',
                          fontStyle: 'italic',
                          color: '#666',
                        }}
                      >
                        Type: {ligne.type_face || 'Vinyle'} |{' '}
                        {formatDate(ligne.date_debut)} →{' '}
                        {formatDate(ligne.date_fin)}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '25mm',
                        textAlign: 'right',
                        paddingRight: '3mm',
                        paddingTop: '2mm',
                      }}
                    >
                      {reservation.prix_saisi?.toLocaleString()}
                    </div>
                    <div
                      style={{
                        width: '28mm',
                        textAlign: 'right',
                        paddingTop: '2mm',
                      }}
                    >
                      {reservation.prix_saisi?.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* TOTAL */}
          <div
            style={{
              position: 'absolute',
              top: '250mm',
              left: '160mm',
              width: '30mm',
              textAlign: 'right',
              fontWeight: 'bold',
              fontSize: '16px',
              fontFamily: "'Courier New', Courier, monospace",
              color: saved ? '#003366' : '#000',
            }}
          >
            {totalGeneral.toLocaleString()} FCFA
          </div>

          {/* CONDITIONS / NOTES */}
          <div
            style={{
              position: 'absolute',
              top: '260mm',
              left: '10mm',
              width: '180mm',
              fontSize: '7px',
              color: '#666',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            <div className="no-print" style={{ marginBottom: '2mm' }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes supplémentaires..."
                style={{
                  width: '100%',
                  padding: '2mm',
                  border: '1px solid #ddd',
                  borderRadius: '2px',
                  fontSize: '8px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '15mm',
                }}
              />
              <input
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="Conditions de paiement"
                style={{
                  width: '100%',
                  padding: '2mm',
                  border: '1px solid #ddd',
                  borderRadius: '2px',
                  fontSize: '8px',
                  fontFamily: 'inherit',
                  marginTop: '1mm',
                }}
              />
            </div>
            <div className="print-only">
              <p style={{ margin: '0.5mm 0' }}>
                {conditions || 'Paiement à 30 jours'}
              </p>
              {notes && (
                <p style={{ margin: '0.5mm 0', fontStyle: 'italic' }}>
                  {notes}
                </p>
              )}
            </div>
          </div>

          {/* SIGNATURES */}
          <div
            style={{
              position: 'absolute',
              top: '280mm',
              left: '10mm',
              width: '180mm',
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            <div style={{ width: '80mm' }}>
              <p
                style={{
                  fontSize: '7px',
                  color: '#666',
                  marginBottom: '2mm',
                }}
              >
                Signature du commercial
              </p>
              <div
                style={{
                  borderBottom: '1px solid #999',
                  height: '10mm',
                }}
              ></div>
              <p
                style={{
                  fontSize: '8px',
                  fontWeight: 'bold',
                  marginTop: '1mm',
                }}
              >
                {commercialInfo.nomComplet}
              </p>
              <p style={{ fontSize: '7px', color: '#666' }}>
                {commercialInfo.email}
              </p>
            </div>
            <div style={{ width: '80mm' }}>
              <p
                style={{
                  fontSize: '7px',
                  color: '#666',
                  marginBottom: '2mm',
                }}
              >
                Signature du client
              </p>
              <div
                style={{
                  borderBottom: '1px solid #999',
                  height: '10mm',
                }}
              ></div>
              <p
                style={{
                  fontSize: '8px',
                  fontWeight: 'bold',
                  marginTop: '1mm',
                }}
              >
                Bon pour accord
              </p>
              <p style={{ fontSize: '7px', color: '#666' }}>{clientNom}</p>
            </div>
          </div>

          {/* Pied de page */}
          <div
            style={{
              position: 'absolute',
              bottom: '5mm',
              left: '10mm',
              width: '190mm',
              textAlign: 'center',
              fontSize: '5px',
              color: '#999',
              fontFamily: "'Courier New', Courier, monospace",
              borderTop: '1px solid #eee',
              paddingTop: '1mm',
            }}
          >
            {saved ? `✅ Enregistré sous N° ${numeroFacture} - ` : ''}
            Document généré automatiquement - {new Date().toLocaleString()}
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
          border-radius: 20px;
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
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
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