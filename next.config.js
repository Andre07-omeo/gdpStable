/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  images: {
    // ✅ Remplacé domains (déprécié) par remotePatterns
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },

  // ✅ RÉSOLUTION DES ALIAS @/  (OBLIGATOIRE POUR DOCKER)
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // ✅ AJOUT CRUCIAL : résout @/components, @/context, etc.
      '@': path.resolve(__dirname, 'src'),
      // Ton alias existant pour Leaflet
      'leaflet': 'leaflet/dist/leaflet.js',
    };
    return config;
  },
};

module.exports = nextConfig;