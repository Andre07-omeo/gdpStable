import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Supprimer le cookie d'authentification
    cookies().delete('auth_token');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Déconnexion réussie' 
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la déconnexion' },
      { status: 500 }
    );
  }
}
