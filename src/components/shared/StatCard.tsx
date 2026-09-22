// src/components/shared/StatCard.tsx
'use client';

import React from 'react';

type ColorType =
  | 'blue' | 'indigo' | 'emerald' | 'amber'
  | 'purple' | 'rose' | 'cyan' | 'slate';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  color?: ColorType;
  loading?: boolean;
}

const colorMap: Record<
  ColorType,
  { bg: string; text: string; border: string; iconColor: string }
> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    iconColor: 'text-blue-500' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  iconColor: 'text-indigo-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconColor: 'text-emerald-500' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   iconColor: 'text-amber-500' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  iconColor: 'text-purple-500' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    iconColor: 'text-rose-500' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    iconColor: 'text-cyan-500' },
  slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   iconColor: 'text-slate-500' },
};

export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  loading = false,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`
        stat-card
        ${c.bg} ${c.border}
        border
        rounded-md
        flex items-center justify-between
        transition-all duration-200
        hover:shadow-sm
        overflow-hidden
        w-full min-w-0
      `}
      title={label}
    >
      {/* Colonne gauche : label au-dessus + valeur en dessous */}
      <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
        <span className="stat-card-label text-gray-500 truncate">
          {label}
        </span>
        <span className={`stat-card-value ${c.text} truncate`}>
          {loading ? '…' : value}
        </span>
      </div>
      {/* Icône à droite */}
      {icon && (
        <div className={`stat-card-icon ${c.iconColor} flex-shrink-0 opacity-70`}>
          {icon}
        </div>
      )}
    </div>
  );
}