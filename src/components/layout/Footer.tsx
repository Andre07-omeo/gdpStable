// src/components/layout/Footer.tsx

'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 border-t border-gray-800">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-400">GeoMarketing</span>
            <span className="text-xs">© {currentYear} Tous droits réservés</span>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#" className="hover:text-white transition">Mentions légales</a>
            <a href="#" className="hover:text-white transition">Politique de confidentialité</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}