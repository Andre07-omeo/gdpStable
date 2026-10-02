'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/commercial/components/PanneauxTable.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Eye, Calendar, Building2, User, AlertTriangle, AlertCircle, XCircle, Timer,
  Layout, LayoutGrid, Grid, Layers, Box, ShoppingCart, CheckCircle, ChevronDown, MapPin,
  Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, RotateCcw, SlidersHorizontal
} from 'lucide-react';
import { CommercialPanneau, CommercialFace } from '../types/commercial.types';
import { useCart } from '@/context/CartContext';
import { CartItem, Currency } from '@/context/CartContext';

interface PanneauxTableProps {
  panneaux: CommercialPanneau[];
  onFaceClick: (panneau: CommercialPanneau, face: CommercialFace) => void;
  onReserveClick: (panneau: CommercialPanneau, face?: CommercialFace) => void;
  loading?: boolean;
}

type SortKey =
  | 'panneau_nom'
  | 'adresse'
  | 'troncon'
  | 'type_face'
  | 'orientation'
  | 'dimension'
  | 'client'
  | 'commercial'
  | 'date_debut'
  | 'statut';

type SortDir = 'asc' | 'desc' | null;

interface ColumnFilters {
  troncon: string[];
  type_face: string[];
  orientation: string[];
  statut: string[];
  dimensionMin: string;
  dimensionMax: string;
  client: string;
  commercial: string;
}

const EMPTY_FILTERS: ColumnFilters = {
  troncon: [],
  type_face: [],
  orientation: [],
  statut: [],
  dimensionMin: '',
  dimensionMax: '',
  client: '',
  commercial: '',
};

// Convertit "12.00 m²" en nombre
const parseDimensionValue = (dim: string): number => {
  if (!dim || dim === 'N/A') return 0;
  const m = String(dim).match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  return parseFloat(m[1].replace(',', '.'));
};

// ✅ Extrait le tronçon / commune d'un panneau
const getTroncon = (panneau: CommercialPanneau): string => {
  const p = panneau as any;
  return (
    p.troncon ||
    p.commune ||
    p.troncon_nom ||
    p.commune_nom ||
    p.quartier ||
    'N/A'
  );
};

// ✅ Extrait hauteur et largeur en MÈTRES depuis une face
//    Retourne { hauteur: number, largeur: number, source: string }
const getDimensionsRaw = (face: CommercialFace): { hauteur: number; largeur: number; source: string } => {
  const f = face as any;

  // 1) Champs explicites hauteur_m / largeur_m
  let h = parseFloat(String(f.hauteur_m ?? 0).replace(',', '.'));
  let l = parseFloat(String(f.largeur_m ?? 0).replace(',', '.'));
  if (h > 0 && l > 0) return { hauteur: h, largeur: l, source: 'hauteur_m/largeur_m' };

  // 2) Champs hauteur / largeur (en mètres par convention)
  h = parseFloat(String(f.hauteur ?? 0).replace(',', '.'));
  l = parseFloat(String(f.largeur ?? 0).replace(',', '.'));
  if (h > 0 && l > 0) return { hauteur: h, largeur: l, source: 'hauteur/largeur' };

  // 3) Champs height / width (anglais)
  h = parseFloat(String(f.height ?? 0).replace(',', '.'));
  l = parseFloat(String(f.width ?? 0).replace(',', '.'));
  if (h > 0 && l > 0) return { hauteur: h, largeur: l, source: 'height/width' };

  // 4) Champs hauteur_cm / largeur_cm → on convertit en m
  const hcm = parseFloat(String(f.hauteur_cm ?? 0).replace(',', '.'));
  const lcm = parseFloat(String(f.largeur_cm ?? 0).replace(',', '.'));
  if (hcm > 0 && lcm > 0) return { hauteur: hcm / 100, largeur: lcm / 100, source: 'hauteur_cm/largeur_cm' };

  // 5) Chaîne type "4x3", "4 x 3", "4m x 3m"
  const candidates = [
    f.dimension,
    f.dimensions,
    f.format,
    f.dimension_face,
    f.taille,
    f.size,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const str = String(candidate).trim();
    const match = str.match(/(\d+(?:[.,]\d+)?)\s*(?:m)?\s*[xX×*]\s*(\d+(?:[.,]\d+)?)\s*(?:m)?/i);
    if (match) {
      const a = parseFloat(match[1].replace(',', '.'));
      const b = parseFloat(match[2].replace(',', '.'));
      if (!isNaN(a) && !isNaN(b) && a > 0 && b > 0) {
        return { hauteur: a, largeur: b, source: 'string' };
      }
    }
  }

  return { hauteur: 0, largeur: 0, source: '' };
};

// ✅ Calcule la surface en m² (hauteur × largeur)
const getDimensionM2 = (face: CommercialFace): string => {
  const f = face as any;

  // 1) Si dimension_m2 est déjà fournie et valide → la prendre en priorité
  const rawDim = f.dimension_m2;
  if (rawDim !== undefined && rawDim !== null && rawDim !== '' && rawDim !== 'N/A') {
    const num = parseFloat(String(rawDim).replace(',', '.').replace(/[^\d.]/g, ''));
    if (!isNaN(num) && num > 0) return num.toFixed(2) + ' m²';
  }

  // 2) Sinon, calculer hauteur × largeur (en mètres)
  const { hauteur, largeur } = getDimensionsRaw(face);
  if (hauteur > 0 && largeur > 0) {
    return (hauteur * largeur).toFixed(2) + ' m²';
  }

  return 'N/A';
};

// ✅ Retourne la dimension brute formatée "4.00m × 3.00m" (ou vide si indisponible)
const getDimensionRawLabel = (face: CommercialFace): string => {
  const { hauteur, largeur } = getDimensionsRaw(face);
  if (hauteur > 0 && largeur > 0) {
    return `${hauteur.toFixed(2)}m × ${largeur.toFixed(2)}m`;
  }
  return '';
};

