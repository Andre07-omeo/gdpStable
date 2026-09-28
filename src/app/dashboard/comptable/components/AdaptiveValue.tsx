// src/app/dashboard/comptable/components/AdaptiveValue.tsx

'use client';

import React from 'react';

interface AdaptiveValueProps {
  value: string | number;
  /** Taille max souhaitée (en rem) - s'adapte automatiquement */
  maxSize?: number;
  /** Taille min (en rem) */
  minSize?: number;
  className?: string;
  color?: string;
  title?: string;
}

/**
 * Affiche une valeur (nombre, prix, etc.) avec une taille de police
 * qui s'adapte automatiquement à la longueur du texte.
 * Ne déborde JAMAIS de sa case.
 */
export function AdaptiveValue({
  value,
  maxSize = 1.5,
  minSize = 0.65,
  className = '',
  color = '',
  title,
}: AdaptiveValueProps) {
  const str = String(value ?? '0');
  const len = str.length;

  // Calcul : plus c'est long, plus la taille baisse proportionnellement
  // Formule : maxSize - (len * facteur), bornée entre minSize et maxSize
  const factor = (maxSize - minSize) / 14; // ajustable
  const computed = Math.max(minSize, maxSize - len * factor);
  const size = `${computed.toFixed(2)}rem`;

  return (
    <span
      className={`font-black leading-tight tracking-tight tabular-nums ${color} ${className}`}
      style={{
        fontSize: size,
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        display: 'block',
      }}
      title={title || str}
    >
      {str}
    </span>
  );
}