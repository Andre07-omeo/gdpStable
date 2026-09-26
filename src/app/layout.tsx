import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

// ✅ FORCE LE RENDU DYNAMIQUE
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL('https://gestiondigitalepanneaux.com'),
  title: {
    default: 'Gestion Panneaux',
    template: '%s | Gestion Panneaux',
  },
  description: 'Application de gestion des panneaux publicitaires en RDC',
  applicationName: 'Gestion Panneaux Pro',
  keywords: ['panneaux', 'publicité', 'gestion', 'RDC', 'Kinshasa'],
  authors: [{ name: 'Gestion Panneaux Pro' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://gestiondigitalepanneaux.com',
    siteName: 'Gestion Panneaux ',
    title: 'Gestion Panneaux ',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Panneaux Pro" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {/* ✅ LES PROVIDERS QUI ENVELOPPENT TOUTE L'APP */}
        <AuthProvider>
          <CartProvider>
            {children}
            <ServiceWorkerRegister />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}