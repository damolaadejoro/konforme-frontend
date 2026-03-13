import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, ExternalLink, Shield, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCountryData } from '../hooks/useCountryData'
import { Card, Button } from './ui'

function countryFlag(code: string): string {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

export default function CountryInfoCard() {
  const { t } = useTranslation()
  const { currentCountry, loading } = useCountryData()
  const navigate = useNavigate()

  if (loading) return null

  if (!currentCountry) {
    return (
      <Card>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-navy-900/60 border border-navy-700">
            <Globe size={20} className="text-navy-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">{t('countryInfo.title')}</h3>
            <p className="text-xs text-navy-400 mb-3">{t('countryInfo.noCountry')}</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
              {t('countryInfo.goToSettings')}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const statusColor = currentCountry.transpositionStatus === 'transposed'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : currentCountry.transpositionStatus === 'partial'
    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
    : 'bg-red-500/15 text-red-400 border-red-500/30'

  const statusLabel = t(`countryInfo.${currentCountry.transpositionStatus}`)

  // Parse authority name — format is "Name (ACRONYM)" from the API
  const authorityFull = currentCountry.competentAuthorityName || ''
  const acronymMatch = authorityFull.match(/\(([^)]+)\)/)
  const authorityName = acronymMatch ? authorityFull.replace(/\s*\([^)]+\)/, '').trim() : authorityFull
  const authorityAcronym = acronymMatch ? acronymMatch[1] : ''
  const authorityUrl = currentCountry.competentAuthorityUrl || ''

  const notes = currentCountry.researchNotes
    ? currentCountry.researchNotes.split('\n').filter(n => n.trim())
    : []

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="text-3xl leading-none">
          {countryFlag(currentCountry.code)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-sm font-bold text-white">{t('countryInfo.title')}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusColor}`}>
              {statusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-navy-400 mb-0.5">{t('countryInfo.authority')}</p>
              <p className="text-white font-medium">{authorityName}</p>
              {authorityAcronym && (
                <p className="text-cyan-400 text-[11px]">({authorityAcronym})</p>
              )}
              {authorityUrl && (
                <a
                  href={authorityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 mt-1"
                >
                  {authorityUrl.replace(/^https?:\/\//, '')}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <p className="text-navy-400 mb-0.5">{t('countryInfo.nationalLaw')}</p>
                <p className="text-white font-medium">{currentCountry.transpositionLawName || '—'}</p>
              </div>
              {currentCountry.csirtUrl && (
                <a
                  href={currentCountry.csirtUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all text-[11px] font-medium"
                >
                  <Shield size={12} />
                  {t('countryInfo.reportIncident')}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>

          {notes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-navy-700">
              <div className="flex items-center gap-2 mb-2">
                <Info size={13} className="text-sky-400" />
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">{t('countryInfo.specificRequirements')}</h4>
              </div>
              <ul className="space-y-1.5">
                {notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-navy-200">
                    <span className="text-sky-400 mt-0.5">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
