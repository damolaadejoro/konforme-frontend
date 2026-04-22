import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight, ArrowLeft, CheckCircle2, Globe, Building2, Cloud,
  Loader2, Shield, AlertCircle, Search, Scale,
} from 'lucide-react'
import { Card, Button, Input } from '../components/ui'
import Logo from '../components/layout/Logo'
import { useAuth } from '../context/AuthContext'
import {
  getCountries, getCountry, getCountryTiers,
  setAccountCountry, updateScoringConfig, updateAccount,
  initiateAwsRoleConnection, completeAwsRoleConnection, initiateAzureOAuth,
  type CountryListItem, type CountryDetail, type EntityTier,
} from '../services/api'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'pt', label: 'Português', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', label: 'Español', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'it', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', label: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}' },
]

const SCORING_PRESETS = {
  balanced:        { technical: 0.40, assessment: 0.35, controls: 0.25 },
  'technical-first': { technical: 0.60, assessment: 0.20, controls: 0.20 },
  'governance-led':  { technical: 0.20, assessment: 0.50, controls: 0.30 },
  'controls-focused': { technical: 0.20, assessment: 0.20, controls: 0.60 },
} as const

function countryFlag(code: string): string {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

function formatTierKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function transpositionBadge(status: string, t: (key: string) => string) {
  const styles: Record<string, string> = {
    transposed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    partial: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    pending: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    not_transposed: 'bg-red-500/15 text-red-400 border-red-500/25',
  }
  const labels: Record<string, string> = {
    transposed: t('getStarted.countryTransposed'),
    partial: t('getStarted.countryPartial'),
    pending: t('getStarted.countryPending'),
    not_transposed: t('getStarted.countryNotTransposed'),
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${styles[status] || 'bg-navy-700 text-navy-300 border-navy-600'}`}>
      {labels[status] || t('getStarted.countryUnknown')}
    </span>
  )
}

export default function GetStarted() {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { accountName, setCountry: authSetCountry, setLanguage: authSetLanguage } = useAuth()

  // Step 1: Country
  const [countries, setCountries] = useState<CountryListItem[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [countryDetail, setCountryDetail] = useState<CountryDetail | null>(null)
  const [countrySearch, setCountrySearch] = useState('')

  // Step 2: Entity
  const [tiers, setTiers] = useState<EntityTier[]>([])
  const [tiersLoading, setTiersLoading] = useState(false)
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set())
  const [savingCountry, setSavingCountry] = useState(false)

  // Step 3: Scoring
  const [scoringPreset, setScoringPreset] = useState<string>('balanced')
  const [customWeights, setCustomWeights] = useState({ technical: 40, assessment: 35, controls: 25 })
  const [scoringSaving, setScoringSaving] = useState(false)

  // Step 4: Cloud
  const [cloudProvider, setCloudProvider] = useState<'aws' | 'azure' | null>(null)
  const [cloudForm, setCloudForm] = useState<Record<string, string>>({})
  const [cloudSaving, setCloudSaving] = useState(false)
  const [cloudError, setCloudError] = useState<string | null>(null)
  const [cloudConnected, setCloudConnected] = useState<Array<{ provider: string; alias: string }>>([])
  // AWS role flow
  const [awsRoleStep, setAwsRoleStep] = useState<'init' | 'pending'>('init')
  const [awsPendingCredId, setAwsPendingCredId] = useState<string | null>(null)
  const [awsCfUrl, setAwsCfUrl] = useState<string | null>(null)

  // Load countries on mount
  useEffect(() => {
    getCountries()
      .then(data => setCountries(data))
      .catch(() => {})
      .finally(() => setCountriesLoading(false))
  }, [])

  // Load country detail + tiers when country is selected
  useEffect(() => {
    if (!selectedCountryCode) {
      setCountryDetail(null)
      setTiers([])
      return
    }
    getCountry(selectedCountryCode)
      .then(d => setCountryDetail(d))
      .catch(() => {})
    setTiersLoading(true)
    getCountryTiers(selectedCountryCode)
      .then(d => setTiers(d))
      .catch(() => {})
      .finally(() => setTiersLoading(false))
  }, [selectedCountryCode])

  const filteredCountries = countries.filter(c => {
    if (!countrySearch) return true
    const q = countrySearch.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
      (c.nameLocal && c.nameLocal.toLowerCase().includes(q))
  })

  const handleCountrySelect = (code: string) => {
    setSelectedCountryCode(code)
    setSelectedTier(null)
  }

  const handleSaveCountry = async () => {
    if (!selectedCountryCode) return
    setSavingCountry(true)
    try {
      await setAccountCountry(selectedCountryCode, selectedTier)
      authSetCountry(selectedCountryCode)
    } catch { /* continue anyway */ }
    setSavingCountry(false)
    setStep(2)
  }

  const handleSaveScoring = async () => {
    setScoringSaving(true)
    try {
      if (scoringPreset === 'custom') {
        await updateScoringConfig(
          customWeights.technical / 100,
          customWeights.assessment / 100,
          customWeights.controls / 100,
          'custom',
        )
      } else {
        const p = SCORING_PRESETS[scoringPreset as keyof typeof SCORING_PRESETS] || SCORING_PRESETS.balanced
        await updateScoringConfig(p.technical, p.assessment, p.controls, scoringPreset)
      }
    } catch { /* continue anyway */ }
    setScoringSaving(false)
    setStep(3)
  }

  const adjustCustomWeight = (key: 'technical' | 'assessment' | 'controls', value: number) => {
    const others = (['technical', 'assessment', 'controls'] as const).filter(k => k !== key)
    const remaining = 100 - value
    const otherTotal = customWeights[others[0]] + customWeights[others[1]]
    if (otherTotal === 0) {
      setCustomWeights({ ...customWeights, [key]: value, [others[0]]: Math.round(remaining / 2), [others[1]]: remaining - Math.round(remaining / 2) })
    } else {
      const r0 = Math.round((customWeights[others[0]] / otherTotal) * remaining)
      const r1 = remaining - r0
      setCustomWeights({ ...customWeights, [key]: value, [others[0]]: r0, [others[1]]: r1 })
    }
  }

  // AWS Role — Step 1: Initiate
  const handleAwsInitiate = async () => {
    const accountId = localStorage.getItem('konforme_account_id') || ''
    if (!accountId) return
    setCloudSaving(true)
    setCloudError(null)
    try {
      const result = await initiateAwsRoleConnection(
        accountId,
        cloudForm.alias || 'Default',
        cloudForm.region || 'eu-west-1',
      )
      setAwsPendingCredId(result.credential_id)
      setAwsCfUrl(result.cf_url)
      setAwsRoleStep('pending')
      window.open(result.cf_url, '_blank')
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : t('getStarted.cloudValidationFailed'))
    } finally {
      setCloudSaving(false)
    }
  }

  // AWS Role — Step 2: Complete
  const handleAwsComplete = async () => {
    const accountId = localStorage.getItem('konforme_account_id') || ''
    if (!accountId || !awsPendingCredId) return
    setCloudSaving(true)
    setCloudError(null)
    try {
      await completeAwsRoleConnection(
        accountId,
        awsPendingCredId,
        cloudForm.roleArn || '',
        cloudForm.region || 'eu-west-1',
      )
      setCloudConnected(prev => [...prev, { provider: 'aws', alias: cloudForm.alias || 'Default' }])
      setCloudForm({})
      setCloudProvider(null)
      setAwsRoleStep('init')
      setAwsPendingCredId(null)
      setAwsCfUrl(null)
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : t('getStarted.cloudValidationFailed'))
    } finally {
      setCloudSaving(false)
    }
  }

  // Azure OAuth
  const handleAzureOAuth = async () => {
    const accountId = localStorage.getItem('konforme_account_id') || ''
    if (!accountId) return
    setCloudSaving(true)
    setCloudError(null)
    try {
      const result = await initiateAzureOAuth(
        accountId,
        cloudForm.azureAlias || 'Default',
        cloudForm.subscriptionId || '',
      )
      window.location.href = result.auth_url
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : t('getStarted.cloudValidationFailed'))
    } finally {
      setCloudSaving(false)
    }
  }

  const handleFinish = () => {
    localStorage.setItem('konforme_onboarded', 'true')
    navigate('/')
  }

  const handleSkip = () => {
    localStorage.setItem('konforme_onboarded', 'true')
    navigate('/')
  }

  const displayName = accountName || 'there'
  const stepLabels = [
    t('getStarted.stepCountry'),
    t('getStarted.stepEntity'),
    t('getStarted.stepScoring'),
    t('getStarted.stepCloud'),
    t('getStarted.stepReady'),
  ]

  const stepIcons = [Globe, Building2, Scale, Cloud, CheckCircle2]

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* Logo + Language Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-28" />
          <Logo size="lg" showText={false} />
          <select
            value={i18n.language}
            onChange={e => {
              const code = e.target.value
              i18n.changeLanguage(code)
              authSetLanguage(code)
              updateAccount({ language: code }).catch(() => {})
            }}
            className="w-28 px-2 py-1.5 rounded-lg bg-navy-900/60 border border-navy-700 text-xs text-white focus:border-cyan-500/50 focus:outline-none appearance-none cursor-pointer"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
            ))}
          </select>
        </div>

        {/* Step progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => {
            const Icon = stepIcons[i]
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isDone ? 'bg-cyan-500 text-navy-950' :
                    isActive ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400' :
                    'bg-navy-800 text-navy-500'
                  }`}>
                    {isDone ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    isActive || isDone ? 'text-cyan-400' : 'text-navy-600'
                  }`}>
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div className={`w-6 h-px ${isDone ? 'bg-cyan-400/40' : 'bg-navy-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1: Country Selection */}
        {step === 0 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold font-syne text-white">
                {t('getStarted.welcomeTitle', { name: displayName })}
              </h1>
              <h2 className="text-lg font-semibold text-white mt-3">{t('getStarted.countryTitle')}</h2>
              <p className="text-sm text-navy-400 mt-1 max-w-lg mx-auto">{t('getStarted.countrySubtitle')}</p>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
              <input
                type="text"
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                placeholder={t('getStarted.countrySearchPlaceholder')}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-navy-900/60 border border-navy-700 text-sm text-white placeholder-navy-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            {/* Country grid */}
            {countriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredCountries.map(c => {
                  const isSelected = c.code === selectedCountryCode
                  return (
                    <button
                      key={c.code}
                      onClick={() => handleCountrySelect(c.code)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-navy-800 bg-navy-900/40 hover:border-navy-600'
                      }`}
                    >
                      <span className="text-xl">{countryFlag(c.code)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        {c.nameLocal && c.nameLocal !== c.name && (
                          <p className="text-xs text-navy-400 truncate">{c.nameLocal}</p>
                        )}
                      </div>
                      {transpositionBadge(c.transpositionStatus, t)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Country detail preview */}
            {countryDetail && (
              <Card className="mt-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{countryFlag(countryDetail.code)}</span>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white">{countryDetail.name}</h3>
                    <div className="mt-2 space-y-1.5 text-xs">
                      {countryDetail.transpositionLawName && (
                        <div className="flex gap-2">
                          <span className="text-navy-400 shrink-0">{t('getStarted.countryLaw')}:</span>
                          <span className="text-navy-200">{countryDetail.transpositionLawName}</span>
                        </div>
                      )}
                      {countryDetail.competentAuthorityName && (
                        <div className="flex gap-2">
                          <span className="text-navy-400 shrink-0">{t('getStarted.countryAuthority')}:</span>
                          <span className="text-navy-200">{countryDetail.competentAuthorityName}</span>
                        </div>
                      )}
                      {countryDetail.dateEffective && (
                        <div className="flex gap-2">
                          <span className="text-navy-400 shrink-0">{t('getStarted.countryEffective')}:</span>
                          <span className="text-navy-200">{countryDetail.dateEffective}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between mt-6">
              <button onClick={handleSkip} className="text-sm text-navy-400 hover:text-white transition-colors">
                {t('getStarted.skipLink')}
              </button>
              <Button
                onClick={() => selectedCountryCode ? setStep(1) : undefined}
                disabled={!selectedCountryCode}
              >
                {t('common.next')} <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Entity Classification */}
        {step === 1 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold font-syne text-white">{t('getStarted.entityTitle')}</h2>
              <p className="text-sm text-navy-400 mt-1 max-w-lg mx-auto">{t('getStarted.entitySubtitle')}</p>
            </div>

            {tiersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-cyan-400 animate-spin" />
              </div>
            ) : tiers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-navy-400">No entity tiers available for this country yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tiers.map(tier => {
                  const isSelected = selectedTier === tier.tierKey
                  const penaltyMax = tier.penalties?.maximum as string | undefined
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.tierKey)}
                      className={`w-full text-left p-5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/20'
                          : 'border-navy-800 bg-navy-900/40 hover:border-navy-600 hover:bg-navy-900/60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-navy-800 border border-navy-700'
                        }`}>
                          <Shield size={20} className={isSelected ? 'text-cyan-400' : 'text-navy-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold font-syne text-white">
                              {tier.localName || formatTierKey(tier.tierKey)}
                            </h3>
                            {isSelected && <CheckCircle2 size={20} className="text-cyan-400 shrink-0" />}
                          </div>
                          {tier.description && (
                            <p className="text-xs text-navy-300 mt-1 leading-relaxed">{tier.description}</p>
                          )}

                          {/* Penalties */}
                          {penaltyMax && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <AlertCircle size={12} className="text-orange-400 shrink-0" />
                              <span className="text-[11px] text-orange-300">{penaltyMax}</span>
                            </div>
                          )}

                          {/* Sectors */}
                          {tier.sectors.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {(expandedTiers.has(tier.id) ? tier.sectors : tier.sectors.slice(0, 5)).map((s, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-navy-800/80 text-navy-300 border border-navy-700/50">
                                  {String(s)}
                                </span>
                              ))}
                              {tier.sectors.length > 5 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedTiers(prev => {
                                      const next = new Set(prev)
                                      if (next.has(tier.id)) next.delete(tier.id)
                                      else next.add(tier.id)
                                      return next
                                    })
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-navy-800/80 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
                                >
                                  {expandedTiers.has(tier.id) ? 'Show less' : `+${tier.sectors.length - 5} more`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Skip entity */}
            <button
              onClick={() => { setSelectedTier(null); handleSaveCountry() }}
              className="block text-sm text-navy-400 hover:text-white transition-colors mt-4"
            >
              {t('getStarted.entitySkip')}
            </button>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1 text-sm text-navy-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> {t('getStarted.back')}
              </button>
              <Button onClick={handleSaveCountry} loading={savingCountry}>
                {t('common.next')} <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Scoring Preferences */}
        {step === 2 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold font-syne text-white">{t('getStarted.scoringTitle')}</h2>
              <p className="text-sm text-navy-400 mt-1 max-w-lg mx-auto">{t('getStarted.scoringSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'balanced', color: 'cyan' },
                { key: 'technical-first', color: 'purple' },
                { key: 'governance-led', color: 'blue' },
                { key: 'controls-focused', color: 'emerald' },
              ] as const).map(({ key, color }) => {
                const p = SCORING_PRESETS[key]
                const isSelected = scoringPreset === key
                return (
                  <button
                    key={key}
                    onClick={() => setScoringPreset(key)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? `border-${color}-500 bg-${color}-500/10 ring-1 ring-${color}-500/20`
                        : 'border-navy-800 bg-navy-900/40 hover:border-navy-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-white">
                        {t(`settings.preset${key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}` as any)}
                      </h3>
                      {isSelected && <CheckCircle2 size={16} className={`text-${color}-400`} />}
                    </div>
                    <p className="text-xs text-navy-400 mb-3">
                      {t(`settings.preset${key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}Desc` as any)}
                    </p>
                    <div className="flex gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">{Math.round(p.technical * 100)}% Tech</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300">{Math.round(p.assessment * 100)}% Assess</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">{Math.round(p.controls * 100)}% Ctrl</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Custom option */}
            <button
              onClick={() => setScoringPreset('custom')}
              className={`w-full mt-3 p-4 rounded-xl border text-left transition-all ${
                scoringPreset === 'custom'
                  ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/20'
                  : 'border-navy-800 bg-navy-900/40 hover:border-navy-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white">{t('settings.presetCustom')}</h3>
                {scoringPreset === 'custom' && <CheckCircle2 size={16} className="text-orange-400" />}
              </div>
              <p className="text-xs text-navy-400">{t('settings.presetCustomDesc')}</p>
            </button>

            {/* Custom sliders */}
            {scoringPreset === 'custom' && (
              <Card className="mt-4">
                {(['technical', 'assessment', 'controls'] as const).map(key => {
                  const colors = { technical: 'purple', assessment: 'blue', controls: 'emerald' }
                  const color = colors[key]
                  return (
                    <div key={key} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-navy-300 capitalize">{t(`settings.${key}Weight`)}</label>
                        <span className={`text-sm font-bold text-${color}-400`}>{customWeights[key]}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={customWeights[key]}
                        onChange={e => adjustCustomWeight(key, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none bg-navy-700 accent-cyan-500"
                      />
                    </div>
                  )
                })}
                <p className="text-[10px] text-navy-500 mt-2">
                  Total: {customWeights.technical + customWeights.assessment + customWeights.controls}%
                </p>
              </Card>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-navy-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> {t('getStarted.back')}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-navy-400 hover:text-white transition-colors"
                >
                  {t('getStarted.scoringSkip')}
                </button>
                <Button onClick={handleSaveScoring} loading={scoringSaving}>
                  {t('common.next')} <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Cloud Provider */}
        {step === 3 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold font-syne text-white">{t('getStarted.cloudTitle')}</h2>
              <p className="text-sm text-navy-400 mt-1 max-w-lg mx-auto">{t('getStarted.cloudSubtitle')}</p>
            </div>

            {/* Connected providers */}
            {cloudConnected.length > 0 && (
              <div className="mb-4 space-y-2">
                {cloudConnected.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm text-white font-medium">{c.alias}</span>
                    <span className="text-xs text-emerald-400 uppercase">{c.provider}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Provider selection */}
            {!cloudProvider && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setCloudProvider('aws')}
                  className="p-4 rounded-xl border border-navy-800 bg-navy-900/40 hover:border-cyan-500/40 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Cloud size={20} className="text-orange-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{t('getStarted.cloudAws')}</h3>
                  </div>
                  <p className="text-xs text-navy-400">{t('getStarted.cloudAwsDesc')}</p>
                </button>
                <button
                  onClick={() => setCloudProvider('azure')}
                  className="p-4 rounded-xl border border-navy-800 bg-navy-900/40 hover:border-cyan-500/40 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Cloud size={20} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">{t('getStarted.cloudAzure')}</h3>
                  </div>
                  <p className="text-xs text-navy-400">{t('getStarted.cloudAzureDesc')}</p>
                </button>
              </div>
            )}

            {/* AWS — CloudFormation role flow */}
            {cloudProvider === 'aws' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-1">{t('getStarted.cloudAws')}</h3>
                <p className="text-xs text-navy-400 mb-4">{t('getStarted.cloudAwsRoleDesc')}</p>

                {awsRoleStep === 'init' && (
                  <div className="space-y-3">
                    <Input
                      label={t('getStarted.cloudAwsAlias')}
                      value={cloudForm.alias || ''}
                      onChange={e => setCloudForm(p => ({ ...p, alias: e.target.value }))}
                    />
                    <Input
                      label={t('getStarted.cloudAwsRegion')}
                      value={cloudForm.region || 'eu-west-1'}
                      onChange={e => setCloudForm(p => ({ ...p, region: e.target.value }))}
                    />
                  </div>
                )}

                {awsRoleStep === 'pending' && (
                  <>
                    <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
                      <p className="text-xs text-cyan-300 font-medium mb-1">{t('getStarted.cloudAwsStep2Title')}</p>
                      <ol className="text-xs text-navy-300 space-y-1 list-decimal list-inside">
                        <li>{t('getStarted.cloudAwsStep2Line1')}</li>
                        <li>{t('getStarted.cloudAwsStep2Line2')}</li>
                        <li>{t('getStarted.cloudAwsStep2Line3')}</li>
                      </ol>
                      {awsCfUrl && (
                        <a href={awsCfUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline">
                          {t('getStarted.cloudAwsOpenConsole')}
                        </a>
                      )}
                    </div>
                    <Input
                      label={t('getStarted.cloudAwsRoleArn')}
                      value={cloudForm.roleArn || ''}
                      onChange={e => setCloudForm(p => ({ ...p, roleArn: e.target.value }))}
                      placeholder="arn:aws:iam::123456789012:role/KonformeAuditRole"
                    />
                  </>
                )}

                {cloudError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{cloudError}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={() => { setCloudProvider(null); setCloudError(null); setAwsRoleStep('init'); setAwsPendingCredId(null); setAwsCfUrl(null) }}>
                    {t('common.cancel')}
                  </Button>
                  {awsRoleStep === 'init' && (
                    <Button size="sm" onClick={handleAwsInitiate} loading={cloudSaving}>
                      {t('getStarted.cloudAwsDeployStack')}
                    </Button>
                  )}
                  {awsRoleStep === 'pending' && (
                    <Button size="sm" onClick={handleAwsComplete} loading={cloudSaving}>
                      {t('getStarted.cloudAwsVerify')}
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Azure — OAuth flow */}
            {cloudProvider === 'azure' && (
              <Card>
                <h3 className="text-sm font-semibold text-white mb-1">{t('getStarted.cloudAzure')}</h3>
                <p className="text-xs text-navy-400 mb-4">{t('getStarted.cloudAzureOAuthDesc')}</p>
                <div className="space-y-3">
                  <Input
                    label={t('getStarted.cloudAzureAlias')}
                    value={cloudForm.azureAlias || ''}
                    onChange={e => setCloudForm(p => ({ ...p, azureAlias: e.target.value }))}
                  />
                  <Input
                    label={t('getStarted.cloudAzureSubscriptionId')}
                    value={cloudForm.subscriptionId || ''}
                    onChange={e => setCloudForm(p => ({ ...p, subscriptionId: e.target.value }))}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                {cloudError && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{cloudError}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={() => { setCloudProvider(null); setCloudError(null) }}>
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleAzureOAuth} loading={cloudSaving}>
                    {t('getStarted.cloudAzureConnectViaMicrosoft')}
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-navy-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> {t('getStarted.back')}
              </button>
              <div className="flex gap-2">
                {!cloudProvider && (
                  <button
                    onClick={() => setStep(4)}
                    className="text-sm text-navy-400 hover:text-white transition-colors"
                  >
                    {t('getStarted.cloudSkip')}
                  </button>
                )}
                {cloudConnected.length > 0 && !cloudProvider && (
                  <Button onClick={() => setStep(4)}>
                    {t('common.next')} <ChevronRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Ready */}
        {step === 4 && (
          <div className="animate-in fade-in duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold font-syne text-white">{t('getStarted.readyTitle')}</h1>
              <p className="text-sm text-navy-400 mt-2">{t('getStarted.readySubtitle')}</p>
            </div>

            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-cyan-400" />
                    <span className="text-sm text-navy-300">{t('getStarted.readyCountry')}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {selectedCountryCode ? `${countryFlag(selectedCountryCode)} ${countries.find(c => c.code === selectedCountryCode)?.name || selectedCountryCode}` : t('getStarted.readyNoCountry')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-cyan-400" />
                    <span className="text-sm text-navy-300">{t('getStarted.readyEntity')}</span>
                  </div>
                  <span className="text-sm font-medium text-white capitalize">
                    {selectedTier || t('getStarted.readyNoEntity')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                  <div className="flex items-center gap-3">
                    <Scale size={16} className="text-cyan-400" />
                    <span className="text-sm text-navy-300">{t('getStarted.readyScoring')}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {scoringPreset === 'custom'
                      ? t('getStarted.readyCustomScoring', { technical: customWeights.technical, assessment: customWeights.assessment, controls: customWeights.controls })
                      : t('getStarted.readyDefaultScoring')
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                  <div className="flex items-center gap-3">
                    <Cloud size={16} className="text-cyan-400" />
                    <span className="text-sm text-navy-300">{t('getStarted.readyCloud')}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {cloudConnected.length > 0
                      ? t('getStarted.readyCloudCount', { count: cloudConnected.length })
                      : t('getStarted.readyNoCloud')
                    }
                  </span>
                </div>

              </div>
            </Card>

            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-sm text-navy-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} /> {t('getStarted.back')}
              </button>
              <Button onClick={handleFinish} className="px-8">
                {t('getStarted.goToDashboard')} <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
