'use client';

// src/components/shared/Logo.tsxinterface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-2xl">📊</span>
      {showText && (
        <h1 className="text-xl font-bold text-gray-800">
          Panneaux <span className="text-blue-600">Pro</span>
        </h1>
      )}
    </div>
  );
}