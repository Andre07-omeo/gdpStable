// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ Routes publiques
const publicRoutes = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/panneaux',
  '/api/locations',
];

// ✅ Rôles autorisés par route
const routeRoles: Record<string, string[]> = {
  '/dashboard/admin': ['SUPER_ADMIN', 'ADMIN'],
  '/dashboard/admin-system': ['SUPER_ADMIN', 'ADMIN_SYSTEM'],
  '/dashboard/dg': ['SUPER_ADMIN', 'DG'],
  '/dashboard/pdg': ['SUPER_ADMIN', 'PDG'],
  '/dashboard/commercial': ['SUPER_ADMIN', 'CHEF_COMMERCIAL', 'COMMERCIAL'],
  '/dashboard/superviseur': ['SUPER_ADMIN', 'SUPERVISEUR'],
  '/dashboard/caissier': ['SUPER_ADMIN', 'CAISSIER'],
  '/dashboard/comptable': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/factures': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/paiements': ['SUPER_ADMIN', 'COMPTABLE'],
  '/dashboard/comptable/stats': ['SUPER_ADMIN', 'COMPTABLE'],
};

// ✅ Variable pour tracker le dernier nettoyage
let dernierNettoyage = 0;
const DELAI_MINIMUM = 3600000; // 1 heure

// ✅ Fonction pour décoder le token
function getUserRole(token: string): string | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const data = JSON.parse(jsonPayload);
    return data.profil || data.role || null;
  } catch {
    return null;
  }
}

function getDashboardPath(role: string): string {
  const roleMap: Record<string, string> = {
    'SUPER_ADMIN': '/dashboard/admin',
    'ADMIN': '/dashboard/admin',
    'ADMIN_SYSTEM': '/dashboard/admin-system',
    'DG': '/dashboard/dg',
    'PDG': '/dashboard/pdg',
    'CHEF_COMMERCIAL': '/dashboard/commercial',
    'COMMERCIAL': '/dashboard/commercial',
    'SUPERVISEUR': '/dashboard/superviseur',
    'CAISSIER': '/dashboard/caissier',
    'COMPTABLE': '/dashboard/comptable/factures',
  };
  return roleMap[role] || '/dashboard';
}

/**
 * 🧹 Déclencher le nettoyage automatique des réservations
 */
async function declencherNettoyageAutomatique() {
  const maintenant = Date.now();

  if (maintenant - dernierNettoyage < DELAI_MINIMUM) {
    console.log(`⏳ Nettoyage déjà effectué récemment (${Math.round((maintenant - dernierNettoyage) / 60000)} min)`);
    return;
  }

  dernierNettoyage = maintenant;

  try {
    console.log('🧹 Déclenchement du nettoyage automatique...');

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/reservations/clean`, {
      method: 'POST',
      headers: {
        'X-Cleanup-Token': process.env.CLEANUP_API_TOKEN || 'mon-token-securise-123456',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ batch: 50 })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Nettoyage automatique effectué !');
      console.log(`📊 Terminées: ${result.data?.terminees || 0}, Expirées: ${result.data?.expirees || 0}`);
    } else {
      console.error('❌ Erreur lors du nettoyage:', response.status);
    }
  } catch (error) {
    console.error('❌ Erreur nettoyage automatique:', error);
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  // ═══════════════════════════════════════════════════════
  // ✅ REDIRECTION AUTOMATIQUE DEPUIS LA RACINE
  // ═══════════════════════════════════════════════════════
  if (pathname === '/') {
    if (token) {
      const role = getUserRole(token);
      if (role) {
        // ✅ Connecté → rediriger vers son dashboard
        return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
      }
    }
    // ❌ Non connecté → rediriger vers /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ Routes publiques - autoriser toutes
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ✅ Si pas de token, rediriger
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ Vérifier le token
  const role = getUserRole(token);
  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ Vérifier les autorisations pour les routes dashboard
  if (pathname.startsWith('/dashboard/')) {
    // ✅ Règle spéciale pour le comptable : toutes les sous-routes sont autorisées
    if (pathname.startsWith('/dashboard/comptable/')) {
      if (role !== 'COMPTABLE' && role !== 'SUPER_ADMIN') {
        const dashboardPath = getDashboardPath(role);
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }
      // ✅ Si le comptable va vers /dashboard/comptable, rediriger vers /dashboard/comptable/factures
      if (role === 'COMPTABLE' && pathname === '/dashboard/comptable') {
        return NextResponse.redirect(new URL('/dashboard/comptable/factures', request.url));
      }
      // ✅ Sinon, autoriser l'accès
      return NextResponse.next();
    }

    // ✅ Pour les autres routes dashboard
    let matchedRoute = '';
    for (const route of Object.keys(routeRoles)) {
      if (pathname.startsWith(route)) {
        matchedRoute = route;
        break;
      }
    }

    if (matchedRoute && !routeRoles[matchedRoute].includes(role)) {
      const dashboardPath = getDashboardPath(role);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }
  }

  // ✅ Déclencher le nettoyage automatique
  if (pathname.startsWith('/dashboard/') || pathname === '/dashboard') {
    declencherNettoyageAutomatique().catch(console.error);
  }

  // ✅ Redirection dashboard
  if (pathname === '/dashboard') {
    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
  }

  // ✅ Si c'est une API, vérifier le token
  if (pathname.startsWith('/api/')) {
    // Les API de facture sont accessibles aux commerciaux et comptables
    if (pathname.startsWith('/api/facture')) {
      const allowedRoles = ['SUPER_ADMIN', 'COMMERCIAL', 'CHEF_COMMERCIAL', 'COMPTABLE'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Accès non autorisé' },
          { status: 403 }
        );
      }
    }

    // API de validation des factures (comptable uniquement)
    if (pathname.startsWith('/api/facture/validate') || pathname.startsWith('/api/facture/check-duplicate')) {
      const allowedRoles = ['SUPER_ADMIN', 'COMPTABLE'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Accès non autorisé - Réservé aux comptables' },
          { status: 403 }
        );
      }
    }

    // API de suppression des factures (comptable uniquement)
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
    '/((?!_next/static|_next/image|favicon.ico|public|images|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)',
  ],
};