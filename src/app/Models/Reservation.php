<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    // Définir la table
    protected $table = 'reservation';
    
    // Clé primaire
    protected $primaryKey = 'id_reservation';
    
    // Champs qui peuvent être remplis
    protected $fillable = [
        'id_client',
        'id_commercial',
        'id_chef_validation',
        'numero_commande',
        'date_creation',
        'date_debut_campagne',
        'date_fin_campagne',
        'statut',
        'est_verrouille',
        'date_verrouillage',
        'notes',
        'date_expiration',
        'photoCampagneUrl',
        'photo_metadata',
        'photo_latitude',
        'photo_longitude',
        'date_upload_photo'
    ];

    /**
     * RELATION : Une réservation a plusieurs lignes de réservation
     */
    public function lignes()
    {
        return $this->hasMany(LigneReservation::class, 'id_reservation');
    }

    /**
     * VÉRIFICATION 1 : La campagne est-elle terminée ?
     * Exemple : date_fin_campagne = 2024-01-01, aujourd'hui = 2024-01-02
     * → retourne VRAI (la campagne est terminée)
     */
    public function isCampaignFinished(): bool
    {
        // Vérifier si date_fin_campagne est dans le passé
        return $this->date_fin_campagne < now();
    }

    /**
     * VÉRIFICATION 2 : La réservation est-elle expirée ?
     * Conditions :
     * 1. La date d'expiration est passée
     * 2. ET la réservation n'est pas verrouillée (est_verrouille = 0)
     * 3. ET le statut n'est pas "Confirmée" (sinon elle est validée)
     */
    public function isExpired(): bool
    {
        // Vérifier si date_expiration existe et est dans le passé
        if (empty($this->date_expiration)) {
            return false;
        }
        
        // Une réservation est expirée si :
        // - La date d'expiration est passée
        // - Elle n'est pas verrouillée
        // - Son statut n'est pas "Confirmée"
        return $this->date_expiration < now() 
            && $this->est_verrouille == 0
            && $this->statut != 'Confirmée';
    }

    /**
     * ACTION : Déplacer la réservation vers l'historique
     */
    public function moveToHistorique(string $motif): bool
    {
        try {
            // 1. Créer une copie dans l'historique
            $historique = new HistoriqueReservation();
            
            // 2. Copier toutes les données
            $historique->id_reservation = $this->id_reservation;
            $historique->id_client = $this->id_client;
            $historique->id_commercial = $this->id_commercial;
            $historique->id_chef_validation = $this->id_chef_validation;
            $historique->numero_commande = $this->numero_commande;
            $historique->date_creation = $this->date_creation;
            $historique->date_debut_campagne = $this->date_debut_campagne;
            $historique->date_fin_campagne = $this->date_fin_campagne;
            $historique->date_expiration = $this->date_expiration;
            $historique->est_verrouille = $this->est_verrouille;
            $historique->date_verrouillage = $this->date_verrouillage;
            $historique->notes = $this->notes;
            $historique->photoCampagneUrl = $this->photoCampagneUrl;
            $historique->photo_metadata = $this->photo_metadata;
            $historique->photo_latitude = $this->photo_latitude;
            $historique->photo_longitude = $this->photo_longitude;
            $historique->date_upload_photo = $this->date_upload_photo;
            
            // 3. Ajouter les informations d'archivage
            $historique->statut = $this->statut;
            $historique->date_deplacement = now();
            $historique->motif_deplacement = $motif; // "terminée" ou "expirée"
            $historique->ancien_statut = $this->statut;
            $historique->nouveau_statut = $motif === 'terminée' ? 'Terminée' : 'Expirée';
            
            // 4. Sauvegarder dans l'historique
            $historique->save();
            
            // 5. Supprimer la réservation de la table principale
            $this->delete();
            
            return true;
            
        } catch (\Exception $e) {
            // En cas d'erreur, journaliser
            \Log::error('Erreur lors du déplacement vers historique : ' . $e->getMessage());
            return false;
        }
    }
}