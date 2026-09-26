'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/PanneauForm.tsximport { useState, useEffect } from 'react';
import {
    X, Plus, Trash2, Save, Loader2,
    ChevronRight, ChevronLeft, Layout, Ruler
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimpleLocationSelector } from '@/components/locations/SimpleLocationSelector';
import { LocationPickerSimple } from '@/components/locations/LocationPicker';

interface PanneauFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    user: any;
}

interface TypeFace {
    id_type_face: number;
    libelle: string;
    hauteur_cm: number;
    largeur_cm: number;
    est_scroller: number;
}

interface Face {
    id: number;
    type_face_id: number;
    libelle: string;
    orientation: string;
}

export default function PanneauForm({ isOpen, onClose, onSave, user }: PanneauFormProps) {
    // États principaux
    const [step, setStep] = useState(1);
    const [position, setPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Données de localisation
    const [typesFace, setTypesFace] = useState<TypeFace[]>([]);

    // Localisation sélectionnée (venant de la BD)
    const [location, setLocation] = useState({
        paysId: undefined as number | undefined,
        provinceId: undefined as number | undefined,
        villeId: undefined as number | undefined,
        communeId: undefined as number | undefined,
    });

    // Formulaire
    const [formData, setFormData] = useState({
        nom: '',
        pays_id: '',
        province_id: '',
        ville_id: '',
        commune_id: '',
        adresse_manuelle: '',
        latitude: '',
        longitude: '',
        dimension: ''
    });

    // Faces - Suppression de hauteur et largeur
    const [faces, setFaces] = useState<Face[]>([
        { id: Date.now(), type_face_id: 1, libelle: 'Trivision', orientation: '' }
    ]);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [faceCounter, setFaceCounter] = useState(1);

    // Gestionnaire de changement de localisation (venant de la BD)
    const handleLocationChange = (selection: any) => {
        setLocation(selection);
        setFormData(prev => ({
            ...prev,
            pays_id: selection.paysId?.toString() || '',
            province_id: selection.provinceId?.toString() || '',
            ville_id: selection.villeId?.toString() || '',
            commune_id: selection.communeId?.toString() || '',
        }));
        validateForm();
    };

    // Gestionnaire de changement de position (GPS/Google Maps)
    const handlePositionChange = (newPosition: { lat: number; lng: number; accuracy: number }) => {
        setPosition(newPosition);
        setFormData(prev => ({
            ...prev,
            latitude: newPosition.lat.toString(),
            longitude: newPosition.lng.toString()
        }));
        validateForm();
    };

    // Charger les types de face
    const loadTypesFace = async () => {
        try {
            const res = await fetch('/api/type-face');
            if (res.ok) {
                const data = await res.json();
                setTypesFace(data);
                if (data.length > 0) {
                    setFaces([{
                        id: Date.now(),
                        type_face_id: data[0].id_type_face,
                        libelle: data[0].libelle,
                        orientation: ''
                    }]);
                }
            }
        } catch (error) {
            console.error('Erreur chargement types face:', error);
        }
    };

    // Initialisation
    useEffect(() => {
        if (isOpen) {
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
            loadTypesFace();
            setErrors({});
            setPosition(null);
            setLocation({
                paysId: undefined,
                provinceId: undefined,
                villeId: undefined,
                communeId: undefined,
            });
            setFormData({
                nom: '',
                pays_id: '',
                province_id: '',
                ville_id: '',
                commune_id: '',
                adresse_manuelle: '',
                latitude: '',
                longitude: '',
                dimension: ''
            });
        }
    }, [isOpen]);

    // Gestion des faces
    const addFace = () => {
        setFaceCounter(prev => prev + 1);
        const defaultType = typesFace.length > 0 ? typesFace[0] : { id_type_face: 1, libelle: 'Standard' };
        setFaces([...faces, {
            id: Date.now() + faceCounter,
            type_face_id: defaultType.id_type_face,
            libelle: defaultType.libelle,
            orientation: ''
        }]);
    };

    const removeFace = (index: number) => {
        if (faces.length <= 1) return;
        setFaces(faces.filter((_, i) => i !== index));
    };

    const updateFace = (index: number, field: keyof Face, value: any) => {
        const newFaces = [...faces];
        if (field === 'type_face_id') {
            const selectedType = typesFace.find(t => t.id_type_face === value);
            if (selectedType) {
                newFaces[index] = {
                    ...newFaces[index],
                    type_face_id: selectedType.id_type_face,
                    libelle: selectedType.libelle,
                };
            }
        } else {
            newFaces[index] = { ...newFaces[index], [field]: value };
        }
        setFaces(newFaces);
    };

    // Validation
    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
        if (!formData.pays_id) newErrors.pays = 'Le pays est requis';
        if (!formData.province_id) newErrors.province = 'La province est requise';
        if (!formData.ville_id) newErrors.ville = 'La ville est requise';
        if (!formData.commune_id) newErrors.commune = 'La commune est requise';
        if (!formData.latitude || !formData.longitude) newErrors.position = 'La position est requise';

        faces.forEach((face, index) => {
            if (!face.type_face_id) newErrors[`face_${index}_type`] = 'Type requis';
            if (!face.orientation.trim()) newErrors[`face_${index}_orientation`] = 'Sens requis';
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Submit
    const handleSubmit = async () => {
        if (!validateForm()) {
            setStep(1);
            const errorMessages = Object.values(errors).join('\n');
            alert(`⚠️ Veuillez corriger les erreurs:\n${errorMessages}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const paysId = parseInt(formData.pays_id);
            const provinceId = parseInt(formData.province_id);
            const villeId = parseInt(formData.ville_id);
            const communeId = parseInt(formData.commune_id);

            if (!paysId || !provinceId || !villeId || !communeId) {
                alert('⚠️ Veuillez sélectionner un pays, une province, une ville et une commune');
                setIsSubmitting(false);
                return;
            }

            const data = {
                nom: formData.nom,
                adresse: formData.adresse_manuelle || '',
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                pays_id: paysId,
                province_id: provinceId,
                ville_id: villeId,
                commune_id: communeId,
                dimension: formData.dimension || 'N/A',
                faces: faces.map(f => ({
                    type_face_id: f.type_face_id,
                    libelle: f.libelle,
                    orientation: f.orientation
                })),
                created_by: user?.id_user || user?.id,
                precision_gps: position?.accuracy || 0
            };

            console.log('📤 Envoi des données:', data);

            const res = await fetch('/api/panneaux/enregistrer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                alert('✅ Panneau enregistré avec succès !');
                onSave(result);
                onClose();
            } else {
                alert('❌ Erreur: ' + (result.error || 'Erreur inconnue'));
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            alert('❌ Erreur lors de l\'enregistrement');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-6 flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3">
                                <motion.div
                                    initial={{ rotate: -180, scale: 0 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ type: "spring", damping: 15, stiffness: 200 }}
                                    className="w-12 h-12 bg-amber-400/20 rounded-2xl flex items-center justify-center"
                                >
                                    <Layout size={24} className="text-amber-400" />
                                </motion.div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter">
                                        Nouveau <span className="text-amber-400">Panneau</span>
                                    </h2>
                                    <p className="text-sm text-blue-300">
                                        Étape {step}/2 • {step === 1 ? '📍 Localisation' : '📐 Configuration des faces'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-red-500/80 rounded-xl transition-all duration-300 text-white"
                        >
                            <X size={22} />
                        </motion.button>
                    </div>
                    <div className="mt-5 flex gap-1.5">
                        {[1, 2].map((s) => (
                            <motion.div
                                key={s}
                                initial={{ width: 0 }}
                                animate={{ width: s <= step ? '100%' : '0%' }}
                                transition={{ duration: 0.5 }}
                                className={`flex-1 h-2 rounded-full transition-all duration-500 ${s <= step ? 'bg-amber-400' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/80">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="space-y-5"
                            >
                                {/* Position - LocationPickerSimple */}
                                <LocationPickerSimple
                                    initialPosition={position}
                                    onPositionChange={handlePositionChange}
                                />

                                {/* Nom */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">
                                        Nom du panneau *
                                        {errors.nom && <span className="text-red-500 ml-2 text-xs">{errors.nom}</span>}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3.5 bg-white rounded-xl border-2 border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition uppercase font-medium"
                                        placeholder="Ex: Panneau Central Gombe"
                                        value={formData.nom}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setFormData({ ...formData, nom: e.target.value.toUpperCase() });
                                            validateForm();
                                        }}
                                    />
                                </motion.div>

                                {/* Localisation - SimpleLocationSelector */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <SimpleLocationSelector
                                        value={location}
                                        onChange={handleLocationChange}
                                    />
                                </motion.div>

                                {/* Adresse */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">
                                        Adresse précise (optionnel)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3.5 bg-white rounded-xl border-2 border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                                        placeholder="Ex: Avenue Lumumba, N°15"
                                        value={formData.adresse_manuelle}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                            setFormData({ ...formData, adresse_manuelle: e.target.value })
                                        }
                                    />
                                </motion.div>

                                {/* Dimension du panneau */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <label className="text-sm font-bold text-gray-700 block mb-1.5">
                                        <Ruler size={16} className="inline mr-1 text-blue-500" />
                                        Dimension du panneau
                                        {errors.dimension && <span className="text-red-500 ml-2 text-xs">{errors.dimension}</span>}
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3.5 bg-white rounded-xl border-2 border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition"
                                        placeholder="Ex: 3m x 2m ou 300x200 cm"
                                        value={formData.dimension}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setFormData({ ...formData, dimension: e.target.value });
                                            validateForm();
                                        }}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        💡 Exemples: 3m x 2m, 300x200 cm, 4m x 3m
                                    </p>
                                </motion.div>

                                {/* Suivant */}
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setStep(2)}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-bold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-lg"
                                >
                                    Suivant <ChevronRight size={24} />
                                    {Object.keys(errors).length > 0 && (
                                        <span className="ml-2 text-sm bg-white/20 px-3 py-0.5 rounded-full">
                                            ⚠️ {Object.keys(errors).length}
                                        </span>
                                    )}
                                </motion.button>
                            </motion.div>
                        )}

                        {/* Étape 2 - Configuration des faces */}
                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="space-y-5"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <Layout size={20} className="text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">Configuration des faces</h3>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={addFace}
                                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={18} /> Ajouter
                                    </motion.button>
                                </div>

                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {faces.map((face, index) => (
                                            <motion.div
                                                key={face.id}
                                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                                className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm p-5 hover:border-blue-300 transition-all duration-300 hover:shadow-md"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                                        <span className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-xs text-blue-600 font-bold">
                                                            {index + 1}
                                                        </span>
                                                        Face #{index + 1}
                                                    </h4>
                                                    {faces.length > 1 && (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => removeFace(index)}
                                                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all duration-300"
                                                        >
                                                            <Trash2 size={18} />
                                                        </motion.button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 block mb-1.5">
                                                            Type *
                                                            {errors[`face_${index}_type`] && (
                                                                <span className="text-red-500 ml-2 text-xs">{errors[`face_${index}_type`]}</span>
                                                            )}
                                                        </label>
                                                        <select
                                                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                                                            value={face.type_face_id}
                                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                                updateFace(index, 'type_face_id', parseInt(e.target.value));
                                                                validateForm();
                                                            }}
                                                        >
                                                            {typesFace.map((type) => (
                                                                <option key={type.id_type_face} value={type.id_type_face}>
                                                                    {type.libelle}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 block mb-1.5">
                                                            Sens *
                                                            {errors[`face_${index}_orientation`] && (
                                                                <span className="text-red-500 ml-2 text-xs">{errors[`face_${index}_orientation`]}</span>
                                                            )}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition uppercase"
                                                            placeholder="NORD, SUD, EST, OUEST"
                                                            value={face.orientation}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                updateFace(index, 'orientation', e.target.value.toUpperCase());
                                                                validateForm();
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                {/* Résumé */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl border-2 border-blue-100 p-5 flex justify-between items-center"
                                >
                                    <div>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-bold">Total:</span> {faces.length} face(s)
                                        </p>
                                        {position && (
                                            <p className="text-xs font-mono text-gray-500 mt-1">
                                                📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                                            </p>
                                        )}
                                        {formData.dimension && (
                                            <p className="text-xs font-mono text-gray-500 mt-1">
                                                📐 Dimension: {formData.dimension}
                                            </p>
                                        )}
                                    </div>
                                    {Object.keys(errors).length > 0 && (
                                        <span className="text-sm text-red-500 font-bold">
                                            ⚠️ {Object.keys(errors).length} erreur(s)
                                        </span>
                                    )}
                                </motion.div>

                                <div className="flex gap-4">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-3.5 bg-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft size={20} /> Retour
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className={`flex-1 py-3.5 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                                            isSubmitting
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-xl'
                                        }`}
                                    >
                                        {isSubmitting ? <Loader2 size={22} className="animate-spin" /> : <Save size={22} />}
                                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}