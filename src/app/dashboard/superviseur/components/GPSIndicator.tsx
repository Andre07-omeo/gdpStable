// src/app/dashboard/superviseur/components/GPSIndicator.tsx

import { motion } from 'framer-motion';

interface GPSIndicatorProps {
  userLocation: { lat: number; lng: number } | null;
  locationError: string | null;
}

export default function GPSIndicator({ userLocation, locationError }: GPSIndicatorProps) {
  return (
    <div className="absolute bottom-6 left-6 z-[1000]">
      {userLocation ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/70 backdrop-blur-xl rounded-full px-5 py-2.5 border-2 border-emerald-500/40 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              GPS Actif
            </span>
          </div>
        </motion.div>
      ) : locationError ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/70 backdrop-blur-xl rounded-full px-5 py-2.5 border-2 border-red-500/40 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-400 rounded-full" />
            <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
              {locationError}
            </span>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}