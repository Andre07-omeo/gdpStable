<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class CleanReservationLogs extends Command
{
    protected $signature = 'reservations:clean-logs';
    protected $description = 'Nettoyer les vieux logs de réservations';

    public function handle()
    {
        $logPath = storage_path('logs');
        $files = File::files($logPath);
        
        $cleaned = 0;
        foreach ($files as $file) {
            $filename = $file->getFilename();
            if (str_contains($filename, 'reservations_cleanup') && $file->getMTime() < now()->subDays(30)->timestamp) {
                File::delete($file->getPathname());
                $cleaned++;
            }
        }
        
        $this->info("🧹 {$cleaned} fichier(s) de log supprimés");
        return 0;
    }
}