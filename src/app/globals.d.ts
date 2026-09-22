// src/app/globals.d.ts

/// <reference types="next" />
/// <reference types="next/types/global" />

// Déclaration pour les fichiers CSS
declare module '*.css' {
  const content: string;
  export default content;
}

// Déclaration pour les variables d'environnement publiques
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: string;
  }
}
