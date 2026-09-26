'use client';

// src/app/dashboard/commercial/proformat/cart-preview/page.tsxexport const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // ✅ IMPORT
import { Printer, ArrowLeft, FileText, MapPin, Building2, Ruler, Calendar, RefreshCw, User } from 'lucide-react';

interface CartProformatItem {
  id_face: number;
  id_panneau: number;
  panneau_nom: string;
  panneau_adresse: string;
  orientation: string;
  type_face: string;
  dimension_m2: string;
  date_debut?: string;
  date_fin?: string;
  prix_saisi: number;
  currency?: string;
  ville?: string;
  quartier?: string;
  hauteur_cm?: number;
  largeur_cm?: number;
  surface?: string;
}

interface CartProformatData {
  reservations: CartProformatItem[];
  client_nom: string;
  total: number;
  total_cdf?: number;
  total_usd?: number;
  currency?: string;
  commercial_nom?: string; // ✅ AJOUT
  commercial_email?: string; // ✅ AJOUT
}

export default function CartProformatPreviewPage() {
  const router = useRouter();
  const { getUserName, getUserEmail } = useAuth(); // ✅ Utiliser le hook
  const [data, setData] = useState<CartProformatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commercialNom, setCommercialNom] = useState<string>('Commercial');
  const [commercialEmail, setCommercialEmail] = useState<string>('');

  useEffect(() => {
    // ✅ Récupérer le nom du commercial via le hook
    const nom = getUserName();
    const email = getUserEmail();
    setCommercialNom(nom);
    setCommercialEmail(email);

    const stored = typeof window !== "undefined" ? localStorage.getItem('cart_proformat_data') : null;
    if (!stored) {
      setError('Aucune donnée trouvée. Veuillez sélectionner des faces dans le panier.');
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!parsed.reservations || parsed.reservations.length === 0) {
        setError('Le panier est vide.');
        setLoading(false);
        return;
      }
      
      const correctedReservations = parsed.reservations.map((item: any) => ({
        ...item,
        prix_saisi: typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi) ? item.prix_saisi : 0,
        currency: item.currency || 'CDF'
      }));
      
      setData({
        ...parsed,
        reservations: correctedReservations,
        total: correctedReservations.reduce((sum: number, item: any) => sum + (item.prix_saisi || 0), 0),
        commercial_nom: nom, // ✅ Utiliser le nom récupéré
        commercial_email: email // ✅ Utiliser l'email récupéré
      });
    } catch (e) {
      console.error('Erreur de chargement:', e);
      setError('Erreur lors du chargement des données.');
    }
    setLoading(false);
  }, [getUserName, getUserEmail]);

  const handlePrint = () => {
    window.print();
  };

  const handleRetour = () => {
    router.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'À définir';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (prix: any, currency: string = 'CDF') => {
    const prixNumber = typeof prix === 'number' && !isNaN(prix) ? prix : 0;
    if (currency === 'USD') {
      return `$${prixNumber.toLocaleString()}`;
    } else {
      return `${prixNumber.toLocaleString()} FC`;
    }
  };

  const getTotalCDF = (reservations: CartProformatItem[]) => {
    return reservations.reduce((sum, item) => {
      const prix = typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi) ? item.prix_saisi : 0;
      if (item.currency === 'CDF' || !item.currency) {
        return sum + prix;
      }
      return sum;
    }, 0);
  };

  const getTotalUSD = (reservations: CartProformatItem[]) => {
    return reservations.reduce((sum, item) => {
      const prix = typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi) ? item.prix_saisi : 0;
      if (item.currency === 'USD') {
        return sum + prix;
      }
      return sum;
    }, 0);
  };

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

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border-2 border-red-200">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-3">Erreur</h2>
          <p className="text-gray-700 whitespace-pre-line">{error || 'Données manquantes'}</p>
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={handleRetour}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retour
            </button>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { reservations, client_nom } = data;
  const totalCDF = getTotalCDF(reservations);
  const totalUSD = getTotalUSD(reservations);
  const hasMissingPrices = reservations.some(item => !item.prix_saisi || item.prix_saisi <= 0);

  // ✅ Utiliser les données du formulaire ou le hook
  const displayCommercialNom = data.commercial_nom || commercialNom;
  const displayCommercialEmail = data.commercial_email || commercialEmail;

  if (hasMissingPrices) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center border-2 border-orange-200">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-orange-600 mb-3">Prix manquants</h2>
          <p className="text-gray-700">
            Certains articles n'ont pas de prix. Veuillez retourner au panier pour saisir tous les prix.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            {reservations.filter(item => !item.prix_saisi || item.prix_saisi <= 0).length} article(s) sans prix
          </div>
          <button
            onClick={handleRetour}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Retour au panier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="no-print mobile-actions">
        <button className="btn-back" onClick={handleRetour}>← RETOUR</button>
        <button className="btn-print" onClick={handlePrint}>🖨 IMPRIMER</button>
      </div>

      <div className="print-content">
        <div className="sheet">
          {/* En-tête Proformat */}
          <div className="header-section">
            <h1 className="title">PROPOSITION DE RESERVENTION</h1>
          </div>

          {/* Référence */}
          <div className="reference-section">
            <div>
              
            </div>
            <div className="text-right">
              <p className="label">DATE</p>
              <p className="value">{new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Client */}
          <div className="client-section">
            <p className="label">CLIENT</p>
            <p className="client-name">{client_nom || 'Client non spécifié'}</p>
            <p className="commercial-info">
              <User size={12} className="inline mr-1" />
              Établi par : <span className="commercial-name">{displayCommercialNom}</span>
              
            </p>
          </div>

          {/* Tableau des faces sélectionnées */}
          <div className="table-container">
            <table className="proformat-table">
              <thead>
                <tr>
                  <th className="col-num">N°</th>
                  <th className="col-panneau">Panneau / Adresse</th>
                  <th className="col-face">Face</th>
                  <th className="col-type">Type</th>
                  <th className="col-dim">Dimension</th>
                  <th className="col-periode">Période</th>
                  <th className="col-devise">Devise</th>
                  <th className="col-prix">Prix</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((item, idx) => {
                  const prix = typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi) ? item.prix_saisi : 0;
                  const currency = item.currency || 'CDF';
                  
                  return (
                    <tr key={idx}>
                      <td className="text-center">{idx + 1}</td>
                      <td>
                        <div className="panneau-name">{item.panneau_nom || 'Sans nom'}</div>
                        <div className="panneau-address">📍 {item.panneau_adresse || 'Adresse non définie'}</div>
                        {item.ville && item.quartier && (
                          <div className="panneau-location">{item.ville} - {item.quartier}</div>
                        )}
                      </td>
                      <td className="text-center">{item.orientation || 'N/A'}</td>
                      <td className="text-center">{item.type_face || 'Standard'}</td>
                      <td className="text-center">{item.dimension_m2 || 'N/A'}</td>
                      <td className="text-center periode">
                        {formatDate(item.date_debut)}<br/>→<br/>{formatDate(item.date_fin)}
                      </td>
                      <td className="text-center">
                        <span className={`currency-badge ${currency === 'USD' ? 'currency-usd' : 'currency-cdf'}`}>
                          {currency}
                        </span>
                      </td>
                      <td className="text-right prix">{formatPrice(prix, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {totalCDF > 0 && (
                  <tr className="total-row">
                    <td colSpan={7} className="text-right total-label">TOTAL EN CDF</td>
                    <td className="text-right total-value total-cdf">{totalCDF.toLocaleString()} FC</td>
                  </tr>
                )}
                {totalUSD > 0 && (
                  <tr className="total-row">
                    <td colSpan={7} className="text-right total-label">TOTAL EN USD</td>
                    <td className="text-right total-value total-usd">${totalUSD.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="total-general">
                  <td colSpan={7} className="text-right total-label-general">TOTAL GÉNÉRAL</td>
                  <td className="text-right total-value-general">
                    {totalCDF > 0 && `${totalCDF.toLocaleString()} FC`}
                    {totalCDF > 0 && totalUSD > 0 && ' + '}
                    {totalUSD > 0 && `$${totalUSD.toLocaleString()}`}
                    {totalCDF === 0 && totalUSD === 0 && '0 FC'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Conditions */}
          <div className="conditions">
            <p className="conditions-note">* Proposition commerciale sans engagement - Sous réserve de disponibilité *</p>
          </div>

          {/* Signatures */}
          <div className="signatures">
            <div className="signature-left">
              <p className="signature-label">Signature du commercial</p>
              <div className="signature-line"></div>
              <p className="signature-name">{displayCommercialNom}</p>
              {displayCommercialEmail && (
                <p className="signature-email">{displayCommercialEmail}</p>
              )}
            </div>
            <div className="signature-right">
              <p className="signature-label">Signature du client</p>
              <div className="signature-line"></div>
              <p className="signature-name">{client_nom || 'Client'}</p>
              <p className="signature-accord">Bon pour accord</p>
            </div>
          </div>

          {/* Pied de page */}
          <div className="footer">
            Document généré automatiquement - {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          background-color: #525659;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
        }

        .no-print.mobile-actions {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: #333;
          padding: 15px;
          display: flex;
          justify-content: center;
          gap: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .btn-print { 
          background: #27ae60; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          font-weight: bold; 
          cursor: pointer; 
          border-radius: 5px; 
          font-size: 14px;
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
        }

        .print-content {
          margin-top: 80px;
          width: 100%;
          max-width: 297mm;
        }

        .sheet {
          background-color: white;
          width: 100%;
          max-width: 297mm;
          padding: 15mm 12mm;
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          color: black;
          font-family: 'Courier New', Courier, monospace;
          box-sizing: border-box;
        }

        .header-section {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 5mm;
          margin-bottom: 8mm;
        }

        .title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #003366;
          letter-spacing: 2px;
        }

        .date {
          font-size: 13px;
          color: #666;
          margin-top: 3mm;
        }

        .reference-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6mm;
        }

        .label {
          font-size: 9px;
          color: #666;
          margin-bottom: 1mm;
          font-weight: bold;
        }

        .value {
          font-size: 14px;
          font-weight: bold;
        }

        .text-right {
          text-align: right;
        }

        .client-section {
          border: 1px solid #ccc;
          padding: 4mm;
          border-radius: 2px;
          margin-bottom: 8mm;
        }

        .client-name {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 1mm 0;
        }

        .commercial-info {
          font-size: 9px;
          color: #666;
          margin-top: 2mm;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .commercial-name {
          font-weight: bold;
          color: #003366;
        }

        .commercial-email {
          color: #888;
          font-size: 8px;
        }

        .inline {
          display: inline;
        }

        .table-container {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 8mm;
        }

        .proformat-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }

        .proformat-table thead tr {
          background-color: #003366;
          color: white;
        }

        .proformat-table th {
          padding: 2mm 1.5mm;
          text-align: left;
          border: 1px solid #003366;
          font-weight: bold;
          font-size: 7px;
          text-transform: uppercase;
        }

        .proformat-table td {
          padding: 1.5mm 1.5mm;
          border: 1px solid #ddd;
          vertical-align: middle;
        }

        .col-num { width: 4%; text-align: center; }
        .col-panneau { width: 28%; }
        .col-face { width: 8%; text-align: center; }
        .col-type { width: 10%; text-align: center; }
        .col-dim { width: 8%; text-align: center; }
        .col-periode { width: 15%; text-align: center; }
        .col-devise { width: 8%; text-align: center; }
        .col-prix { width: 12%; text-align: right; }

        .text-center { text-align: center; }
        .text-right { text-align: right; }

        .panneau-name {
          font-weight: bold;
          font-size: 8px;
        }

        .panneau-address {
          font-size: 7px;
          color: #666;
          margin-top: 0.5mm;
        }

        .panneau-location {
          font-size: 6px;
          color: #999;
        }

        .periode {
          font-size: 7px;
          line-height: 1.3;
        }

        .currency-badge {
          display: inline-block;
          padding: 0.5mm 1.5mm;
          border-radius: 2px;
          font-weight: bold;
          font-size: 7px;
        }

        .currency-usd {
          background-color: #e8f5e9;
          color: #2e7d32;
        }

        .currency-cdf {
          background-color: #e3f2fd;
          color: #1565c0;
        }

        .prix {
          font-weight: bold;
          font-size: 8px;
        }

        .total-row td {
          padding: 2mm 1.5mm;
          font-weight: bold;
          border: 1px solid #ddd;
        }

        .total-label {
          font-size: 9px;
        }

        .total-value {
          font-size: 12px;
        }

        .total-cdf { color: #1565c0; }
        .total-usd { color: #2e7d32; }

        .total-general {
          background-color: #f0f0f0;
        }

        .total-general td {
          padding: 2.5mm 1.5mm;
          font-weight: bold;
          border: 1px solid #ddd;
        }

        .total-label-general {
          font-size: 11px;
        }

        .total-value-general {
          font-size: 15px;
          color: #003366;
        }

        .conditions {
          border-top: 1px solid #ccc;
          padding-top: 3mm;
          text-align: center;
          font-size: 7px;
          color: #666;
          margin-bottom: 6mm;
        }

        .conditions p { margin: 0.5mm 0; }
        .conditions-note { margin-top: 2mm; font-weight: bold; color: #333; }

        .signatures {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4mm;
        }

        .signature-left, .signature-right {
          width: 45%;
        }

        .signature-label {
          font-size: 7px;
          color: #666;
          margin-bottom: 2mm;
        }

        .signature-line {
          border-bottom: 1px solid #999;
          height: 12mm;
        }

        .signature-name {
          font-size: 9px;
          font-weight: bold;
          margin-top: 1mm;
        }

        .signature-email {
          font-size: 7px;
          color: #888;
        }

        .signature-accord {
          font-size: 7px;
          color: #666;
        }

        .footer {
          text-align: center;
          font-size: 6px;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 2mm;
        }

        @media print {
          .page-container {
            background: none;
            padding: 0;
            min-height: auto;
          }
          .no-print { display: none !important; }
          .print-content { margin-top: 0; max-width: 100%; }
          .sheet {
            box-shadow: none;
            max-width: 100%;
            padding: 10mm 8mm;
            margin: 0;
            width: 100%;
            height: 100vh;
          }
          .proformat-table { font-size: 7px; }
          .proformat-table th { font-size: 6px; padding: 1.5mm 1mm; }
          .proformat-table td { padding: 1mm 1mm; font-size: 7px; }
          .title { font-size: 20px; }
          .client-name { font-size: 14px; }
          .total-value-general { font-size: 13px; }
        }

        @page {
          size: landscape;
          margin: 8mm 10mm;
        }

        @media (max-width: 768px) {
          .sheet { padding: 8mm 5mm; }
          .proformat-table { font-size: 6px; }
          .proformat-table th,
          .proformat-table td { padding: 1mm 0.8mm; }
          .title { font-size: 16px; }
          .client-name { font-size: 12px; }
          .col-panneau { width: 20%; }
          .col-periode { width: 12%; }
        }
      `}</style>
    </div>
  );
}