export function PanneauxTable({ panneaux, onFaceClick, onReserveClick, loading = false }: PanneauxTableProps) {
  const [expandedPanneaux, setExpandedPanneaux] = useState<Set<string>>(new Set());
  const [, setCurrentTime] = useState(new Date());
  const { addItem, removeItem, isInCart, items } = useCart();

  // ✅ Filtres globaux
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // ✅ Filtres rapides
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());

  // ✅ Panneau de filtres ouvert (desktop uniquement)
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fermer le panneau de filtres au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPanneauKey = (panneau: CommercialPanneau): string => {
    return String((panneau as any).idPan ?? (panneau as any).id_panneau ?? (panneau as any).id ?? '');
  };

  const togglePanneau = (id: string) => {
    setExpandedPanneaux((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const getStatusColor = (statut: string): string => {
    switch (statut) {
      case 'Libre': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Occupé': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Réservé': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'En attente': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Problème': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (statut: string): string => {
    switch (statut) {
      case 'Libre': return 'bg-emerald-500';
      case 'Occupé': return 'bg-blue-500';
      case 'Réservé': return 'bg-purple-500';
      case 'En attente': return 'bg-amber-500';
      case 'Problème': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (statut: string): string => {
    switch (statut) {
      case 'Libre': return '🟢';
      case 'Occupé': return '🔵';
      case 'Réservé': return '🟣';
      case 'En attente': return '🟡';
      case 'Problème': return '🔴';
      default: return '⚪';
    }
  };

  const getTypeFaceIcon = (type: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('classique') || t.includes('standard')) return <Layout size={14} className="text-gray-500" />;
    if (t.includes('scroller') || t.includes('défileur')) return <LayoutGrid size={14} className="text-blue-500" />;
    if (t.includes('digital') || t.includes('led') || t.includes('lcd')) return <Grid size={14} className="text-purple-500" />;
    if (t.includes('panoramique')) return <Layers size={14} className="text-green-500" />;
    if (t.includes('lumineux')) return <Grid size={14} className="text-orange-500" />;
    if (t.includes('bâche') || t.includes('bache')) return <Layout size={14} className="text-teal-500" />;
    if (t.includes('trivision')) return <Layers size={14} className="text-indigo-500" />;
    return <Box size={14} className="text-gray-400" />;
  };

  const isReservationValidated = (r: any): boolean => {
    if (!r) return false;
    const s = String(r.statut || '').toLowerCase();
    return (
      s === 'validée' || s === 'validee' || s === 'validé' || s === 'valide' ||
      s === 'confirmée' || s === 'confirmee' || s === 'confirmé' || s === 'confirme' ||
      s === 'approuvée' || s === 'approuvee' || s === 'approuvé' || s === 'approuve' ||
      s === 'acceptée' || s === 'acceptee' || s === 'accepté' || s === 'accepte'
    );
  };

  const isReservationPending = (r: any): boolean => {
    if (!r) return false;
    const s = String(r.statut || '').toLowerCase();
    return s === 'en attente' || s === 'en attente de validation' || s === 'pending';
  };

  const hasProblem = (face: CommercialFace): boolean => face.a_probleme === 1;

  const getClientFullName = (face: CommercialFace): string => {
    if (face.client_prenom && face.client_nom) return `${face.client_prenom} ${face.client_nom}`;
    return face.client_nom || 'N/A';
  };

  const getCommercialFullName = (face: CommercialFace): string => {
    if (face.commercial_prenom && face.commercial_nom) return `${face.commercial_prenom} ${face.commercial_nom}`;
    return face.commercial_nom || 'N/A';
  };

  const formatDate = (date: string | null): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return date; }
  };

  const formatDateShort = (date: string | null): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    } catch { return date; }
  };

  const getDuration = (d1: string | null, d2: string | null): number | null => {
    if (!d1 || !d2) return null;
    try {
      return Math.ceil((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60 * 60 * 24));
    } catch { return null; }
  };

  const getTimerColor = (hours: number) => {
    if (hours <= 0) return 'text-red-600';
    if (hours <= 2) return 'text-orange-600 animate-pulse';
    if (hours <= 6) return 'text-amber-600';
    if (hours <= 12) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleToggleCart = (panneau: CommercialPanneau, face: CommercialFace, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasProblem(face)) {
      alert('❌ Impossible d\'ajouter cette face au panier car elle a un problème.');
      return;
    }
    const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(String(face.id_face) || '0');
    const panneauId = typeof panneau.idPan === 'number' ? panneau.idPan : parseInt(String(panneau.idPan) || '0');

    if (isInCart(faceId)) { removeItem(faceId); return; }

    const cartItem: CartItem = {
      id_face: faceId,
      id_panneau: panneauId,
      panneau_nom: panneau.nom || 'Panneau sans nom',
      panneau_adresse: panneau.adresse || 'Adresse non définie',
      panneau_ville: (panneau as any).ville || 'Non spécifié',
      panneau_quartier: (panneau as any).quartier || 'Non spécifié',
      orientation: face.orientation || 'N/A',
      type_face: face.type_face || 'Standard',
      dimension_m2: getDimensionM2(face),
      statut: face.status || 'Libre',
      date_debut: face.date_debut || undefined,
      date_fin: face.date_fin || undefined,
      prix_saisi: (face as any).prix_saisi || 0,
      hauteur_cm: (face as any).hauteur_cm || 0,
      largeur_cm: (face as any).largeur_cm || 0,
      id_face_original: faceId,
      currency: 'USD' as Currency,
    };
    addItem(cartItem);
  };

  const isFaceInCart = (face: CommercialFace): boolean => {
    const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(String(face.id_face) || '0');
    return isInCart(faceId);
  };

  // ============================================
  // ✅ VALEURS UNIQUES POUR LES FILTRES
  // ============================================
  const uniqueValues = useMemo(() => {
    const troncons = new Set<string>();
    const types = new Set<string>();
    const orientations = new Set<string>();
    const statuts = new Set<string>();

    panneaux.forEach((p) => {
      const tr = getTroncon(p);
      if (tr && tr !== 'N/A') troncons.add(tr);
      (p.faces || []).forEach((f) => {
        if (f.type_face) types.add(f.type_face);
        if (f.orientation) orientations.add(f.orientation.toUpperCase());
        if (f.status) statuts.add(f.status);
      });
    });

    return {
      troncons: Array.from(troncons).sort(),
      types: Array.from(types).sort(),
      orientations: Array.from(orientations).sort(),
      statuts: Array.from(statuts).sort(),
    };
  }, [panneaux]);

  // ============================================
  // ✅ APPLICATION DES FILTRES + TRI
  // ============================================
  const filteredPanneaux = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const result = panneaux.map((panneau) => {
      const tronconValue = getTroncon(panneau);

      if (columnFilters.troncon.length > 0 && !columnFilters.troncon.includes(tronconValue)) {
        return { ...panneau, faces: [] };
      }

      const filteredFaces = (panneau.faces || []).filter((face) => {
        const clientName = getClientFullName(face).toLowerCase();
        const commercialName = getCommercialFullName(face).toLowerCase();
        const typeFace = (face.type_face || '').toLowerCase();
        const orientation = (face.orientation || '').toLowerCase();
        const statut = (face.status || '').toLowerCase();
        const dimValue = parseDimensionValue(getDimensionM2(face));

        if (q) {
          const haystack = [
            panneau.nom,
            panneau.adresse,
            (panneau as any).ville,
            (panneau as any).quartier,
            tronconValue,
            face.type_face,
            face.orientation,
            face.status,
            clientName,
            commercialName,
            getDimensionM2(face),
            getDimensionRawLabel(face),
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (columnFilters.type_face.length > 0 && !columnFilters.type_face.includes(face.type_face || '')) {
          return false;
        }

        if (columnFilters.orientation.length > 0 && !columnFilters.orientation.includes((face.orientation || '').toUpperCase())) {
          return false;
        }

        if (columnFilters.statut.length > 0) {
          const s = face.status || 'Libre';
          if (!columnFilters.statut.includes(s)) return false;
        }

        if (columnFilters.dimensionMin) {
          const min = parseFloat(columnFilters.dimensionMin.replace(',', '.'));
          if (!isNaN(min) && dimValue < min) return false;
        }

        if (columnFilters.dimensionMax) {
          const max = parseFloat(columnFilters.dimensionMax.replace(',', '.'));
          if (!isNaN(max) && dimValue > max) return false;
        }

        if (columnFilters.client && !clientName.includes(columnFilters.client.toLowerCase())) {
          return false;
        }

        if (columnFilters.commercial && !commercialName.includes(columnFilters.commercial.toLowerCase())) {
          return false;
        }

        if (quickFilters.has('problem') && !hasProblem(face)) return false;
        if (quickFilters.has('pending') && !isReservationPending(face.reservation)) return false;
        if (quickFilters.has('free') && (face.reservation || hasProblem(face))) return false;
        if (quickFilters.has('reserved') && !face.reservation) return false;
        if (quickFilters.has('cart')) {
          const faceId = typeof face.id_face === 'number' ? face.id_face : parseInt(String(face.id_face) || '0');
          if (!isInCart(faceId)) return false;
        }

        return true;
      });

      return { ...panneau, faces: filteredFaces };
    }).filter((p) => (p.faces || []).length > 0);

    if (sortKey && sortDir) {
      result.forEach((p) => {
        p.faces.sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          switch (sortKey) {
            case 'panneau_nom':
              valA = p.nom || '';
              valB = p.nom || '';
              break;
            case 'adresse':
              valA = p.adresse || '';
              valB = p.adresse || '';
              break;
            case 'troncon':
              valA = getTroncon(p);
              valB = getTroncon(p);
              break;
            case 'type_face':
              valA = a.type_face || '';
              valB = b.type_face || '';
              break;
            case 'orientation':
              valA = (a.orientation || '').toUpperCase();
              valB = (b.orientation || '').toUpperCase();
              break;
            case 'dimension':
              valA = parseDimensionValue(getDimensionM2(a));
              valB = parseDimensionValue(getDimensionM2(b));
              break;
            case 'client':
              valA = getClientFullName(a).toLowerCase();
              valB = getClientFullName(b).toLowerCase();
              break;
            case 'commercial':
              valA = getCommercialFullName(a).toLowerCase();
              valB = getCommercialFullName(b).toLowerCase();
              break;
            case 'date_debut':
              valA = a.date_debut ? new Date(a.date_debut).getTime() : 0;
              valB = b.date_debut ? new Date(b.date_debut).getTime() : 0;
              break;
            case 'statut':
              valA = (a.status || '').toLowerCase();
              valB = (b.status || '').toLowerCase();
              break;
          }

          if (typeof valA === 'number' && typeof valB === 'number') {
            return sortDir === 'asc' ? valA - valB : valB - valA;
          }
          return sortDir === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        });
      });

      if (sortKey === 'panneau_nom' || sortKey === 'adresse' || sortKey === 'troncon') {
        result.sort((a, b) => {
          let valA = '';
          let valB = '';
          if (sortKey === 'panneau_nom') {
            valA = String(a.nom || '').toLowerCase();
            valB = String(b.nom || '').toLowerCase();
          } else if (sortKey === 'adresse') {
            valA = String(a.adresse || '').toLowerCase();
            valB = String(b.adresse || '').toLowerCase();
          } else {
            valA = getTroncon(a).toLowerCase();
            valB = getTroncon(b).toLowerCase();
          }
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });
      }
    }

    return result;
  }, [panneaux, searchQuery, columnFilters, quickFilters, sortKey, sortDir, items]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (columnFilters.troncon.length > 0) count++;
    if (columnFilters.type_face.length > 0) count++;
    if (columnFilters.orientation.length > 0) count++;
    if (columnFilters.statut.length > 0) count++;
    if (columnFilters.dimensionMin) count++;
    if (columnFilters.dimensionMax) count++;
    if (columnFilters.client) count++;
    if (columnFilters.commercial) count++;
    count += quickFilters.size;
    return count;
  }, [searchQuery, columnFilters, quickFilters]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setColumnFilters(EMPTY_FILTERS);
    setQuickFilters(new Set());
    setSortKey(null);
    setSortDir(null);
    setOpenFilter(null);
  };

  const toggleQuickFilter = (key: string) => {
    setQuickFilters((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortKey(null);
      setSortDir(null);
    } else {
      setSortDir('asc');
    }
  };

  const toggleMultiFilter = (field: 'troncon' | 'type_face' | 'orientation' | 'statut', value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="text-gray-400 opacity-60" />;
    if (sortDir === 'asc') return <ArrowUp size={12} className="text-blue-600" />;
    return <ArrowDown size={12} className="text-blue-600" />;
  };

  const isColumnFiltered = (field: 'troncon' | 'type_face' | 'orientation' | 'statut' | 'dimension' | 'client' | 'commercial'): boolean => {
    switch (field) {
      case 'troncon': return columnFilters.troncon.length > 0;
      case 'type_face': return columnFilters.type_face.length > 0;
      case 'orientation': return columnFilters.orientation.length > 0;
      case 'statut': return columnFilters.statut.length > 0;
      case 'dimension': return !!(columnFilters.dimensionMin || columnFilters.dimensionMax);
      case 'client': return !!columnFilters.client;
      case 'commercial': return !!columnFilters.commercial;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto" />
        <p className="mt-4 text-gray-500 text-sm">Chargement des panneaux...</p>
      </div>
    );
  }

  if (!panneaux || panneaux.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4 opacity-40">📭</div>
        <h3 className="text-base font-semibold text-gray-600">Aucun panneau trouvé</h3>
        <p className="text-sm text-gray-400 mt-1">Ajustez vos filtres pour voir plus de résultats</p>
      </div>
    );
  }

  const renderFaceActions = (panneau: CommercialPanneau, face: CommercialFace, faceHasProblem: boolean, inCart: boolean, compact: boolean = false) => (
    <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-1.5'} flex-wrap`}>
      <button
        onClick={(e) => { e.stopPropagation(); onFaceClick(panneau, face); }}
        className={`${compact ? 'px-2.5 py-1.5' : 'px-2.5 py-1.5'} bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors border border-gray-200`}
        title="Voir les détails"
      >
        <Eye size={compact ? 14 : 14} className="inline" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!faceHasProblem) onReserveClick(panneau, face);
        }}
        disabled={faceHasProblem}
        className={`${compact ? 'px-2.5 py-1.5' : 'px-2.5 py-1.5'} rounded-lg text-xs font-semibold transition-colors border ${
          faceHasProblem
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-gray-900 text-white hover:bg-gray-700 border-gray-900'
        }`}
        title={faceHasProblem ? '❌ Réservation impossible' : 'Réserver cette face'}
      >
        <Calendar size={compact ? 14 : 14} className="inline" />
        {!compact && <span className="ml-1">{faceHasProblem ? 'Indisponible' : 'Réserver'}</span>}
      </button>

      <button
        onClick={(e) => handleToggleCart(panneau, face, e)}
        disabled={faceHasProblem}
        className={`${compact ? 'px-2.5 py-1.5' : 'px-2.5 py-1.5'} rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border ${
          faceHasProblem
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : inCart
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600'
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
        }`}
        title={faceHasProblem ? '❌ Face avec problème' : inCart ? 'Retirer du panier' : 'Ajouter au panier'}
      >
        {inCart ? (<><CheckCircle size={compact ? 14 : 14} />{!compact && <span>Dans le panier</span>}</>) : (<><ShoppingCart size={compact ? 14 : 14} />{!compact && <span>Ajouter</span>}</>)}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

      {/* ============================================
          ✅ BARRE DE FILTRES GLOBALE
          ============================================ */}
      <div className="border-b border-gray-200 bg-gradient-to-b from-white to-gray-50 p-3 sm:p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher panneau, client, commercial, tronçon, statut..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded"
                title="Effacer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowMobileFilters((v) => !v)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition relative"
          >
            <SlidersHorizontal size={14} />
            <span>Filtres</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Réinitialiser</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mr-1">
            Rapide:
          </span>
          <button
            onClick={() => toggleQuickFilter('problem')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
              quickFilters.has('problem')
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ⚠ Problème
          </button>
          <button
            onClick={() => toggleQuickFilter('pending')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
              quickFilters.has('pending')
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            ⏳ En attente
          </button>
          <button
            onClick={() => toggleQuickFilter('free')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
              quickFilters.has('free')
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            🟢 Libre
          </button>
          <button
            onClick={() => toggleQuickFilter('reserved')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
              quickFilters.has('reserved')
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            🟣 Réservé
          </button>
          <button
            onClick={() => toggleQuickFilter('cart')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition ${
              quickFilters.has('cart')
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            🛒 Dans panier
          </button>
        </div>

        {showMobileFilters && (
          <div className="lg:hidden mt-3 pt-3 border-t border-gray-200 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Tronçon (Commune)</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueValues.troncons.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleMultiFilter('troncon', t)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition ${
                      columnFilters.troncon.includes(t)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {uniqueValues.troncons.length === 0 && (
                  <span className="text-[11px] text-gray-400 italic">Aucun tronçon</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Type de face</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueValues.types.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleMultiFilter('type_face', t)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition ${
                      columnFilters.type_face.includes(t)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
                {uniqueValues.types.length === 0 && (
                  <span className="text-[11px] text-gray-400 italic">Aucun type</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Orientation</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueValues.orientations.map((o) => (
                  <button
                    key={o}
                    onClick={() => toggleMultiFilter('orientation', o)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition ${
                      columnFilters.orientation.includes(o)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {o}
                  </button>
                ))}
                {uniqueValues.orientations.length === 0 && (
                  <span className="text-[11px] text-gray-400 italic">Aucune orientation</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Statut</div>
              <div className="flex flex-wrap gap-1.5">
                {uniqueValues.statuts.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleMultiFilter('statut', s)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition ${
                      columnFilters.statut.includes(s)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
                {uniqueValues.statuts.length === 0 && (
                  <span className="text-[11px] text-gray-400 italic">Aucun statut</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Dimension (m²)</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={columnFilters.dimensionMin}
                  onChange={(e) => setColumnFilters((p) => ({ ...p, dimensionMin: e.target.value }))}
                  placeholder="Min"
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <span className="text-gray-400 text-xs">→</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={columnFilters.dimensionMax}
                  onChange={(e) => setColumnFilters((p) => ({ ...p, dimensionMax: e.target.value }))}
                  placeholder="Max"
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Client</div>
              <input
                type="text"
                value={columnFilters.client}
                onChange={(e) => setColumnFilters((p) => ({ ...p, client: e.target.value }))}
                placeholder="Nom du client..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5">Commercial</div>
              <input
                type="text"
                value={columnFilters.commercial}
                onChange={(e) => setColumnFilters((p) => ({ ...p, commercial: e.target.value }))}
                placeholder="Nom du commercial..."
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        )}

        <div className="mt-2.5 text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
          <span>
            <strong className="text-gray-700">{filteredPanneaux.length}</strong> panneau(x) ·{' '}
            <strong className="text-gray-700">
              {filteredPanneaux.reduce((a, p) => a + (p.faces || []).length, 0)}
            </strong>{' '}
            face(s)
          </span>
          {activeFilterCount > 0 && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-blue-600 font-semibold">{activeFilterCount} filtre(s) actif(s)</span>
            </>
          )}
        </div>
      </div>

      {/* ============================================
          ✅ VUE MOBILE
          ============================================ */}
      <div className="lg:hidden">
        {filteredPanneaux.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3 opacity-40">🔍</div>
            <p className="text-sm font-semibold text-gray-600">Aucun résultat</p>
            <p className="text-xs text-gray-400 mt-1">Essayez de modifier vos filtres</p>
            {activeFilterCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPanneaux.map((panneau) => {
              const faces = panneau.faces || [];
              const panneauKey = getPanneauKey(panneau);
              const isExpanded = expandedPanneaux.has(panneauKey);
              const hasAnyProblem = faces.some((f) => hasProblem(f));
              const tronconValue = getTroncon(panneau);

              return (
                <div key={panneauKey} className="bg-white">
                  <button
                    onClick={() => togglePanneau(panneauKey)}
                    className="w-full text-left px-3 sm:px-4 py-3 sm:py-4 flex items-start justify-between gap-2 sm:gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {panneau.nom || 'Sans nom'}
                        </span>
                        {hasAnyProblem && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> PROBLÈME
                          </span>
                        )}
                      </div>
                      {tronconValue && tronconValue !== 'N/A' && (
                        <div className="text-[11px] text-blue-600 font-semibold mt-0.5 flex items-center gap-1">
                          <MapPin size={11} className="flex-shrink-0" />
                          <span className="truncate">Tronçon : {tronconValue}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{panneau.adresse || 'Adresse non définie'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {faces.length} face{faces.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-2">
                      {faces.map((face, idx) => {
                        const faceHasProblem = hasProblem(face);
                        const isPending = isReservationPending(face.reservation);
                        const isValidated = isReservationValidated(face.reservation);
                        const hasReservation = !!face.reservation;
                        const clientName = getClientFullName(face);
                        const commercialName = getCommercialFullName(face);
                        const duration = getDuration(face.date_debut, face.date_fin);
                        const remainingTime = face.remaining_time;
                        const inCart = isFaceInCart(face);
                        const dimRaw = getDimensionRawLabel(face);

                        const showTimer = isPending && !isValidated && remainingTime;

                        return (
                          <div
                            key={panneauKey + '-face-' + idx}
                            className={`bg-white rounded-xl border p-3 shadow-sm ${
                              faceHasProblem
                                ? 'border-red-200'
                                : isPending
                                  ? 'border-amber-200'
                                  : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 flex-1">
                                {getTypeFaceIcon(face.type_face)}
                                <span className="font-semibold truncate">{face.type_face || 'N/A'}</span>
                                <span className="text-gray-300">•</span>
                                <span className="font-semibold text-gray-500">F{idx + 1}</span>
                              </div>
                              {faceHasProblem ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200 bg-red-50 text-red-700 flex items-center gap-1 flex-shrink-0">
                                  <XCircle size={10} /> Problème
                                </span>
                              ) : hasReservation ? (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isPending ? 'border-amber-200 bg-amber-50 text-amber-700' : getStatusColor(face.status)} flex items-center gap-1 flex-shrink-0`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-500' : getStatusDot(face.status)}`} />
                                  <span className="truncate max-w-[80px]">{face.status}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 flex-shrink-0">
                                  🟢 Libre
                                </span>
                              )}
                            </div>

                            <div
                              className="grid gap-x-4 gap-y-2 mb-2.5 text-xs"
                              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))' }}
                            >
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Orient.</div>
                                <div className="font-semibold text-gray-800 uppercase truncate">{face.orientation || 'N/A'}</div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Dim. (m)</div>
                                <div className="font-semibold text-gray-800 truncate">{dimRaw || 'N/A'}</div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Surface</div>
                                <div className="font-semibold text-blue-700 truncate">{getDimensionM2(face)}</div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Type</div>
                                <div className="font-semibold text-gray-800 truncate">{face.type_face || 'N/A'}</div>
                              </div>
                            </div>

                            {hasReservation && !faceHasProblem && (
                              <div className="border-t border-gray-100 pt-2.5">
                                <div
                                  className="grid gap-x-4 gap-y-2 text-xs"
                                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}
                                >
                                  <div className="flex items-center gap-1.5 text-gray-700 min-w-0">
                                    <Building2 size={13} className="text-gray-400 flex-shrink-0" />
                                    <span className="font-semibold truncate">{clientName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-gray-600 min-w-0">
                                    <User size={13} className="text-gray-400 flex-shrink-0" />
                                    <span className="truncate">{commercialName}</span>
                                  </div>
                                  {face.date_debut && face.date_fin && (
                                    <div className="text-gray-600 flex items-center gap-1.5 min-w-0">
                                      <span className="hidden xs:inline truncate">📅 {formatDate(face.date_debut)} → {formatDate(face.date_fin)}</span>
                                      <span className="xs:hidden truncate">📅 {formatDateShort(face.date_debut)} → {formatDateShort(face.date_fin)}</span>
                                      {duration && <span className="text-gray-400 flex-shrink-0">({duration}j)</span>}
                                    </div>
                                  )}
                                  {showTimer && (
                                    <div className={`font-bold ${getTimerColor(remainingTime.hours)} flex items-center gap-1.5 min-w-0`}>
                                      <Timer size={13} className="flex-shrink-0" />
                                      <span className="truncate">{remainingTime.expired ? '⏰ Expirée' : remainingTime.label}</span>
                                    </div>
                                  )}
                                  {isPending && !isValidated && (
                                    <div className="text-amber-600 font-bold flex items-center gap-1.5 min-w-0">
                                      <AlertCircle size={13} className="flex-shrink-0" /> <span className="truncate">En attente</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {faceHasProblem && (
                              <div className="border-t border-red-100 pt-2.5 text-xs text-red-600 font-bold flex items-center gap-1.5">
                                <XCircle size={13} /> Réservation indisponible
                              </div>
                            )}

                            <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                              {renderFaceActions(panneau, face, faceHasProblem, inCart, true)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================
          ✅ VUE DESKTOP — Tableau scrollable horizontalement
          ============================================ */}
      <div className="hidden lg:block" ref={filterPanelRef}>
        <div className="overflow-auto max-h-[calc(100vh-380px)] min-h-[400px]">
          <table className="w-full min-w-[1500px] border-collapse table-auto">
            <colgroup>
              <col className="w-[220px]" />
              <col className="w-[60px]" />
              <col className="w-[240px]" />
              <col className="w-[130px]" />
              <col className="w-[120px]" />
              <col className="w-[100px]" />
              {/* Dimension : plus large pour afficher 2 lignes */}
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col className="w-[130px]" />
            </colgroup>
            <thead className="sticky top-0 z-30">
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="px-3 xl:px-4 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 sticky left-0 z-40 bg-gray-100">
                  <button
                    onClick={() => toggleSort('panneau_nom')}
                    className="flex items-center gap-1 hover:text-blue-600 transition w-full"
                  >
                    Panneau / Adresse {renderSortIcon('panneau_nom')}
                  </button>
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-center text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                  Faces
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-center text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                  Actions
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('troncon')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Tronçon {renderSortIcon('troncon')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'troncon' ? null : 'troncon')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('troncon') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('troncon') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'troncon' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] max-h-[260px] overflow-auto">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Filtrer par tronçon</div>
                      {uniqueValues.troncons.map((t) => (
                        <label key={t} className="flex items-center gap-2 px-1.5 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs normal-case">
                          <input
                            type="checkbox"
                            checked={columnFilters.troncon.includes(t)}
                            onChange={() => toggleMultiFilter('troncon', t)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="text-gray-700 truncate">{t}</span>
                        </label>
                      ))}
                      {uniqueValues.troncons.length === 0 && (
                        <div className="text-[11px] text-gray-400 italic px-1.5 py-1">Aucune valeur</div>
                      )}
                    </div>
                  )}
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('type_face')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Type {renderSortIcon('type_face')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'type_face' ? null : 'type_face')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('type_face') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('type_face') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'type_face' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px] max-h-[260px] overflow-auto">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Filtrer par type</div>
                      {uniqueValues.types.map((t) => (
                        <label key={t} className="flex items-center gap-2 px-1.5 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs normal-case">
                          <input
                            type="checkbox"
                            checked={columnFilters.type_face.includes(t)}
                            onChange={() => toggleMultiFilter('type_face', t)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="text-gray-700 truncate">{t}</span>
                        </label>
                      ))}
                      {uniqueValues.types.length === 0 && (
                        <div className="text-[11px] text-gray-400 italic px-1.5 py-1">Aucune valeur</div>
                      )}
                    </div>
                  )}
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('orientation')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Orient. {renderSortIcon('orientation')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'orientation' ? null : 'orientation')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('orientation') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('orientation') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'orientation' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[160px] max-h-[260px] overflow-auto">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Filtrer par orientation</div>
                      {uniqueValues.orientations.map((o) => (
                        <label key={o} className="flex items-center gap-2 px-1.5 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs normal-case">
                          <input
                            type="checkbox"
                            checked={columnFilters.orientation.includes(o)}
                            onChange={() => toggleMultiFilter('orientation', o)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="text-gray-700 truncate">{o}</span>
                        </label>
                      ))}
                      {uniqueValues.orientations.length === 0 && (
                        <div className="text-[11px] text-gray-400 italic px-1.5 py-1">Aucune valeur</div>
                      )}
                    </div>
                  )}
                </th>

                {/* ✅ DIMENSION — En-tête avec filtre */}
                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('dimension')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                      title="Trier par surface (m²)"
                    >
                      Dimension {renderSortIcon('dimension')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'dimension' ? null : 'dimension')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('dimension') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('dimension') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'dimension' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[240px]">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">Filtrer par surface (m²)</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={columnFilters.dimensionMin}
                          onChange={(e) => setColumnFilters((p) => ({ ...p, dimensionMin: e.target.value }))}
                          placeholder="Min"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <span className="text-gray-400 text-xs">→</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={columnFilters.dimensionMax}
                          onChange={(e) => setColumnFilters((p) => ({ ...p, dimensionMax: e.target.value }))}
                          placeholder="Max"
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1.5 italic">Ex: 10 → 50 (m²)</div>
                    </div>
                  )}
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('client')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Client {renderSortIcon('client')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'client' ? null : 'client')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('client') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('client') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'client' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Rechercher un client</div>
                      <input
                        type="text"
                        autoFocus
                        value={columnFilters.client}
                        onChange={(e) => setColumnFilters((p) => ({ ...p, client: e.target.value }))}
                        placeholder="Nom du client..."
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  )}
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 relative">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => toggleSort('commercial')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Commercial {renderSortIcon('commercial')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'commercial' ? null : 'commercial')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('commercial') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('commercial') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'commercial' && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Rechercher un commercial</div>
                      <input
                        type="text"
                        autoFocus
                        value={columnFilters.commercial}
                        onChange={(e) => setColumnFilters((p) => ({ ...p, commercial: e.target.value }))}
                        placeholder="Nom du commercial..."
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                  )}
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-left text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                  <button
                    onClick={() => toggleSort('date_debut')}
                    className="flex items-center gap-1 hover:text-blue-600 transition w-full"
                  >
                    Période {renderSortIcon('date_debut')}
                  </button>
                </th>

                <th className="px-2 xl:px-3 py-3 xl:py-3.5 text-center text-[10px] xl:text-[11px] 2xl:text-xs font-bold text-gray-600 uppercase tracking-wider relative">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => toggleSort('statut')}
                      className="flex items-center gap-1 hover:text-blue-600 transition"
                    >
                      Statut {renderSortIcon('statut')}
                    </button>
                    <button
                      onClick={() => setOpenFilter(openFilter === 'statut' ? null : 'statut')}
                      className={`p-0.5 rounded hover:bg-gray-200 transition ${isColumnFiltered('statut') ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      <Filter size={11} fill={isColumnFiltered('statut') ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  {openFilter === 'statut' && (
                    <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[180px] max-h-[260px] overflow-auto">
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1.5 px-1">Filtrer par statut</div>
                      {uniqueValues.statuts.map((s) => (
                        <label key={s} className="flex items-center gap-2 px-1.5 py-1 hover:bg-gray-50 rounded cursor-pointer text-xs normal-case">
                          <input
                            type="checkbox"
                            checked={columnFilters.statut.includes(s)}
                            onChange={() => toggleMultiFilter('statut', s)}
                            className="w-3.5 h-3.5 accent-blue-600"
                          />
                          <span className="text-gray-700 truncate">{s}</span>
                        </label>
                      ))}
                      {uniqueValues.statuts.length === 0 && (
                        <div className="text-[11px] text-gray-400 italic px-1.5 py-1">Aucune valeur</div>
                      )}
                    </div>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPanneaux.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <div className="text-4xl mb-3 opacity-40">🔍</div>
                    <p className="text-sm font-semibold text-gray-600">Aucun résultat</p>
                    <p className="text-xs text-gray-400 mt-1">Essayez de modifier vos filtres</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={resetAllFilters}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                      >
                        Réinitialiser les filtres
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPanneaux.map((panneau) => {
                  const faces = panneau.faces || [];
                  const panneauKey = getPanneauKey(panneau);
                  const isExpanded = expandedPanneaux.has(panneauKey);
                  const hasAnyProblem = faces.some((f) => hasProblem(f));
                  const tronconValue = getTroncon(panneau);

                  return (
                    <React.Fragment key={panneauKey}>
                      <tr
                        className={'hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 ' + (panneau.etatPanneau === 'En panne' ? 'bg-red-50/20' : '')}
                        onClick={() => togglePanneau(panneauKey)}
                      >
                        <td className="px-3 xl:px-4 py-3 xl:py-3.5 sticky left-0 z-20 bg-white border-r border-gray-100">
                          <div className="flex items-center gap-1.5 xl:gap-2">
                            <span className="text-xs xl:text-sm font-bold text-gray-900 truncate">{panneau.nom || 'Sans nom'}</span>
                            <span className="text-gray-400 text-[10px] xl:text-xs flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
                            {hasAnyProblem && (
                              <span className="ml-1 px-1.5 xl:px-2 py-0.5 bg-red-600 text-white text-[9px] xl:text-[10px] font-bold rounded-full flex items-center gap-0.5 xl:gap-1 flex-shrink-0">
                                <AlertTriangle size={9} /> <span className="hidden xl:inline">PROBLÈME</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] xl:text-xs text-gray-500 mt-0.5 truncate">
                            📍 {panneau.adresse || 'Adresse non définie'}
                          </div>
                        </td>
                        <td className="px-2 xl:px-3 py-3 xl:py-3.5 text-center text-xs xl:text-sm font-bold text-gray-700 border-r border-gray-100">{faces.length}</td>
                        <td className="px-2 xl:px-3 py-3 xl:py-3.5 text-center text-gray-400 text-[10px] xl:text-xs border-r border-gray-100" colSpan={9}>
                          <span className="text-gray-500 font-medium">
                            {panneau.etatPanneau === 'En panne' ? '⛔ Panneau en panne' : 'Cliquez pour voir les faces'}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && panneau.etatPanneau !== 'En panne' && faces.map((face, idx) => {
                        const faceHasProblem = hasProblem(face);
                        const isPending = isReservationPending(face.reservation);
                        const isValidated = isReservationValidated(face.reservation);
                        const hasReservation = !!face.reservation;
                        const clientName = getClientFullName(face);
                        const commercialName = getCommercialFullName(face);
                        const duration = getDuration(face.date_debut, face.date_fin);
                        const remainingTime = face.remaining_time;
                        const inCart = isFaceInCart(face);
                        const dimRaw = getDimensionRawLabel(face);

                        const showTimer = isPending && !isValidated && remainingTime;

                        let rowClasses = 'hover:bg-gray-50/50 transition-colors bg-gray-50/30';
                        if (faceHasProblem) rowClasses = 'hover:bg-red-50/50 transition-colors bg-red-50/30 border-l-2 border-red-400';
                        else if (isPending) rowClasses = 'bg-amber-50/20 hover:bg-amber-50/40 transition-colors';

                        return (
                          <tr key={panneauKey + '-face-' + idx} className={rowClasses + ' border-b border-gray-100'}>
                            <td className="px-3 xl:px-4 py-3 sticky left-0 z-20 bg-inherit border-r border-gray-100">
                              <div className="flex items-center gap-1.5 xl:gap-2 ml-2 xl:ml-4">
                                <span className="text-[10px] xl:text-xs text-gray-400">└── F{idx + 1}</span>
                                {faceHasProblem && (
                                  <span className="flex items-center gap-0.5 xl:gap-1 px-1.5 xl:px-2 py-0.5 bg-red-600 text-white text-[9px] xl:text-[10px] font-bold rounded-full">
                                    <XCircle size={9} /> <span className="hidden xl:inline">PROBLÈME</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100"></td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              <div className="flex items-center justify-center gap-1 xl:gap-1.5">
                                {renderFaceActions(panneau, face, faceHasProblem, inCart, false)}
                              </div>
                              {faceHasProblem && (
                                <div className="text-[9px] xl:text-[10px] text-red-600 font-bold mt-1 flex items-center justify-center gap-1">
                                  <XCircle size={9} /> <span className="hidden xl:inline">Réservation bloquée</span>
                                </div>
                              )}
                            </td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              <span className="text-[10px] xl:text-xs font-semibold text-gray-700 truncate block">
                                {tronconValue && tronconValue !== 'N/A' ? tronconValue : '-'}
                              </span>
                            </td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              <div className="flex items-center gap-1 xl:gap-1.5">
                                {getTypeFaceIcon(face.type_face)}
                                <span className="text-[10px] xl:text-xs font-semibold text-gray-700 truncate">{face.type_face || 'Non défini'}</span>
                              </div>
                            </td>
                            <td className="px-2 xl:px-3 py-3 text-[10px] xl:text-xs font-semibold text-gray-700 uppercase border-r border-gray-100 truncate">{face.orientation || 'N/A'}</td>

                            {/* ✅ DIMENSION — Affiche les 2 lignes : brut (m) + surface (m²) */}
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              <div className="flex flex-col gap-0.5">
                                {dimRaw ? (
                                  <span className="text-[10px] xl:text-[11px] text-gray-500 font-medium truncate">
                                    {dimRaw}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-300">-</span>
                                )}
                                <span className="text-[11px] xl:text-xs font-bold text-blue-700 truncate">
                                  {getDimensionM2(face)}
                                </span>
                              </div>
                            </td>

                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              {hasReservation && !faceHasProblem ? (
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] xl:text-xs font-semibold text-gray-800 truncate">
                                    <Building2 size={11} className="inline text-gray-400 mr-1" />
                                    {clientName}
                                  </span>
                                  {face.reservation?.client_email && (
                                    <span className="text-[9px] xl:text-[10px] text-gray-400 truncate">
                                      {face.reservation.client_email}
                                    </span>
                                  )}
                                </div>
                              ) : faceHasProblem ? (
                                <span className="text-red-500 text-[10px] xl:text-xs flex items-center gap-1 font-bold truncate">
                                  <XCircle size={11} /> <span className="hidden xl:inline">Face problématique</span>
                                </span>
                              ) : (
                                <span className="text-gray-300 text-[10px] xl:text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              {hasReservation && !faceHasProblem ? (
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] xl:text-xs font-semibold text-gray-700 truncate">
                                    <User size={11} className="inline text-gray-400 mr-1" />
                                    {commercialName}
                                  </span>
                                  {face.reservation?.commercial_email && (
                                    <span className="text-[9px] xl:text-[10px] text-gray-400 truncate">
                                      {face.reservation.commercial_email}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300 text-[10px] xl:text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 xl:px-3 py-3 border-r border-gray-100">
                              {hasReservation && face.date_debut && face.date_fin && !faceHasProblem ? (
                                <div className="flex flex-col">
                                  <span className={`text-[10px] xl:text-xs font-medium ${isPending ? 'text-amber-600' : 'text-gray-700'}`}>
                                    📅 {formatDate(face.date_debut)} → {formatDate(face.date_fin)}
                                  </span>
                                  {duration && (
                                    <span className="text-[9px] xl:text-[10px] text-gray-400">Durée: {duration} j</span>
                                  )}
                                  {showTimer && (
                                    <span className={`text-[9px] xl:text-[10px] font-bold ${getTimerColor(remainingTime.hours)} flex items-center gap-1 mt-0.5`}>
                                      <Timer size={9} />
                                      {remainingTime.expired ? '⏰ Expirée' : remainingTime.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-300 text-[10px] xl:text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 xl:px-3 py-3 text-center">
                              {faceHasProblem ? (
                                <span className="px-1.5 xl:px-2.5 py-1 rounded-full text-[9px] xl:text-[11px] font-bold border border-red-200 bg-red-50 text-red-700 flex items-center gap-1 justify-center">
                                  <XCircle size={10} /> <span className="hidden xl:inline">Problème</span>
                                </span>
                              ) : hasReservation ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`px-1.5 xl:px-2.5 py-1 rounded-full text-[9px] xl:text-[11px] font-bold border ${isPending ? 'border-amber-200 bg-amber-50 text-amber-700' : getStatusColor(face.status)
                                    } flex items-center gap-0.5 xl:gap-1`}>
                                    <span className={`w-1 h-1 xl:w-1.5 xl:h-1.5 rounded-full ${isPending ? 'bg-amber-500' : getStatusDot(face.status)}`} />
                                    <span className="truncate max-w-[70px] xl:max-w-none">{face.status}</span>
                                  </span>
                                  {showTimer && (
                                    <span className={`text-[9px] xl:text-[10px] font-bold ${getTimerColor(remainingTime.hours)} flex items-center gap-0.5`}>
                                      <Timer size={9} />
                                      {remainingTime.expired ? 'Expirée' : remainingTime.label}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="px-1.5 xl:px-2.5 py-1 rounded-full text-[9px] xl:text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1 justify-center">
                                  🟢 <span className="hidden xl:inline">Libre</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================
          Footer stats
          ============================================ */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-3 sm:py-3.5 bg-gray-50 border-t border-gray-200 text-[10px] sm:text-xs xl:text-sm text-gray-500">
        <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1">
          <span className="font-semibold text-gray-600">📊 {filteredPanneaux.length} / {panneaux.length} panneau(x)</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="font-semibold text-gray-600">🎯 {filteredPanneaux.reduce((a, p) => a + (p.faces || []).length, 0)} face(s)</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="font-semibold text-red-600">❌ {filteredPanneaux.reduce((a, p) => a + (p.faces || []).filter((f) => hasProblem(f)).length, 0)} problème(s)</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="font-semibold text-amber-600">⏳ {filteredPanneaux.reduce((a, p) => a + (p.faces || []).filter((f) => isReservationPending(f.reservation)).length, 0)} en attente</span>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <span className="font-semibold text-green-600">🛒 {items.length} panier</span>
        </div>
      </div>
    </div>
  );
}