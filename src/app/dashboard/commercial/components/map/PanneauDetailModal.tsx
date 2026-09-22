// src/app/dashboard/commercial/components/map/PanneauDetailModal.tsx

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, Building2, MapPin, Calendar, ShoppingCart,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { PanneauMap, FaceMap } from './types';
import { ReservationList } from './ReservationList';
import { useCart } from '@/context/CartContext';

interface PanneauDetailModalProps {
  panneau: PanneauMap;
  onClose: () => void;
  onReserveClick?: (panneau: PanneauMap, face?: FaceMap) => void;
  onAddToCart?: (panneau: PanneauMap, face?: FaceMap) => void;
  // ✅ AJOUT : prop optionnelle pour vérifier l'état du panier
  isInCart?: (faceId: number) => boolean;
}

export function PanneauDetailModal({
  panneau,
  onClose,
  onReserveClick,
  onAddToCart,
  isInCart: isInCartProp, // ✅ on récupère la prop
}: PanneauDetailModalProps) {
  // Contexte panier (fallback)
  const cart = useCart() as any;
  const isInCartFn: ((id: number) => boolean) | undefined =
    isInCartProp ?? cart?.isInCart;
  const cartItems: any[] = Array.isArray(cart?.items) ? cart.items : [];

  // ✅ isInCart unifié
  const isInCart = useCallback(
    (faceId: number): boolean => {
      if (typeof isInCartFn === 'function') return !!isInCartFn(faceId);
      return cartItems.some((it) => it?.id_face === faceId);
    },
    [isInCartFn, cartItems]
  );

  const [selectedFaces, setSelectedFaces] = useState<Set<number>>(new Set());
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [reservationsError, setReservationsError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const faces: FaceMap[] = useMemo(() => panneau.faces || [], [panneau.faces]);

  const showToast = useCallback(
    (type: 'success' | 'warning' | 'error', message: string) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ type, message });
      toastTimerRef.current = setTimeout(() => setToast(null), 2800);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Échap + scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow || 'auto';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Chargement des réservations
  useEffect(() => {
    const controller = new AbortController();
    const fetchReservations = async () => {
      setLoadingReservations(true);
      setReservationsError(null);
      try {
        const response = await fetch(
          `/api/panneaux/${panneau.id_panneau}/reservations`,
          { credentials: 'include', signal: controller.signal }
        );
        if (!response.ok) {
          setReservationsError(`Erreur ${response.status}`);
          return;
        }
        const data = await response.json();
        setReservations(Array.isArray(data?.data) ? data.data : []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setReservationsError('Impossible de charger les réservations');
      } finally {
        setLoadingReservations(false);
      }
    };
    fetchReservations();
    return () => controller.abort();
  }, [panneau.id_panneau]);

  // Statuts des faces
  const faceStatus = useMemo(() => {
    const today = new Date();
    let occupees = 0;
    let enPanne = 0;
    for (const f of faces) {
      if (f.a_probleme) { enPanne++; continue; }
      let isOccupied = false;
      if (f.reservations && f.reservations.length > 0) {
        isOccupied = f.reservations.some((r: any) => {
          const debut = new Date(r.date_debut);
          const fin = new Date(r.date_fin);
          return today >= debut && today <= fin;
        });
      } else if (f.date_debut && f.date_fin) {
        const debut = new Date(f.date_debut);
        const fin = new Date(f.date_fin);
        isOccupied = today >= debut && today <= fin;
      }
      if (isOccupied) occupees++;
    }
    const total = faces.length;
    return {
      total,
      occupees,
      enPanne,
      disponibles: Math.max(0, total - occupees - enPanne),
    };
  }, [faces]);

  const toggleFaceSelection = (faceId: number) => {
    setSelectedFaces((prev) => {
      const next = new Set(prev);
      if (next.has(faceId)) next.delete(faceId);
      else next.add(faceId);
      return next;
    });
  };

  // ✅ Toggle simple : on délègue au parent
  const handleAddToCart = (face: FaceMap) => {
    if (!onAddToCart) return;
    onAddToCart(panneau, face);

    if (isInCart(face.id_face)) {
      showToast('success', `✅ Face ${face.orientation || face.id_face} retirée du panier`);
    } else {
      showToast('success', `✅ Face ${face.orientation || face.id_face} ajoutée au panier`);
    }
  };

  // ✅ Toggle pour la sélection multiple
  const handleAddSelectedToCart = () => {
    const list = faces.filter((f) => selectedFaces.has(f.id_face));
    if (list.length === 0) {
      showToast('warning', '⚠️ Sélectionnez au moins une face');
      return;
    }
    if (!onAddToCart) return;

    for (const face of list) {
      onAddToCart(panneau, face);
    }
    setSelectedFaces(new Set());
    showToast('success', `✅ ${list.length} face(s) traitée(s)`);
  };

  const handleReserve = (face: FaceMap) => {
    if (onReserveClick) onReserveClick(panneau, face);
    else showToast('warning', '📅 Réservation à venir');
  };

  const handleReserveAll = () => {
    const available = faces.filter((f) => !f.a_probleme);
    if (available.length === 0) {
      showToast('warning', '⚠️ Aucune face disponible');
      return;
    }
    showToast('warning', `📅 ${available.length} face(s) à réserver - à venir`);
  };

  const toastClasses =
    toast?.type === 'success'
      ? 'bg-green-100 text-green-700 border-green-200'
      : toast?.type === 'error'
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-100 text-amber-700 border-amber-200';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Building2 size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {panneau.nom || `Panneau #${panneau.id_panneau}`}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin size={14} />
                <span>{panneau.adresse || 'Adresse non renseignée'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <X size={24} />
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mx-6 mt-4 p-3 border rounded-lg text-center font-bold ${toastClasses}`}>
            {toast.message}
          </div>
        )}

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{faceStatus.total}</p>
              <p className="text-xs text-gray-500">Faces totales</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{faceStatus.occupees}</p>
              <p className="text-xs text-amber-600">Occupées</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{faceStatus.disponibles}</p>
              <p className="text-xs text-emerald-600">Disponibles</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${panneau.a_probleme ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-2xl font-bold ${panneau.a_probleme ? 'text-red-600' : 'text-green-600'}`}>
                {panneau.a_probleme ? '⚠️' : '✅'}
              </p>
              <p className={`text-xs ${panneau.a_probleme ? 'text-red-600' : 'text-green-600'}`}>
                {panneau.a_probleme ? 'Problème' : 'Opérationnel'}
              </p>
            </div>
          </div>

          {reservationsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} />
              {reservationsError}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-gray-700">Faces et réservations</h3>
              <div className="flex flex-wrap gap-2">
                {selectedFaces.size > 0 && (
                  <button
                    onClick={handleAddSelectedToCart}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition flex items-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Traiter ({selectedFaces.size})
                  </button>
                )}
                {faces.some((f) => !f.a_probleme) && (
                  <button
                    onClick={handleReserveAll}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition flex items-center gap-2"
                  >
                    <Calendar size={16} />
                    Tout réserver
                  </button>
                )}
              </div>
            </div>

            <ReservationList
              faces={faces}
              reservations={reservations}
              selectedFaces={selectedFaces}
              onToggleFace={toggleFaceSelection}
              onReserveClick={handleReserve}
              onAddToCart={handleAddToCart}
              isInCart={isInCart}
              loading={loadingReservations}
            />
          </div>
        </div>

        {/* Pied */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex flex-wrap justify-between items-center gap-2">
          <div className="text-sm text-gray-500">
            {selectedFaces.size} face(s) sélectionnée(s) · {cartItems.length} au panier
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}