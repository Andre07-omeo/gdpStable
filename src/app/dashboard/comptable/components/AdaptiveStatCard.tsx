// src/app/dashboard/comptable/components/AdaptiveStatCard.tsx

'use client';

import React from 'react';

interface AdaptiveStatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: string;      // ex: 'text-emerald-600'
  bgColor: string;    // ex: 'bg-emerald-50'
  borderColor: string; // ex: 'border-emerald-200'
  accentBar?: string;  // ex: 'bg-emerald-500' (barre latérale colorée)
  /** Direction de la carte: 'row' (horizontal) ou 'col' (vertical) */
  layout?: 'row' | 'col';
  className?: string;
}

/**
 * Carte rectangulaire avec police adaptative
 * - Le nombre s'adapte automatiquement à sa longueur
 * - Ne déborde jamais de la case
 */
export function AdaptiveStatCard({
  label,
  value,
  subValue,
  icon,
  color,
  bgColor,
  borderColor,
  accentBar,
  layout = 'row',
  className = '',
}: AdaptiveStatCardProps) {
  // Convertir en string pour mesurer la longueur
  const strValue = String(value ?? '0');
  const charCount = strValue.length;

  // ✅ Taille de police adaptative selon le nombre de caractères
  // Utilise clamp(min, preferred, max) pour une adaptation fluide
  const getFontSize = (n: number) => {
    if (n <= 4) return 'text-[clamp(1rem,2.2vw,1.75rem)]';       // 1234
    if (n <= 6) return 'text-[clamp(0.95rem,2vw,1.5rem)]';       // 12345, 12 345
    if (n <= 9) return 'text-[clamp(0.85rem,1.7vw,1.25rem)]';    // 12 345 678
    if (n <= 12) return 'text-[clamp(0.75rem,1.5vw,1.05rem)]';   // 1 234 567 890
    if (n <= 16) return 'text-[clamp(0.65rem,1.2vw,0.95rem)]';   // 1 234 567 890 123
    return 'text-[clamp(0.55rem,1vw,0.85rem)]';                  // très long
  };

  const isRow = layout === 'row';

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${borderColor} ${bgColor}
        shadow-sm hover:shadow-md transition-all duration-300 group
        ${isRow ? 'flex items-center gap-3 sm:gap-4 p-3 sm:p-4' : 'flex flex-col p-3 sm:p-4'}
        ${className}
      `}
    >
      {/* Barre d'accent latérale (optionnelle) */}
      {accentBar && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`} />
      )}

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Icône */}
      <div
        className={`
          relative z-10 flex-shrink-0 rounded-lg flex items-center justify-center
          ${color} bg-white/90 shadow-sm
          ${isRow ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-9 h-9 sm:w-10 sm:h-10 mb-2'}
        `}
      >
        {icon}
      </div>

      {/* Contenu texte */}
      <div className={`relative z-10 min-w-0 ${isRow ? 'flex-1' : ''}`}>
        {/* Label */}
        <p className="text-[10px] sm:text-[11px] text-gray-500 font-semibold uppercase tracking-wide truncate mb-0.5">
          {label}
        </p>

        {/* Valeur — police adaptative */}
        <p
          className={`
            font-black leading-tight tracking-tight
            ${color} ${getFontSize(charCount)}
            break-all tabular-nums
          `}
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          title={strValue}
        >
          {strValue}
        </p>

        {/* Sous-valeur */}
        {subValue && (
          <p className="text-[9px] sm:text-[10px] text-gray-400 mt-0.5 truncate">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}