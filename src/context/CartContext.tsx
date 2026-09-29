'use client';

// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Currency = 'CDF' | 'USD';

export interface CartItem {
  id_face: number;
  id_panneau: number;
  panneau_nom: string;
  panneau_adresse: string;
  panneau_ville?: string;
  panneau_quartier?: string;
  orientation: string;
  type_face: string;
  dimension_m2: string;
  statut: string;
  date_debut?: string;
  date_fin?: string;
  prix_saisi: number;
  prix_original?: number;
  currency: Currency;
  hauteur_cm?: number;
  largeur_cm?: number;
  id_face_original?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id_face: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  isInCart: (id_face: number) => boolean;
  getTotalPrice: () => number;
  getTotalPriceInCDF: () => number;
  getTotalPriceInUSD: () => number;
  updateItemPrice: (id_face: number, prix: number, currency: Currency) => void;
  updateCurrency: (newCurrency: Currency) => void;
  recalculateAllPrices: () => void;
  currency: Currency;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================
// ✅ HELPERS localStorage (safe en navigation privée)
// ============================================
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Navigation privée : silencieux
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currency, setCurrency] = useState<Currency>('CDF');

  // ============================================
  // Chargement initial
  // ============================================
  useEffect(() => {
    const saved = safeGetItem('cart_items');
    const savedCurrency = safeGetItem('cart_currency') as Currency | null;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validItems = parsed.map((item: any) => ({
          ...item,
          prix_saisi: typeof item.prix_saisi === 'number' ? item.prix_saisi : 0,
          currency: item.currency || 'CDF'
        }));
        setItems(validItems);
      } catch (e) {
        console.error('Erreur chargement panier:', e);
        setItems([]);
      }
    }

    if (savedCurrency && (savedCurrency === 'CDF' || savedCurrency === 'USD')) {
      setCurrency(savedCurrency);
    }
  }, []);

  // ============================================
  // Persistance items
  // ============================================
  useEffect(() => {
    safeSetItem('cart_items', JSON.stringify(items));
  }, [items]);

  // ============================================
  // Persistance currency
  // ============================================
  useEffect(() => {
    safeSetItem('cart_currency', currency);
  }, [currency]);

  // ✅ Recalculer les prix - mais ne pas forcer de prix par défaut
  const recalculateAllPrices = () => {
    // Ne rien faire automatiquement, l'utilisateur doit saisir les prix
    console.log('📝 Les prix doivent être saisis manuellement');
  };

  const addItem = (item: CartItem) => {
    const validItem = {
      ...item,
      prix_saisi: 0,
      prix_original: 0,
      currency: item.currency || 'CDF'
    };

    setItems(prev => {
      if (prev.some(i => i.id_face === validItem.id_face)) {
        return prev;
      }
      return [...prev, validItem];
    });
  };

  const removeItem = (id_face: number) => {
    setItems(prev => prev.filter(item => item.id_face !== id_face));
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => items.length;

  const isInCart = (id_face: number) => {
    return items.some(item => item.id_face === id_face);
  };

  // ✅ Total en CDF
  const getTotalPriceInCDF = () => {
    return items.reduce((sum, item) => {
      if (item.currency === 'CDF') {
        const prix = typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi)
          ? item.prix_saisi
          : 0;
        return sum + prix;
      }
      return sum;
    }, 0);
  };

  // ✅ Total en USD
  const getTotalPriceInUSD = () => {
    return items.reduce((sum, item) => {
      if (item.currency === 'USD') {
        const prix = typeof item.prix_saisi === 'number' && !isNaN(item.prix_saisi)
          ? item.prix_saisi
          : 0;
        return sum + prix;
      }
      return sum;
    }, 0);
  };

  // ✅ Total dans la devise actuelle
  const getTotalPrice = () => {
    if (currency === 'CDF') {
      return getTotalPriceInCDF();
    } else {
      return getTotalPriceInUSD();
    }
  };

  const updateItemPrice = (id_face: number, prix: number, newCurrency: Currency) => {
    const validPrix = typeof prix === 'number' && !isNaN(prix) ? prix : 0;
    setItems(prev => {
      return prev.map(item =>
        item.id_face === id_face
          ? { ...item, prix_saisi: validPrix, currency: newCurrency, prix_original: validPrix }
          : item
      );
    });
  };

  const updateCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
  };

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      clearCart,
      getTotalItems,
      isInCart,
      getTotalPrice,
      getTotalPriceInCDF,
      getTotalPriceInUSD,
      updateItemPrice,
      updateCurrency,
      recalculateAllPrices,
      currency
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}