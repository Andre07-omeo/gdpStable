<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoriqueReservation extends Model
{
    protected $table = 'historique_reservation';
    protected $primaryKey = 'id_historique';
    
    protected $fillable = [
        'id_reservation',
        'id_client',
        'id_commercial',
        'id_chef_validation',
        'numero_commande',
        'date_creation',
        'date_debut_campagne',
        'date_fin_campagne',
        'date_expiration',
        'statut',
        'est_verrouille',
        'date_verrouillage',
        'notes',
        'photoCampagneUrl',
        'photo_metadata',
        'photo_latitude',
        'photo_longitude',
        'date_upload_photo',
        'date_deplacement',
        'motif_deplacement',
        'ancien_statut',
        'nouveau_statut'
    ];
    
    protected $casts = [
        'date_creation' => 'datetime',
        'date_debut_campagne' => 'datetime',
        'date_fin_campagne' => 'datetime',
        'date_expiration' => 'datetime',
        'date_verrouillage' => 'datetime',
        'date_upload_photo' => 'datetime',
        'date_deplacement' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'est_verrouille' => 'boolean'
    ];
}