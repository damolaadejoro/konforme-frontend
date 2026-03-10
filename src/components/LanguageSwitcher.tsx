import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { updateAccount } from '../services/api'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'pt', label: 'Português', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', label: 'Español', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'it', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', label: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}' },
]

interface LanguageSwitcherProps {
  compact?: boolean
}

export default function LanguageSwitcher({ compact }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const { language, setLanguage, isAuthenticated } = useAuth()
  const current = language || i18n.language || 'en'

  const handleChange = async (code: string) => {
    i18n.changeLanguage(code)
    setLanguage(code)
    if (isAuthenticated) {
      try {
        await updateAccount({ language: code })
      } catch { /* ignore */ }
    }
  }

  if (compact) {
    return (
      <select
        value={current}
        onChange={e => handleChange(e.target.value)}
        className="px-2 py-1 rounded-lg bg-navy-900/60 border border-navy-700 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <div>
      <select
        value={current}
        onChange={e => handleChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-navy-900/60 border border-navy-700 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none"
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  )
}
