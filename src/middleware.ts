// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ Routes publiques (accessibles sans authentification)
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
  '/api/health',          // ✅ AJOUTÉ — healthcheck public (obligatoire pour Docker/Coolify)
];

// ✅ Rôles autorisés par route (ordre : spécifique d'abord)
const routeRoles: Record<string, string[]> = {
  '/dashboard/admin-system': ['SUPER_ADMIN', 'ADMIN_SYSTEM'],
  '/dashboard/admin': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/dg': ['SUPER_ADMIN', 'DG'],
  '/dashboard/pdg': ['SUPER_ADMIN', 'PDG'],
  '/dashboard/commercial/proformat': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL',
  ],
  '/dashboard/commercial/facture': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL', 'COMPTABLE',
  ],
  '/dashboard/commercial': [
    'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
    'CHEF_COMMERCIAL', 'COMMERCIAL',
  ],
  '/dashboard/superviseur': ['SUPER_ADMIN', 'SUPERVISEUR'],
  '/dashboard/caissier': ['SUPER_ADMIN', 'CAISSIER'],
  '/dashboard/comptable/factures': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/paiements': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/stats': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable': ['SUPER_ADMIN', 'COMPTABLE'],
};

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ============================================
  // 0. EXCLUSIONS SW & assets
  // ============================================
  if (
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
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
  const role = token ? getUserRole(token) : null;

  // ============================================
  // 1. RACINE
  // ============================================
  if (pathname === '/') {
    if (token && role) {
      return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ============================================
  // 2. ROUTES PUBLIQUES
  // ============================================
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  if (isPublicRoute) return NextResponse.next();

  // ============================================
  // 3. PAS DE TOKEN
  // ============================================
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ============================================
  // 4. TOKEN INVALIDE
  // ============================================
  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }

  // ============================================
  // 5. AUTORISATIONS DASHBOARD
  // ============================================
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

    // Route la plus spécifique
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

  // ============================================
  // 6. REDIRECTION /dashboard
  // ============================================
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // ============================================
  // 7. PROTECTION API
  // ============================================
  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith('/api/facture/check-duplicate')) {
      const allowedRoles = [
        'SUPER_ADMIN', 'ADMIN_SYSTEM', 'DG', 'PDG',
        'COMMERCIAL', 'CHEF_COMMERCIAL', 'COMPTABLE',
      ];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    }

    if (pathname.startsWith('/api/facture/validate')) {
      const allowedRoles = ['SUPER_ADMIN', 'COMPTABLE'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Accès non autorisé - Réservé aux comptables' },
          { status: 403 }
        );
      }
    }

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

  // ✅ Tout est bon
  const response = NextResponse.next();
  response.headers.set('X-Middleware', 'pass');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|map)$).*)',
  ],
};