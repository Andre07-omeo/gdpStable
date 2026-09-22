<?php

namespace App\Services;

use App\Models\Reservation;
use App\Models\HistoriqueReservation;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ReservationCleanupService
{
    /**
     * Nettoie toutes les réservations
     * 
     * Ce service agit comme un robot qui :
     * 1. Parcourt toutes les réservations
     * 2. Vérifie si elles sont terminées ou expirées
     * 3. Les déplace vers l'historique
     * 4. Tient des statistiques
     */
    public function cleanAllReservations(): array
    {
        // Initialiser les compteurs
        $stats = [
            'terminees' => 0,      // Réservations avec campagne terminée
            'expirees' => 0,       // Réservations expirées
            'erreurs' => 0,        // Erreurs rencontrées
            'details' => []        // Détails pour chaque réservation
        ];

        // Récupérer toutes les réservations non encore archivées
        $reservations = Reservation::all();

        foreach ($reservations as $reservation) {
            try {
                // CAS 1 : La campagne est terminée
                if ($reservation->isCampaignFinished()) {
                    // Changer le statut avant l'archivage
                    $reservation->statut = 'Terminée';
                    $reservation->save();
                    
                    // Déplacer vers l'historique avec motif "terminée"
                    if ($reservation->moveToHistorique('terminée')) {
                        $stats['terminees']++;
                        $stats['details'][] = [
                            'id' => $reservation->id_reservation,
                            'commande' => $reservation->numero_commande,
                            'motif' => 'Campagne terminée',
                            'date_fin' => $reservation->date_fin_campagne
                        ];
                    }
                    continue;
                }

                // CAS 2 : La réservation est expirée
                if ($reservation->isExpired()) {
                    // Changer le statut avant l'archivage
                    $reservation->statut = 'Expirée';
                    $reservation->save();
                    
                    // Déplacer vers l'historique avec motif "expirée"
                    if ($reservation->moveToHistorique('expirée')) {
                        $stats['expirees']++;
                        $stats['details'][] = [
                            'id' => $reservation->id_reservation,
                            'commande' => $reservation->numero_commande,
                            'motif' => 'Réservation expirée',
                            'date_expiration' => $reservation->date_expiration
                        ];
                    }
                    continue;
                }

            } catch (\Exception $e) {
                // En cas d'erreur, on la note
                Log::error("❌ Erreur réservation ID {$reservation->id_reservation}: " . $e->getMessage());
                $stats['erreurs']++;
            }
        }

        // Journaliser le résumé
        Log::info('📊 Résumé du nettoyage', [
            'terminees' => $stats['terminees'],
            'expirees' => $stats['expirees'],
            'erreurs' => $stats['erreurs']
        ]);

        return $stats;
    }

    /**
     * Nettoie par lots (pour les grandes bases de données)
     */
    public function cleanReservationsByBatch(int $batchSize = 50): array
    {
        $stats = [
            'terminees' => 0,
            'expirees' => 0,
            'erreurs' => 0,
            'details' => []
        ];

        // Traiter par lots de 50 réservations
        Reservation::chunk($batchSize, function ($reservations) use (&$stats) {
            foreach ($reservations as $reservation) {
                try {
                    if ($reservation->isCampaignFinished()) {
                        $reservation->statut = 'Terminée';
                        $reservation->save();
                        if ($reservation->moveToHistorique('terminée')) {
                            $stats['terminees']++;
                            $stats['details'][] = [
                                'id' => $reservation->id_reservation,
                                'commande' => $reservation->numero_commande,
                                'motif' => 'Campagne terminée'
                            ];
                        }
                        continue;
                    }

                    if ($reservation->isExpired()) {
                        $reservation->statut = 'Expirée';
                        $reservation->save();
                        if ($reservation->moveToHistorique('expirée')) {
                            $stats['expirees']++;
                            $stats['details'][] = [
                                'id' => $reservation->id_reservation,
                                'commande' => $reservation->numero_commande,
                                'motif' => 'Réservation expirée'
                            ];
                        }
                        continue;
                    }

                } catch (\Exception $e) {
                    Log::error("❌ Erreur batch ID {$reservation->id_reservation}: " . $e->getMessage());
                    $stats['erreurs']++;
                }
            }
        });

        return $stats;
    }

    /**
     * Vérifie qu'il n'y a pas de doublons dans l'historique
     */
    public function verifierDoublons(): array
    {
        $doublons = DB::table('historique_reservation')
            ->select('id_reservation', DB::raw('COUNT(*) as total'))
            ->groupBy('id_reservation')
            ->having('total', '>', 1)
            ->get();

        return $doublons->toArray();
    }
}