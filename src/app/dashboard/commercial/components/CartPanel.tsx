// src/app/dashboard/commercial/components/CartPanel.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, X, Trash2, MapPin, 
  Building2, FileText, Check, Pencil
} from 'lucide-react';
import { useCart, Currency } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext'; // ✅ IMPORT

export function CartPanel() {
  const router = useRouter();
  const { getUserName, getUserEmail } = useAuth(); // ✅ Récupérer les fonctions
  const { 
    items, 
    removeItem, 
    clearCart, 
    getTotalItems, 
    getTotalPrice,
    getTotalPriceInCDF,
    getTotalPriceInUSD,
    updateItemPrice,
    updateCurrency,
    currency
  } = useCart();
  
  const [isOpen, setIsOpen] = useState(false);
  const [clientNom, setClientNom] = useState('');
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');
  const [tempCurrency, setTempCurrency] = useState<Currency>('CDF');

  const handleGenerateProformat = () => {
    if (items.length === 0) {
      alert('Le panier est vide.');
      return;
    }

    // ✅ Vérifier que tous les prix sont saisis
    const itemsWithoutPrice = items.filter(item => !item.prix_saisi || item.prix_saisi <= 0);
    if (itemsWithoutPrice.length > 0) {
      alert(`❌ ${itemsWithoutPrice.length} article(s) n'ont pas de prix. Veuillez saisir tous les prix avant de générer le proformat.`);
      return;
    }

    if (!clientNom.trim()) {
      alert('Veuillez saisir le nom du client.');
      return;
    }

    // ✅ Récupérer les informations du commercial
    const commercialNom = getUserName();
    const commercialEmail = getUserEmail();

    const data = {
      reservations: items.map(item => ({
        id_face: item.id_face,
        id_panneau: item.id_panneau,
        panneau_nom: item.panneau_nom,
        panneau_adresse: item.panneau_adresse,
        orientation: item.orientation,
        type_face: item.type_face,
        dimension_m2: item.dimension_m2,
        date_debut: item.date_debut,
        date_fin: item.date_fin,
        prix_saisi: item.prix_saisi || 0,
        currency: item.currency || 'CDF',
        ville: item.panneau_ville,
        quartier: item.panneau_quartier,
        hauteur_cm: item.hauteur_cm,
        largeur_cm: item.largeur_cm,
        surface: item.dimension_m2
      })),
      client_nom: clientNom,
      total_cdf: getTotalPriceInCDF(),
      total_usd: getTotalPriceInUSD(),
      currency: currency,
      commercial_nom: commercialNom, // ✅ Ajout du nom du commercial
      commercial_email: commercialEmail // ✅ Ajout de l'email du commercial
    };

    localStorage.setItem('cart_proformat_data', JSON.stringify(data));
    router.push('/dashboard/commercial/proformat/cart-preview');
  };

  const handleClearCart = () => {
    if (confirm('Vider le panier ?')) {
      clearCart();
      setClientNom('');
    }
  };

  const startEditPrice = (id_face: number, currentPrice: number, currentCurrency: Currency) => {
    setEditingPrice(id_face);
    setTempPrice(currentPrice > 0 ? currentPrice.toString() : '');
    setTempCurrency(currentCurrency);
  };

  const confirmEditPrice = (id_face: number) => {
    const newPrice = parseFloat(tempPrice);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateItemPrice(id_face, newPrice, tempCurrency);
    }
    setEditingPrice(null);
    setTempPrice('');
  };

  const cancelEditPrice = () => {
    setEditingPrice(null);
    setTempPrice('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, id_face: number) => {
    if (e.key === 'Enter') {
      confirmEditPrice(id_face);
    } else if (e.key === 'Escape') {
      cancelEditPrice();
    }
  };

  const toggleTempCurrency = () => {
    setTempCurrency(prev => prev === 'CDF' ? 'USD' : 'CDF');
  };

  const toggleCurrency = () => {
    const newCurrency: Currency = currency === 'CDF' ? 'USD' : 'CDF';
    updateCurrency(newCurrency);
  };

  const formatPrice = (prix: number, dev: Currency) => {
    if (typeof prix !== 'number' || isNaN(prix) || prix <= 0) {
      return '—';
    }
    if (dev === 'USD') {
      return `$${prix.toLocaleString()}`;
    } else {
      return `${prix.toLocaleString()} FC`;
    }
  };

  if (getTotalItems() === 0) {
    return null;
  }

  const totalCDF = getTotalPriceInCDF();
  const totalUSD = getTotalPriceInUSD();
  const totalItems = getTotalItems();
  const itemsWithoutPrice = items.filter(item => !item.prix_saisi || item.prix_saisi <= 0).length;

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all duration-300 flex items-center gap-2"
      >
        <ShoppingCart size={24} />
        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center -mt-2 -mr-2">
          {getTotalItems()}
        </span>
      </button>

      {/* Panneau du panier */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[480px] max-h-[85vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          {/* En-tête */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-blue-600" />
              <h3 className="font-bold text-gray-800">Panier</h3>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {getTotalItems()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCurrency}
                className={`px-2 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${
                  currency === 'CDF' 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                title="Changer de devise"
              >
                {currency === 'CDF' ? '💰 CDF' : '💵 USD'}
              </button>
              
              <button
                onClick={handleClearCart}
                className="text-red-500 hover:text-red-700 text-xs font-medium"
                title="Vider le panier"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Liste des items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item) => {
              const hasPrice = item.prix_saisi && item.prix_saisi > 0;
              
              return (
                <div key={item.id_face} className={`bg-gray-50 rounded-lg p-3 border ${hasPrice ? 'border-gray-200 hover:border-blue-300' : 'border-red-300 bg-red-50/50'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-sm text-gray-800 truncate">
                          {item.panneau_nom}
                        </span>
                        {!hasPrice && (
                          <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full animate-pulse">
                            Prix manquant
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{item.panneau_adresse}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                          Face {item.orientation}
                        </span>
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {item.type_face}
                        </span>
                        <span className="bg-emerald-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {item.dimension_m2}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.currency === 'USD' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.currency}
                        </span>
                      </div>
                      
                      {/* SECTION PRIX SAISISSABLE */}
                      <div className="flex items-center gap-2 mt-2">
                        {editingPrice === item.id_face ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, item.id_face)}
                              className="w-28 px-2 py-1 border border-blue-400 rounded text-sm font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              autoFocus
                              min="0"
                              step="1000"
                              placeholder="Prix"
                            />
                            <button
                              onClick={toggleTempCurrency}
                              className={`px-2 py-1 rounded text-xs font-bold transition ${
                                tempCurrency === 'USD' 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                            >
                              {tempCurrency}
                            </button>
                            <button
                              onClick={() => confirmEditPrice(item.id_face)}
                              className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition"
                              title="Valider"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEditPrice}
                              className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
                              title="Annuler"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${hasPrice ? (item.currency === 'USD' ? 'text-green-600' : 'text-blue-600') : 'text-red-400 italic'}`}>
                              {formatPrice(item.prix_saisi, item.currency)}
                            </span>
                            <button
                              onClick={() => startEditPrice(item.id_face, item.prix_saisi, item.currency)}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Saisir le prix"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id_face)}
                      className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0 p-1 hover:bg-red-50 rounded transition"
                      title="Retirer du panier"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pied de page */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Nom du client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                placeholder="Saisir le nom du client"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Total */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Total {currency === 'CDF' ? 'en CDF' : 'en USD'}
                </span>
                <span className={`text-lg font-bold ${
                  currency === 'USD' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {currency === 'CDF' 
                    ? `${totalCDF.toLocaleString()} FC`
                    : `$${totalUSD.toLocaleString()}`
                  }
                </span>
              </div>
              
              {currency === 'CDF' && totalUSD > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-1">
                  <span>Total en USD</span>
                  <span>${totalUSD.toLocaleString()}</span>
                </div>
              )}
              {currency === 'USD' && totalCDF > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-1">
                  <span>Total en CDF</span>
                  <span>{totalCDF.toLocaleString()} FC</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Articles</span>
                <span>{totalItems}</span>
              </div>
              
              {itemsWithoutPrice > 0 && (
                <div className="flex items-center justify-between text-xs text-red-500 border-t border-red-200 pt-1 animate-pulse">
                  <span>⚠️ Prix manquants</span>
                  <span>{itemsWithoutPrice}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateProformat}
              disabled={items.length === 0 || !clientNom.trim() || itemsWithoutPrice > 0}
              className={`w-full py-2.5 rounded-lg font-bold text-sm transition flex items-center justify-center gap-2 ${
                items.length > 0 && clientNom.trim() && itemsWithoutPrice === 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FileText size={18} />
              {itemsWithoutPrice > 0 
                ? `❌ ${itemsWithoutPrice} prix manquant(s)` 
                : 'Générer le Proformat'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
