'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/map/ReservationList.tsximport React, { useState, useCallback, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { FaceMap } from './types';
import { ReservationCard } from './ReservationCard';

interface ReservationListProps {
  faces: FaceMap[];
  reservations: any[];
  selectedFaces: Set<number>;
  onToggleFace: (faceId: number) => void;
  onReserveClick: (face: FaceMap) => void;
  onAddToCart: (face: FaceMap) => void;
  isInCart: (faceId: number) => boolean;
  loading: boolean;
}

export function ReservationList({ 
  faces, 
  reservations, 
  selectedFaces, 
  onToggleFace,
  onReserveClick,
  onAddToCart,
  isInCart,
  loading
}: ReservationListProps) {
  const [expandedFaces, setExpandedFaces] = useState<Set<number>>(new Set());

  const toggleExpand = useCallback((faceId: number) => {
    setExpandedFaces(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(faceId)) {
        newExpanded.delete(faceId);
      } else {
        newExpanded.add(faceId);
      }
      return newExpanded;
    });
  }, []);

  // ✅ Memoizer les calculs pour éviter les re-calculs à chaque render
  const today = useMemo(() => new Date(), []);

  const { facesEnCours, facesFutures, facesLibres } = useMemo(() => {
    const enCours = faces.filter((f: FaceMap) => {
      if (f.reservations && f.reservations.length > 0) {
        return f.reservations.some((r: any) => {
          const debut = new Date(r.date_debut);
          const fin = new Date(r.date_fin);
          return today >= debut && today <= fin;
        });
      }
      if (f.date_debut && f.date_fin) {
        const debut = new Date(f.date_debut);
        const fin = new Date(f.date_fin);
        return today >= debut && today <= fin;
      }
      return false;
    });

    const futures = faces.filter((f: FaceMap) => {
      if (f.reservations && f.reservations.length > 0) {
        return f.reservations.some((r: any) => {
          const debut = new Date(r.date_debut);
          return today < debut;
        });
      }
      if (f.date_debut) {
        const debut = new Date(f.date_debut);
        return today < debut;
      }
      return false;
    });

    const libres = faces.filter((f: FaceMap) => {
      const estEnCours = enCours.some((face: FaceMap) => face.id_face === f.id_face);
      const estFuture = futures.some((face: FaceMap) => face.id_face === f.id_face);
      return !estEnCours && !estFuture && !f.a_probleme;
    });

    return { facesEnCours: enCours, facesFutures: futures, facesLibres: libres };
  }, [faces, today]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ============================================ */}
      {/* FACES EN COURS */}
      {/* ============================================ */}
      {facesEnCours.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-green-500 rounded-full" />
            En cours ({facesEnCours.length})
          </h4>
          <div className="space-y-2">
            {facesEnCours.map((face: FaceMap) => (
              <ReservationCard
                key={face.id_face}
                face={face}
                type="encours"
                isSelected={selectedFaces.has(face.id_face)}
                isExpanded={expandedFaces.has(face.id_face)}
                onToggleSelect={() => onToggleFace(face.id_face)}
                onToggleExpand={() => toggleExpand(face.id_face)}
                onReserve={onReserveClick}
                onAddToCart={onAddToCart}
                isInCart={isInCart(face.id_face)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* FACES FUTURES */}
      {/* ============================================ */}
      {facesFutures.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            Réservations futures ({facesFutures.length})
          </h4>
          <div className="space-y-2">
            {facesFutures.map((face: FaceMap) => (
              <ReservationCard
                key={face.id_face}
                face={face}
                type="future"
                isSelected={selectedFaces.has(face.id_face)}
                isExpanded={expandedFaces.has(face.id_face)}
                onToggleSelect={() => onToggleFace(face.id_face)}
                onToggleExpand={() => toggleExpand(face.id_face)}
                onReserve={onReserveClick}
                onAddToCart={onAddToCart}
                isInCart={isInCart(face.id_face)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* FACES LIBRES */}
      {/* ============================================ */}
      {facesLibres.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
            Disponibles ({facesLibres.length})
          </h4>
          <div className="space-y-2">
            {facesLibres.map((face: FaceMap) => (
              <ReservationCard
                key={face.id_face}
                face={face}
                type="libre"
                isSelected={selectedFaces.has(face.id_face)}
                isExpanded={expandedFaces.has(face.id_face)}
                onToggleSelect={() => onToggleFace(face.id_face)}
                onToggleExpand={() => toggleExpand(face.id_face)}
                onReserve={onReserveClick}
                onAddToCart={onAddToCart}
                isInCart={isInCart(face.id_face)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* AUCUNE FACE */}
      {/* ============================================ */}
      {facesEnCours.length === 0 && facesFutures.length === 0 && facesLibres.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-medium">Aucune face disponible</p>
          <p className="text-xs text-gray-400 mt-1">
            Essayez de modifier vos filtres
          </p>
        </div>
      )}
    </div>
  );
}