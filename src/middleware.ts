// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ Routes publiques
const publicRoutes = [
  '/login',
  '/register',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/reset-password',
  '/api/auth/verify-reset-token',
  '/api/user/request-password-reset',
  '/api/panneaux',
  '/api/locations',
];

// ✅ Rôles autorisés par route
// ⚠️ ORDRE : plus spécifique D'ABORD
const routeRoles: Record<string, string[]> = {
  // Admin
  '/dashboard/admin-system': ['SUPER_ADMIN', 'ADMIN_SYSTEM'],
  '/dashboard/admin': ['SUPER_ADMIN', 'ADMIN'],

  // DG / PDG (leurs propres dashboards)
  '/dashboard/dg': ['SUPER_ADMIN', 'DG'],
  '/dashboard/pdg': ['SUPER_ADMIN', 'PDG'],

  // ✅ SOUS-ROUTES COMMERCIAL — PLACÉES EN PREMIER
  '/dashboard/commercial/proformat': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL',
  ],
  '/dashboard/commercial/facture': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL', 'COMPTABLE',
  ],

  // ✅ Règle générale commerciale — EN DERNIER
  '/dashboard/commercial': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL',
  ],

  // Autres dashboards
  '/dashboard/superviseur': ['SUPER_ADMIN', 'SUPERVISEUR'],
  '/dashboard/caissier': ['SUPER_ADMIN', 'CAISSIER'],
  '/dashboard/comptable/factures': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/paiements': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/stats': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable': ['SUPER_ADMIN', 'COMPTABLE'],
};

let dernierNettoyage = 0;
const DELAI_MINIMUM = 3600000;

function getUserRole(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const data = JSON.parse(jsonPayload);
    return data.profil || data.role || null;
  } catch {
    return null;
  }
}

function getDashboardPath(role: string): string {
  const roleMap: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    ADMIN: '/dashboard/admin',
    ADMIN_SYSTEM: '/dashboard/admin-system',
    DG: '/dashboard/dg',
    PDG: '/dashboard/pdg',
    CHEF_COMMERCIAL: '/dashboard/commercial',
    COMMERCIAL: '/dashboard/commercial',
    SUPERVISEUR: '/dashboard/superviseur',
    CAISSIER: '/dashboard/caissier',
    COMPTABLE: '/dashboard/comptable/factures',
  };
  return roleMap[role] || '/dashboard';
}

async function declencherNettoyageAutomatique() {
  const maintenant = Date.now();
  if (maintenant - dernierNettoyage < DELAI_MINIMUM) return;
  dernierNettoyage = maintenant;
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/reservations/clean`, {
      method: 'POST',
      headers: {
        'X-Cleanup-Token': process.env.CLEANUP_API_TOKEN || 'mon-token-securise-123456',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch: 50 }),
    });
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Nettoyage auto: ${result.data?.terminees || 0} terminées, ${result.data?.expirees || 0} expirées`);
    } else {
      console.error('❌ Nettoyage auto échoué:', response.status);
    }
  } catch (error) {
    console.error('❌ Nettoyage auto erreur:', error);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Fichiers statiques
  if (
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  // 2. Racine
  if (pathname === '/') {
    if (token) {
      const role = getUserRole(token);
      if (role) {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Routes publiques
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isPublicRoute) return NextResponse.next();

  // 4. Pas de token
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. Token invalide
  const role = getUserRole(token);
  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 6. Autorisations dashboard
  if (pathname.startsWith('/dashboard/')) {
    // Règle spéciale comptable
    if (pathname.startsWith('/dashboard/comptable/')) {
      if (role !== 'COMPTABLE' && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
      }
      if (role === 'COMPTABLE' && pathname === '/dashboard/comptable') {
        return NextResponse.redirect(new URL('/dashboard/comptable/factures', request.url));
      }
      return NextResponse.next();
    }

    // ✅ Prendre la route LA PLUS SPÉCIFIQUE
    let matchedRoute = '';
    for (const route of Object.keys(routeRoles)) {
      if (pathname.startsWith(route) && route.length > matchedRoute.length) {
        matchedRoute = route;
      }
    }

    if (matchedRoute && !routeRoles[matchedRoute].includes(role)) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
  }

  // 7. Nettoyage auto
  if (pathname.startsWith('/dashboard/') || pathname === '/dashboard') {
    declencherNettoyageAutomatique().catch(console.error);
  }

  // 8. Redirection /dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // 9. Protection API
  if (pathname.startsWith('/api/')) {
    // ✅ check-duplicate : accessible à tous ceux qui impriment
    if (pathname.startsWith('/api/facture/check-duplicate')) {
      const allowedRoles = [
        'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
        'COMMERCIAL', 'CHEF_COMMERCIAL', 'COMPTABLE',
      ];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    }

    // ✅ validate : réservé aux comptables (inchangé)
    if (pathname.startsWith('/api/facture/validate')) {
      const allowedRoles = ['SUPER_ADMIN', 'COMPTABLE'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Accès non autorisé - Réservé aux comptables' },
          { status: 403 }
        );
      }
    }

    // ✅ /api/facture (POST principal) : accessible à tous
    if (
      pathname.startsWith('/api/facture') &&
      !pathname.startsWith('/api/facture/validate') &&
      !pathname.startsWith('/api/facture/check-duplicate')
    ) {
      const allowedRoles = [
        'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
        'COMMERCIAL', 'CHEF_COMMERCIAL', 'COMPTABLE',
      ];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    }

    // ✅ Suppression facture : comptables
    if (pathname.startsWith('/api/facture/') && pathname.includes('/delete')) {
      const allowedRoles = ['SUPER_ADMIN', 'COMPTABLE'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Accès non autorisé - Réservé aux comptables' },
          { status: 403 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|map)$).*)',
  ],
};
