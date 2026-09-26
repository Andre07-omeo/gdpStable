'use client';

export const dynamic = 'force-dynamic';

// src/components/locations/LocationPickerSimple.tsximport { useState, useEffect } from 'react';
import {
    MapPin, Satellite, Loader2,
    CheckCircle, AlertCircle, Globe
} from 'lucide-react';

interface LocationPickerSimpleProps {
    onPositionChange?: (position: { lat: number; lng: number; accuracy: number }) => void;
    initialPosition?: { lat: number; lng: number; accuracy: number } | null;
}

export function LocationPickerSimple({ onPositionChange, initialPosition = null }: LocationPickerSimpleProps) {
    const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(initialPosition);
    const [isGpsSearching, setIsGpsSearching] = useState(false);
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');

    // Notifier le parent des changements de position
    useEffect(() => {
        if (position && onPositionChange) {
            onPositionChange(position);
        }
    }, [position, onPositionChange]);

    // Mettre à jour les champs manuels quand la position change
    useEffect(() => {
        if (position) {
            setManualLat(position.lat.toString());
            setManualLng(position.lng.toString());
        }
    }, [position]);

    // Démarrer le GPS
    const startGPS = () => {
        if (isGpsLoading || isGpsSearching) return;

        if (!navigator.geolocation) {
            setGpsError('❌ La géolocalisation n\'est pas supportée');
            return;
        }

        setIsGpsLoading(true);
        setIsGpsSearching(true);
        setGpsError(null);

        const timeoutId = setTimeout(() => {
            setIsGpsLoading(false);
            setIsGpsSearching(false);
            if (!position) {
                setGpsError('⏱️ Délai dépassé - Saisie manuelle');
            }
        }, 10000);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                clearTimeout(timeoutId);
                const accuracy = pos.coords.accuracy;
                const newPosition = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: accuracy
                };
                setPosition(newPosition);
                setGpsError(accuracy < 20 ? '✅ Position précise' : `📍 Précision: ${Math.round(accuracy)}m`);
                setIsGpsLoading(false);
                setIsGpsSearching(false);
            },
            (err) => {
                clearTimeout(timeoutId);
                let msg = 'Impossible d\'obtenir votre position';
                if (err.code === 1) msg = '❌ Accès refusé - Autorisez la géolocalisation';
                else if (err.code === 2) msg = '❌ Position indisponible';
                else if (err.code === 3) msg = '⏱️ Délai dépassé';
                setGpsError(msg + ' - Saisie manuelle');
                setIsGpsLoading(false);
                setIsGpsSearching(false);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    };

    // Ouvrir Google Maps dans un nouvel onglet
    const openGoogleMaps = () => {
        const lat = position?.lat || -4.3217;
        const lng = position?.lng || 15.3124;
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
        setGpsError('💡 Copiez les coordonnées depuis Google Maps et collez-les ci-dessous');
    };

    // Appliquer les coordonnées manuelles
    const applyManualCoordinates = () => {
        const lat = parseFloat(manualLat);
        const lng = parseFloat(manualLng);

        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            setPosition({ lat, lng, accuracy: 0 });
            setGpsError(`✅ Position définie: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } else {
            setGpsError('❌ Coordonnées invalides. Format: -4.3217, 15.3124');
        }
    };

    return (
        <div className="space-y-3">
            {/* Statut de la position */}
            <div className={`rounded-2xl border-2 p-4 transition-all duration-300 ${position ? 'border-emerald-400 bg-emerald-50/50' : 'border-blue-200 bg-white'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${position ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        {position ? (
                            <CheckCircle size={20} className="text-emerald-600" />
                        ) : (
                            <MapPin size={20} className="text-blue-600" />
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">
                            {position ? '✅ Position définie' : '📍 Position du panneau'}
                        </p>
                        {position ? (
                            <p className="text-xs font-mono text-gray-600">
                                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                                {position.accuracy > 0 && ` (${Math.round(position.accuracy)}m)`}
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500">Utilisez GPS, Google Maps ou saisie manuelle</p>
                        )}
                    </div>
                </div>
                {gpsError && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50/80 p-2 rounded-xl flex items-start gap-1.5">
                        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                        <span>{gpsError}</span>
                    </div>
                )}
            </div>

            {/* Boutons GPS et Google Maps */}
            <div className="flex gap-2">
                <button
                    onClick={startGPS}
                    disabled={isGpsLoading || isGpsSearching}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm ${
                        isGpsLoading || isGpsSearching
                            ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                    {isGpsLoading || isGpsSearching ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Satellite size={16} />
                    )}
                    {isGpsLoading ? 'Chargement...' : isGpsSearching ? 'GPS...' : 'GPS'}
                </button>
                <button
                    onClick={openGoogleMaps}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2 text-sm"
                >
                    <Globe size={16} />
                    Google Maps
                </button>
            </div>

            {/* Saisie manuelle des coordonnées */}
            <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-600 mb-2">📝 Saisie manuelle des coordonnées</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Latitude</label>
                        <input
                            type="text"
                            placeholder="-4.3217"
                            className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition font-mono text-sm"
                            value={manualLat}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualLat(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Longitude</label>
                        <input
                            type="text"
                            placeholder="15.3124"
                            className="w-full px-3 py-2 bg-white rounded-xl border-2 border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition font-mono text-sm"
                            value={manualLng}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualLng(e.target.value)}
                        />
                    </div>
                </div>
                <button
                    onClick={applyManualCoordinates}
                    className="w-full mt-2 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition text-sm"
                >
                    Appliquer les coordonnées
                </button>
            </div>
        </div>
    );
}