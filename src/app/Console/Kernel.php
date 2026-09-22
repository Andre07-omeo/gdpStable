<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected function schedule(Schedule $schedule)
    {
        // Exécution tous les jours à 1h du matin (moment où il y a moins d'activité)
        $schedule->command('reservations:clean --force --batch=50')
                 ->dailyAt('01:00')
                 ->withoutOverlapping()           // Éviter les doublons
                 ->appendOutputTo(storage_path('logs/reservations_cleanup.log'));
                 // Journaliser les résultats

        // Exécution aussi à midi pour les réservations qui expirent dans la journée
        $schedule->command('reservations:clean --force --batch=30')
                 ->dailyAt('12:00')
                 ->withoutOverlapping()
                 ->appendOutputTo(storage_path('logs/reservations_cleanup_midi.log'));

        // Nettoyer les logs une fois par semaine
        $schedule->command('reservations:clean-logs')
                 ->weekly()
                 ->sundays()
                 ->at('02:00');
    }
}