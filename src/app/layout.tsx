// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import { ServiceWorkerRegister } from '@/components/shared/ServiceWorkerRegister';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gestion des Panneaux Publicitaires',
  description: 'Application de gestion des panneaux publicitaires',
  applicationName: 'Gestion Panneaux',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Panneaux',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-32x32.png',
  },
  other: {
    // ✅ Meta tags PWA supplémentaires (non gérés par Next.js)
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Panneaux',
    'msapplication-TileColor': '#1e3a8a',
    'msapplication-tap-highlight': 'no',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* 🚀 Preconnect Google Maps (accélère le chargement initial) */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link
          rel="preconnect"
          href="https://maps.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* ✅ Lien direct vers le manifest (redondant avec metadata, mais sûr) */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>

        {/* ✅ Service Worker APRÈS les providers (ne bloque pas le rendu) */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}