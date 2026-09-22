// src/hooks/useClientValue.ts
'use client';

import { useState, useEffect } from 'react';

/**
 * Retourne la valeur uniquement après le montage côté client
 * → évite les erreurs d'hydratation
 */
export function useClientValue<T>(getValue: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    setValue(getValue());
  }, []);

  return value;
}