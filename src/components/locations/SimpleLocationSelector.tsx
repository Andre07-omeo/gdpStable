// components/locations/SimpleLocationSelector.tsx
'use client';

import { useState, useEffect } from 'react';

interface SimpleLocationSelectorProps {
    value?: {
        paysId?: number;
        provinceId?: number;
        villeId?: number;
        communeId?: number;
    };
    onChange?: (selection: {
        paysId?: number;
        provinceId?: number;
        villeId?: number;
        communeId?: number;
    }) => void;
    className?: string;
}

export function SimpleLocationSelector({ 
    value = {}, 
    onChange, 
    className = '' 
}: SimpleLocationSelectorProps) {
    console.log('🔍 SimpleLocationSelector rendu, value:', value);
    
    const [paysList, setPaysList] = useState<any[]>([]);
    const [provincesList, setProvincesList] = useState<any[]>([]);
    const [villesList, setVillesList] = useState<any[]>([]);
    const [communesList, setCommunesList] = useState<any[]>([]);
    
    const [selectedPays, setSelectedPays] = useState<number | undefined>(value.paysId);
    const [selectedProvince, setSelectedProvince] = useState<number | undefined>(value.provinceId);
    const [selectedVille, setSelectedVille] = useState<number | undefined>(value.villeId);
    const [selectedCommune, setSelectedCommune] = useState<number | undefined>(value.communeId);

    const [loading, setLoading] = useState({
        pays: false,
        provinces: false,
        villes: false,
        communes: false
    });

    const fetchLocations = async (type: string, parentId?: number) => {
        try {
            const url = parentId 
                ? `/api/locations?type=${type}&parentId=${parentId}`
                : `/api/locations?type=${type}`;
            
            console.log(`🔄 Fetching ${type} from:`, url);
            const res = await fetch(url);
            const data = await res.json();
            console.log(`📦 ${type} data:`, data);
            return data;
        } catch (error) {
            console.error(`Erreur chargement ${type}:`, error);
            return [];
        }
    };

    // Chargement des pays - UN SEUL useEffect
    useEffect(() => {
        console.log('🔄 Chargement des pays...');
        setLoading(prev => ({ ...prev, pays: true }));
        fetchLocations('pays').then(data => {
            console.log('📦 Pays chargés:', data);
            if (Array.isArray(data)) {
                setPaysList(data);
            } else {
                console.error('❌ Les pays ne sont pas un tableau:', data);
                setPaysList([]);
            }
            setLoading(prev => ({ ...prev, pays: false }));
        });
    }, []);

    useEffect(() => {
        console.log('🔄 selectedPays changé:', selectedPays);
        if (selectedPays) {
            setLoading(prev => ({ ...prev, provinces: true }));
            fetchLocations('provinces', selectedPays).then(data => {
                console.log('📦 Provinces chargées:', data);
                if (Array.isArray(data)) {
                    setProvincesList(data);
                } else {
                    console.error('❌ Les provinces ne sont pas un tableau:', data);
                    setProvincesList([]);
                }
                setSelectedProvince(undefined);
                setVillesList([]);
                setSelectedVille(undefined);
                setCommunesList([]);
                setSelectedCommune(undefined);
                setLoading(prev => ({ ...prev, provinces: false }));
            });
        } else {
            setProvincesList([]);
            setSelectedProvince(undefined);
            setVillesList([]);
            setSelectedVille(undefined);
            setCommunesList([]);
            setSelectedCommune(undefined);
        }
    }, [selectedPays]);

    useEffect(() => {
        console.log('🔄 selectedProvince changé:', selectedProvince);
        if (selectedProvince) {
            setLoading(prev => ({ ...prev, villes: true }));
            fetchLocations('villes', selectedProvince).then(data => {
                console.log('📦 Villes chargées:', data);
                if (Array.isArray(data)) {
                    setVillesList(data);
                } else {
                    console.error('❌ Les villes ne sont pas un tableau:', data);
                    setVillesList([]);
                }
                setSelectedVille(undefined);
                setCommunesList([]);
                setSelectedCommune(undefined);
                setLoading(prev => ({ ...prev, villes: false }));
            });
        } else {
            setVillesList([]);
            setSelectedVille(undefined);
            setCommunesList([]);
            setSelectedCommune(undefined);
        }
    }, [selectedProvince]);

    useEffect(() => {
        console.log('🔄 selectedVille changé:', selectedVille);
        if (selectedVille) {
            setLoading(prev => ({ ...prev, communes: true }));
            fetchLocations('communes', selectedVille).then(data => {
                console.log('📦 Communes chargées:', data);
                if (Array.isArray(data)) {
                    setCommunesList(data);
                } else {
                    console.error('❌ Les communes ne sont pas un tableau:', data);
                    setCommunesList([]);
                }
                setSelectedCommune(undefined);
                setLoading(prev => ({ ...prev, communes: false }));
            });
        } else {
            setCommunesList([]);
            setSelectedCommune(undefined);
        }
    }, [selectedVille]);

    // Notifier le parent des changements
    useEffect(() => {
        if (onChange) {
            const selection = {
                paysId: selectedPays,
                provinceId: selectedProvince,
                villeId: selectedVille,
                communeId: selectedCommune
            };
            console.log('📤 Notification parent:', selection);
            onChange(selection);
        }
    }, [selectedPays, selectedProvince, selectedVille, selectedCommune, onChange]);

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Pays */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
                <select
                    value={selectedPays || ''}
                    onChange={(e) => {
                        const value = e.target.value;
                        console.log('🔄 Pays sélectionné:', value);
                        setSelectedPays(value ? parseInt(value) : undefined);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={loading.pays}
                >
                    <option value="">{loading.pays ? 'Chargement...' : 'Sélectionnez un pays'}</option>
                    {paysList.map((p) => (
                        <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                </select>
                {paysList.length === 0 && !loading.pays && (
                    <p className="text-sm text-red-500 mt-1">⚠️ Aucun pays trouvé</p>
                )}
            </div>

            {/* Province */}
            {selectedPays && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                    <select
                        value={selectedProvince || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            console.log('🔄 Province sélectionnée:', value);
                            setSelectedProvince(value ? parseInt(value) : undefined);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loading.provinces}
                    >
                        <option value="">{loading.provinces ? 'Chargement...' : 'Sélectionnez une province'}</option>
                        {provincesList.map((p) => (
                            <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                    </select>
                    {provincesList.length === 0 && !loading.provinces && (
                        <p className="text-sm text-amber-500 mt-1">⚠️ Aucune province disponible</p>
                    )}
                </div>
            )}

            {/* Ville */}
            {selectedProvince && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                    <select
                        value={selectedVille || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            console.log('🔄 Ville sélectionnée:', value);
                            setSelectedVille(value ? parseInt(value) : undefined);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loading.villes}
                    >
                        <option value="">{loading.villes ? 'Chargement...' : 'Sélectionnez une ville'}</option>
                        {villesList.map((v) => (
                            <option key={v.id} value={v.id}>{v.nom}</option>
                        ))}
                    </select>
                    {villesList.length === 0 && !loading.villes && (
                        <p className="text-sm text-amber-500 mt-1">⚠️ Aucune ville disponible</p>
                    )}
                </div>
            )}

            {/* Commune */}
            {selectedVille && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commune *</label>
                    <select
                        value={selectedCommune || ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            console.log('🔄 Commune sélectionnée:', value);
                            setSelectedCommune(value ? parseInt(value) : undefined);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loading.communes}
                    >
                        <option value="">{loading.communes ? 'Chargement...' : 'Sélectionnez une commune'}</option>
                        {communesList.map((c) => (
                            <option key={c.id} value={c.id}>{c.nom}</option>
                        ))}
                    </select>
                    {communesList.length === 0 && !loading.communes && (
                        <p className="text-sm text-amber-500 mt-1">⚠️ Aucune commune disponible</p>
                    )}
                </div>
            )}
        </div>
    );
}