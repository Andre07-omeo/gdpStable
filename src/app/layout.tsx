// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  metadataBase:
    process.env.NODE_ENV === 'production'
      ? new URL('https://gestiondigitalepanneaux.com')
      : new URL('http://localhost:3000'),
  title: {
    default: 'Gestion Panneaux',
    template: '%s | Gestion Panneaux',
  },
  description: 'Application de gestion des panneaux publicitaires en RDC',
  applicationName: 'Gestion Panneaux Pro',
  keywords: ['panneaux', 'publicité', 'gestion', 'RDC', 'Kinshasa'],
  authors: [{ name: 'Gestion Panneaux Pro' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png',   sizes: '16x16',   type: 'image/png' },
      { url: '/icons/icon-32x32.png',   sizes: '32x32',   type: 'image/png' },
      { url: '/icons/icon-48x48.png',   sizes: '48x48',   type: 'image/png' },
      { url: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-57x57.png',   sizes: '57x57',   type: 'image/png' },
      { url: '/icons/apple-touch-icon-60x60.png',   sizes: '60x60',   type: 'image/png' },
      { url: '/icons/apple-touch-icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
      { url: '/icons/apple-touch-icon-76x76.png',   sizes: '76x76',   type: 'image/png' },
      { url: '/icons/apple-touch-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/icons/apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/apple-touch-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/icons/icon-96x96.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://gestiondigitalepanneaux.com',
    siteName: 'Gestion Panneaux',
    title: 'Gestion Panneaux',
    description: 'Application de gestion des panneaux publicitaires',
    images: [
      {
        url: '/icons/og-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: 'Gestion Panneaux Pro',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gestion Panneaux Pro',
    description: 'Application de gestion des panneaux publicitaires',
    images: ['/icons/og-image-1200x630.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#1e40af',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Panneaux Pro" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Panneaux Pro" />

        <meta name="theme-color" content="#1e40af" />

        <link rel="manifest" href="/manifest.webmanifest" />

        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/apple-touch-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/apple-touch-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="76x76"   href="/icons/apple-touch-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="72x72"   href="/icons/apple-touch-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="60x60"   href="/icons/apple-touch-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="57x57"   href="/icons/apple-touch-icon-57x57.png" />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}