'use client';

export const dynamic = 'force-dynamic';

// src/components/layout/LayoutWrapper.tsximport { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

interface LayoutWrapperProps {
  children: ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function LayoutWrapper({ 
  children, 
  className = '', 
  showHeader = true, 
  showFooter = true 
}: LayoutWrapperProps) {
  const pathname = usePathname();

  // ✅ Pages où on NE veut PAS afficher Header et Footer
  const hiddenPages = [
    '/dashboard',
    '/dashboard/admin',
    '/dashboard/superviseur',
    '/dashboard/commercial',
    '/login',
    '/register',
  ];

  // Vérifier si la page actuelle est dans la liste des pages cachées
  const isHiddenPage = hiddenPages.some(page => pathname?.startsWith(page));

  // Si c'est une page cachée, on désactive Header et Footer
  const shouldShowHeader = showHeader && !isHiddenPage;
  const shouldShowFooter = showFooter && !isHiddenPage;

  return (
    <div className="min-h-screen flex flex-col">
      {shouldShowHeader && <Header />}
      
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      
      {shouldShowFooter && <Footer />}
    </div>
  );
}