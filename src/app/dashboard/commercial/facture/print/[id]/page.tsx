// src/app/dashboard/commercial/facture/print/[id]/page.tsx

'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Printer, ArrowLeft, CreditCard, Calendar, CheckCircle, Clock } from 'lucide-react';

interface FactureData {
  id_facture: number;
  numero_facture: string;
  client_nom: string;
  client_email: string;
  client_telephone: string;
  commercial_nom: string;
  commercial_prenom: string;
  commercial_email: string;  // ✅ AJOUTÉ
  date_facture: string;
  date_echeance: string;
  type_document: string;
  statut: string;
  mode_paiement: string;
  nombre_tranches: number;
  montant_par_tranche: number;
  total_ht: number;
  total_ttc: number;
  remise: number;
  montant_remise: number;
  notes: string;
  conditions_paiement: string;
  lignes: any[];
  tranches: any[];
  montant_paye: number;
}

export default function FacturePrintPage() {
  const params = useParams();
  const router = useRouter();
  const idFacture = params.id as string;
  
  const [facture, setFacture] = useState<FactureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFacture();
  }, [idFacture]);

  const fetchFacture = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/facture?id=${idFacture}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setFacture(data.data);
      } else {
        setError(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      'brouillon': 'bg-gray-200 text-gray-700',
      'envoye': 'bg-blue-100 text-blue-700',
      'paye': 'bg-green-100 text-green-700',
      'annule': 'bg-red-100 text-red-700'
    };
    return colors[statut] || 'bg-gray-200 text-gray-700';
  };

  const getTrancheStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      'en_attente': 'bg-yellow-100 text-yellow-700',
      'paye': 'bg-green-100 text-green-700',
      'retard': 'bg-red-100 text-red-700'
    };
    return colors[statut] || 'bg-gray-200 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Chargement de la facture...</p>
        </div>
      </div>
    );
  }

  if (error || !facture) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600">{error || 'Facture non trouvée'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  const totalTranchesPayees = facture.tranches?.filter((t: any) => t.statut === 'paye').length || 0;
  const totalTranches = facture.tranches?.length || facture.nombre_tranches || 1;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Barre d'actions - non imprimable */}
      <div className="no-print max-w-4xl mx-auto mb-4 flex gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Printer size={18} />
          Imprimer / PDF
        </button>
      </div>

      {/* Facture */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden" id="facture-content">
        <div className="p-8">
          {/* En-tête */}
          <div className="border-b pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {facture.type_document === 'proformat' ? 'PROFORMAT' : 'FACTURE'}
                </h1>
                <p className="text-sm text-gray-500">N° {facture.numero_facture}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date: {new Date(facture.date_facture).toLocaleDateString('fr-FR')}</p>
                <p className="text-sm text-gray-600">Échéance: {new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatutBadge(facture.statut)}`}>
                  {facture.statut.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Infos client */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Client</h3>
              <p className="font-bold">{facture.client_nom || 'N/A'}</p>
              <p className="text-sm text-gray-600">{facture.client_email || ''}</p>
              <p className="text-sm text-gray-600">{facture.client_telephone || ''}</p>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Commercial</h3>
              <p className="font-bold">{facture.commercial_prenom} {facture.commercial_nom}</p>
              <p className="text-sm text-gray-600">{facture.commercial_email || ''}</p>
            </div>
          </div>

          {/* Lignes */}
          <div className="mb-6">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Panneau / Face</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Prix/mois</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Mois</th>
                  <th className="p-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {facture.lignes.map((ligne: any, index: number) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{ligne.panneau_nom || 'N/A'}</p>
                      <p className="text-sm text-gray-500">Face {ligne.face_orientation || 'N/A'}</p>
                      {ligne.reservation_numero && (
                        <p className="text-xs text-gray-400">Réservation: {ligne.reservation_numero}</p>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {ligne.prix_unitaire?.toLocaleString() || '0'} FCFA
                    </td>
                    <td className="p-3 text-center">
                      {ligne.duree_mois || 1}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {ligne.total_ligne?.toLocaleString() || '0'} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="border-t pt-4">
            <div className="max-w-sm ml-auto">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Total HT</span>
                  <span>{facture.total_ht?.toLocaleString() || '0'} FCFA</span>
                </div>
                {facture.remise > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Remise ({facture.remise}%)</span>
                    <span>- {facture.montant_remise?.toLocaleString() || '0'} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total TTC</span>
                  <span className="text-blue-600">{facture.total_ttc?.toLocaleString() || '0'} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode de paiement et tranches */}
          <div className="mt-6 border-t pt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                {facture.mode_paiement === 'tranche' ? 'Paiement en tranches' : 'Paiement comptant'}
              </h4>

              {facture.mode_paiement === 'tranche' && facture.nombre_tranches > 1 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">
                      {facture.nombre_tranches} tranche(s) de {facture.montant_par_tranche?.toLocaleString() || '0'} FCFA
                    </span>
                    <span className="text-sm font-medium">
                      Payé: {facture.montant_paye?.toLocaleString() || '0'} FCFA
                    </span>
                  </div>

                  <div className="space-y-2">
                    {facture.tranches?.map((tranche: any) => (
                      <div key={tranche.id_tranche} className="flex justify-between items-center p-2 bg-white rounded border">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Tranche {tranche.numero_tranche}</span>
                          <span className="text-sm text-gray-600">
                            Échéance: {new Date(tranche.date_echeance).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{tranche.montant?.toLocaleString() || '0'} FCFA</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getTrancheStatutBadge(tranche.statut)}`}>
                            {tranche.statut === 'paye' ? '✅ Payé' : tranche.statut === 'retard' ? '⏰ Retard' : '⏳ En attente'}
                          </span>
                          {tranche.date_paiement && (
                            <span className="text-xs text-gray-400">
                              Payé le {new Date(tranche.date_paiement).toLocaleDateString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Conditions et notes */}
          {(facture.conditions_paiement || facture.notes) && (
            <div className="mt-6 border-t pt-6">
              <div className="text-sm">
                {facture.conditions_paiement && (
                  <p><strong>Conditions de paiement:</strong> {facture.conditions_paiement}</p>
                )}
                {facture.notes && (
                  <p><strong>Notes:</strong> {facture.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-2">Signature du commercial</p>
              <div className="border-b-2 border-gray-300 h-12"></div>
              <p className="text-sm font-medium mt-2">{facture.commercial_prenom} {facture.commercial_nom}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Signature du client</p>
              <div className="border-b-2 border-gray-300 h-12"></div>
              <p className="text-sm font-medium mt-2">Bon pour accord</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          #facture-content {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}