// src/components/SelectEnum.tsx
'use client';

import React from 'react';

interface SelectEnumProps<T extends string> {
  label: string;
  value: T | '';
  onChange: (value: T) => void;
  options: readonly T[];
  labels?: Record<T, string>;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
}

export function SelectEnum<T extends string>({
  label,
  value,
  onChange,
  options,
  labels,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
}: SelectEnumProps<T>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        required={required}
        className={`
          w-full px-3 py-2 rounded-lg text-sm border transition
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        `}
      >
        <option value="">— Sélectionner —</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels?.[opt] || opt}
          </option>
        ))}
      </select>

      {helpText && !error && (
        <p className="text-xs text-gray-500 mt-0.5">{helpText}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      )}
    </div>
  );
}
