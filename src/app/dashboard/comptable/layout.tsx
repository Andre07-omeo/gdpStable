// src/app/dashboard/comptable/layout.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ComptableHeader } from './components/ComptableHeader';

export default function ComptableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const [notificationCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
    if (!isLoading && user && user.profil !== 'COMPTABLE' && user.profil !== 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleRefresh = async () => {
    window.dispatchEvent(new CustomEvent('comptable-refresh'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ComptableHeader
        user={user}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        onNotificationsToggle={() => console.log('Notifications')}
        onProfileClick={() => router.push('/dashboard/comptable/profil')}
        onChangePasswordClick={() => router.push('/dashboard/comptable/profil?tab=password')}
        onSettingsClick={() => router.push('/dashboard/comptable/profil?tab=settings')}
        notificationCount={notificationCount}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[2400px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
          {children}
        </div>
      </main>
    </div>
  );
}