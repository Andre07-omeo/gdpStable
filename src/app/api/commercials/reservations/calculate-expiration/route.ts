// src/app/api/commercial/reservations/calculate-expiration/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateCreation } = body;

    console.log('📝 Date de création reçue:', dateCreation);

    if (!dateCreation) {
      return NextResponse.json(
        { error: 'Date de création requise' },
        { status: 400 }
      );
    }

    const startDate = new Date(dateCreation);
    let expirationDate = new Date(startDate);
    let heuresAjoutees = 0;

    // ✅ Ajouter 72h en jours ouvrables (lundi-vendredi)
    while (heuresAjoutees < 72) {
      expirationDate.setHours(expirationDate.getHours() + 1);
      
      // Vérifier si c'est un jour ouvrable (lundi-vendredi)
      const jourSemaine = expirationDate.getDay();
      if (jourSemaine !== 0 && jourSemaine !== 6) {
        heuresAjoutees++;
      }
    }

    console.log('⏰ Date d\'expiration calculée:', expirationDate);

    // Formater les dates
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    // ✅ Format MySQL pour la sauvegarde
    const expirationMySQL = expirationDate.toISOString().slice(0, 19).replace('T', ' ');

    return NextResponse.json({
      success: true,
      dateCreation: startDate.toLocaleString('fr-FR', options),
      dateExpiration: expirationDate.toLocaleString('fr-FR', options),
      expirationISO: expirationDate.toISOString(),
      expirationMySQL: expirationMySQL,
      heuresEffectives: 72,
      joursOuvrables: true
    });

  } catch (error) {
    console.error('❌ Erreur calcul expiration:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la date d\'expiration: ' + (error as Error).message },
      { status: 500 }
    );
  }
}