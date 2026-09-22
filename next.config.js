/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // serverActions est maintenant activé par défaut dans Next.js 14
  // On peut supprimer cette option
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'leaflet': 'leaflet/dist/leaflet.js',
    };
    return config;
  },
};

module.exports = nextConfig;
