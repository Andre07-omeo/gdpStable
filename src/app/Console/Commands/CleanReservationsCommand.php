<?php

namespace App\Console\Commands;

use App\Services\ReservationCleanupService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CleanReservationsCommand extends Command
{
    protected $signature = 'reservations:clean 
                           {--batch=50 : Nombre de réservations par lot}
                           {--dry-run : Simuler sans effectuer de changement}
                           {--force : Exécuter sans confirmation}';

    protected $description = '🧹 Nettoyer les réservations terminées et expirées';

    protected $cleanupService;

    public function __construct(ReservationCleanupService $cleanupService)
    {
        parent::__construct();
        $this->cleanupService = $cleanupService;
    }

    public function handle()
    {
        // Afficher l'en-tête
        $this->newLine();
        $this->line('╔═══════════════════════════════════════════════════════╗');
        $this->line('║     🧹  NETTOYAGE AUTOMATIQUE DES RÉSERVATIONS      ║');
        $this->line('╚═══════════════════════════════════════════════════════╝');
        $this->newLine();

        // Afficher la date
        $this->info('📅 Date d\'exécution : ' . Carbon::now()->format('d/m/Y H:i:s'));
        $this->newLine();

        // Mode simulation
        if ($this->option('dry-run')) {
            $this->warn('⚠️  MODE SIMULATION - Aucun changement ne sera effectué');
            $this->newLine();
        }

        // Demander confirmation si pas --force
        if (!$this->option('force') && !$this->option('dry-run')) {
            if (!$this->confirm('⚠️  Voulez-vous vraiment nettoyer les réservations ?')) {
                $this->info('❌ Opération annulée.');
                return 0;
            }
        }

        // Exécuter le nettoyage
        $this->info('🔄 Nettoyage en cours...');
        $this->newLine();

        $startTime = microtime(true);
        
        if ($this->option('dry-run')) {
            // Mode simulation : juste afficher ce qui serait fait
            $this->simulerNettoyage();
        } else {
            $batchSize = (int) $this->option('batch');
            $resultats = $this->cleanupService->cleanReservationsByBatch($batchSize);
            
            $executionTime = round(microtime(true) - $startTime, 2);
            
            // Afficher les résultats
            $this->afficherResultats($resultats, $executionTime);
        }

        return 0;
    }

    /**
     * Simuler le nettoyage sans modifier la base
     */
    private function simulerNettoyage()
    {
        $reservations = \App\Models\Reservation::all();
        
        $this->info('📋 Réservations qui seraient nettoyées :');
        $this->newLine();
        
        $aTraiter = [];
        
        foreach ($reservations as $reservation) {
            if ($reservation->isCampaignFinished()) {
                $aTraiter[] = [
                    'ID' => $reservation->id_reservation,
                    'Commande' => $reservation->numero_commande,
                    'Action' => 'Terminée',
                    'Date fin' => $reservation->date_fin_campagne->format('d/m/Y')
                ];
            } elseif ($reservation->isExpired()) {
                $aTraiter[] = [
                    'ID' => $reservation->id_reservation,
                    'Commande' => $reservation->numero_commande,
                    'Action' => 'Expirée',
                    'Date expiration' => $reservation->date_expiration->format('d/m/Y')
                ];
            }
        }
        
        if (count($aTraiter) > 0) {
            $this->table(['ID', 'N° Commande', 'Action', 'Date'], $aTraiter);
            $this->newLine();
            $this->info("📊 Total : " . count($aTraiter) . " réservation(s) à nettoyer");
        } else {
            $this->info('✅ Aucune réservation à nettoyer.');
        }
    }

    /**
     * Afficher les résultats du nettoyage
     */
    private function afficherResultats(array $resultats, float $executionTime)
    {
        $this->newLine();
        $this->line('┌─────────────────────────────────────────────────────────┐');
        $this->line('│                  📊  RÉSULTATS                        │');
        $this->line('├─────────────────────────────────────────────────────────┤');
        $this->line('│ ✅ Réservations terminées  : ' . str_pad($resultats['terminees'], 24, ' ', STR_PAD_LEFT) . ' │');
        $this->line('│ ⏰ Réservations expirées    : ' . str_pad($resultats['expirees'], 24, ' ', STR_PAD_LEFT) . ' │');
        $this->line('│ ❌ Erreurs                  : ' . str_pad($resultats['erreurs'], 24, ' ', STR_PAD_LEFT) . ' │');
        $this->line('├─────────────────────────────────────────────────────────┤');
        $this->line('│ ⏱️  Temps d\'exécution        : ' . str_pad($executionTime . 's', 24, ' ', STR_PAD_LEFT) . ' │');
        $this->line('└─────────────────────────────────────────────────────────┘');
        $this->newLine();

        // Afficher les détails si disponibles
        if (!empty($resultats['details'])) {
            $this->info('📋 Détails des réservations traitées :');
            $this->newLine();
            
            $details = array_slice($resultats['details'], 0, 10); // Afficher max 10 détails
            foreach ($details as $detail) {
                $this->line("  • ID {$detail['id']} - {$detail['commande']} : {$detail['motif']}");
            }
            
            if (count($resultats['details']) > 10) {
                $this->line("  ... et " . (count($resultats['details']) - 10) . " autres");
            }
            $this->newLine();
        }
    }
}