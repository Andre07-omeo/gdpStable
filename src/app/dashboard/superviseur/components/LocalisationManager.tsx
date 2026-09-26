'use client';

export const dynamic = 'force-dynamic';

// src/app/dashboard/superviseur/components/LocalisationManager.tsximport { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Map, MapPin, Building2, Home, 
  ChevronDown, ChevronRight 
} from 'lucide-react';

import LocalisationPaysTab from './LocalisationPaysTab';
import LocalisationProvincesTab from './LocalisationProvincesTab';
import LocalisationDistrictsTab from './LocalisationDistrictsTab';
import LocalisationVillesTab from './LocalisationVillesTab';
import LocalisationCommunesTab from './LocalisationCommunesTab';

type TabKey = 'pays' | 'provinces' | 'districts' | 'villes' | 'communes';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const TABS: Tab[] = [
  {
    key: 'pays',
    label: 'Pays',
    icon: <Globe size={18} />,
    description: 'Gérer les pays',
    color: 'blue',
  },
  {
    key: 'provinces',
    label: 'Provinces',
    icon: <Map size={18} />,
    description: 'Gérer les provinces',
    color: 'purple',
  },
  {
    key: 'districts',
    label: 'Districts',
    icon: <MapPin size={18} />,
    description: 'Gérer les districts',
    color: 'amber',
  },
  {
    key: 'villes',
    label: 'Villes',
    icon: <Building2 size={18} />,
    description: 'Gérer les villes',
    color: 'emerald',
  },
  {
    key: 'communes',
    label: 'Communes / Tronçons',
    icon: <Home size={18} />,
    description: 'Gérer les communes et tronçons',
    color: 'rose',
  },
];

export default function LocalisationManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('pays');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Globe size={24} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Enregistrement des localisations
            </h1>
            <p className="text-sm text-blue-200">
              Gérez la hiérarchie : Pays → Provinces → Districts / Villes → Communes
            </p>
          </div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200 bg-gray-50">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  relative flex items-center gap-2 px-4 sm:px-6 py-3.5 
                  font-bold text-sm transition-all
                  ${isActive 
                    ? 'text-blue-700 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* CONTENU DE L'ONGLET */}
        <div className="p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'pays' && <LocalisationPaysTab />}
              {activeTab === 'provinces' && <LocalisationProvincesTab />}
              {activeTab === 'districts' && <LocalisationDistrictsTab />}
              {activeTab === 'villes' && <LocalisationVillesTab />}
              {activeTab === 'communes' && <LocalisationCommunesTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}