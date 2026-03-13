import React from 'react'

function countryFlag(code: string): string {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

interface CountrySelectorProps {
  countries: { code: string; name: string }[]
  value: string | null
  onChange: (code: string) => void
  label?: string
  placeholder?: string
}

export default function CountrySelector({ countries, value, onChange, label, placeholder }: CountrySelectorProps) {
  const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[#CBD8E8] mb-1.5">{label}</label>
      )}
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-navy-900/60 border border-navy-700 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none"
      >
        <option value="">{placeholder || 'Select country...'}</option>
        {sorted.map(c => (
          <option key={c.code} value={c.code}>
            {countryFlag(c.code)} {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
