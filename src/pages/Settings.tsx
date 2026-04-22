import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Shield, User, Cloud, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Scale } from 'lucide-react'
import { Card, Button, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  updateAccount, getCloudCredentials, addAzureCredential,
  removeCloudCredential, validateCloudCredential,
  getStoredAuth, addAwsAccount, removeAwsAccount,
  getScoringConfig, updateScoringConfig,
  initiateAwsRoleConnection, completeAwsRoleConnection,
  initiateAzureOAuth,
  type CloudCredential, type AwsAccountInfo,
} from '../services/api'
import { useScore } from '../context/ScoreContext'
import CountrySelector from '../components/CountrySelector'
import AwsIamPolicy from '../components/AwsIamPolicy'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useCountryData } from '../hooks/useCountryData'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
        enabled ? 'bg-cyan-500' : 'bg-navy-700'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const { accountName, email, country, setAccountName, setEmail, setCountry } = useAuth()
  const { countries } = useCountryData()
  const { refreshScore } = useScore()

  const [name, setName] = useState(accountName || '')
  const [contactEmail, setContactEmail] = useState(email || '')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Cloud credentials state
  const [credentials, setCredentials] = useState<CloudCredential[]>([])
  const [awsAccounts, setAwsAccounts] = useState<AwsAccountInfo[]>([])
  const [credLoading, setCredLoading] = useState(true)
  const [showProviderPicker, setShowProviderPicker] = useState(false)
  const [addingProvider, setAddingProvider] = useState<'aws' | 'azure' | null>(null)
  // AWS role flow state
  const [awsRoleStep, setAwsRoleStep] = useState<'init' | 'pending'>('init')
  const [awsForm, setAwsForm] = useState<Record<string, string>>({})
  const [awsSaving, setAwsSaving] = useState(false)
  const [awsError, setAwsError] = useState<string | null>(null)
  const [awsPendingCredId, setAwsPendingCredId] = useState<string | null>(null)
  const [awsCfUrl, setAwsCfUrl] = useState<string | null>(null)
  // AWS legacy keys (fallback)
  const [awsLegacyMode, setAwsLegacyMode] = useState(false)
  // Azure form state
  const [azureForm, setAzureForm] = useState<Record<string, string>>({})
  const [azureSaving, setAzureSaving] = useState(false)
  const [azureError, setAzureError] = useState<string | null>(null)
  const [azureLegacyMode, setAzureLegacyMode] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<Record<string, boolean | null>>({})

  // Scoring config state
  const SCORING_PRESETS: Record<string, { technical: number; assessment: number; controls: number }> = {
    balanced:        { technical: 40, assessment: 35, controls: 25 },
    'technical-first': { technical: 60, assessment: 20, controls: 20 },
    'governance-led':  { technical: 20, assessment: 50, controls: 30 },
    'controls-focused': { technical: 20, assessment: 20, controls: 60 },
  }

  const [scoringPreset, setScoringPreset] = useState<string>('balanced')
  const [scoringWeights, setScoringWeights] = useState({ technical: 40, assessment: 35, controls: 25 })
  const [scoringSaving, setScoringSaving] = useState(false)
  const [scoringLoaded, setScoringLoaded] = useState(false)
  const [scoringMessage, setScoringMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [previewScore, setPreviewScore] = useState<{ score: number | null; grade: string | null } | null>(null)

  // Load scoring config
  useEffect(() => {
    getScoringConfig()
      .then(cfg => {
        const tw = Math.round(cfg.technicalWeight * 100)
        const aw = Math.round(cfg.assessmentWeight * 100)
        const cw = Math.round(cfg.controlsWeight * 100)
        setScoringWeights({ technical: tw, assessment: aw, controls: cw })
        setScoringPreset(cfg.preset || 'balanced')
        setScoringLoaded(true)
      })
      .catch(() => setScoringLoaded(true))
  }, [])

  const handleScoringPreset = (key: string) => {
    setScoringPreset(key)
    if (key !== 'custom') {
      setScoringWeights(SCORING_PRESETS[key] || SCORING_PRESETS.balanced)
    }
    setPreviewScore(null)
  }

  const adjustScoringWeight = (key: 'technical' | 'assessment' | 'controls', value: number) => {
    setScoringPreset('custom')
    const others = (['technical', 'assessment', 'controls'] as const).filter(k => k !== key)
    const remaining = 100 - value
    const otherTotal = scoringWeights[others[0]] + scoringWeights[others[1]]
    if (otherTotal === 0) {
      setScoringWeights({ ...scoringWeights, [key]: value, [others[0]]: Math.round(remaining / 2), [others[1]]: remaining - Math.round(remaining / 2) })
    } else {
      const r0 = Math.round((scoringWeights[others[0]] / otherTotal) * remaining)
      const r1 = remaining - r0
      setScoringWeights({ ...scoringWeights, [key]: value, [others[0]]: r0, [others[1]]: r1 })
    }
    setPreviewScore(null)
  }

  const handleSaveScoring = async () => {
    setScoringSaving(true)
    setScoringMessage(null)
    try {
      const result = await updateScoringConfig(
        scoringWeights.technical / 100,
        scoringWeights.assessment / 100,
        scoringWeights.controls / 100,
        scoringPreset,
      )
      setPreviewScore({ score: result.previewOverallScore, grade: result.previewGrade })
      setScoringMessage({ type: 'success', text: t('settings.scoringSaved') })
      refreshScore()
    } catch {
      setScoringMessage({ type: 'error', text: t('settings.scoringSaveError') })
    }
    setScoringSaving(false)
  }

  // Load cloud credentials
  useEffect(() => {
    const { accountId, awsAccounts: storedAws } = getStoredAuth()
    setAwsAccounts(storedAws || [])
    if (accountId) {
      getCloudCredentials(accountId)
        .then(data => setCredentials(data.credentials))
        .catch(() => {})
        .finally(() => setCredLoading(false))
    } else {
      setCredLoading(false)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const data = await updateAccount({ name, email: contactEmail })
      setAccountName(data.account_name)
      setEmail(data.email)
      setSaveMessage({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const handleCountryChange = async (code: string) => {
    setCountry(code)
    try {
      await updateAccount({ country: code })
    } catch { /* ignore */ }
  }

  // Detect Azure OAuth callback on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('azure_connected') === '1') {
      // Reload credentials to pick up the new one
      const { accountId } = getStoredAuth()
      if (accountId) {
        getCloudCredentials(accountId)
          .then(data => setCredentials(data.credentials))
          .catch(() => {})
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('azure_error')) {
      setAzureError(decodeURIComponent(params.get('azure_error') || 'Connection failed'))
      setAddingProvider('azure')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // AWS Role flow — Step 1: Initiate
  const handleAwsInitiate = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setAwsSaving(true)
    setAwsError(null)
    try {
      const result = await initiateAwsRoleConnection(
        accountId,
        awsForm.alias || 'AWS',
        awsForm.region || 'eu-west-1',
      )
      setAwsPendingCredId(result.credential_id)
      setAwsCfUrl(result.cf_url)
      setAwsRoleStep('pending')
      window.open(result.cf_url, '_blank')
    } catch (err) {
      setAwsError(err instanceof Error ? err.message : 'Failed to initiate AWS connection')
    } finally {
      setAwsSaving(false)
    }
  }

  // AWS Role flow — Step 2: Complete with Role ARN
  const handleAwsComplete = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId || !awsPendingCredId) return
    setAwsSaving(true)
    setAwsError(null)
    try {
      const cred = await completeAwsRoleConnection(
        accountId,
        awsPendingCredId,
        awsForm.roleArn || '',
        awsForm.region || 'eu-west-1',
      )
      setCredentials(prev => [...prev, cred])
      setAddingProvider(null)
      setShowProviderPicker(false)
      setAwsForm({})
      setAwsRoleStep('init')
      setAwsPendingCredId(null)
      setAwsCfUrl(null)
    } catch (err) {
      setAwsError(err instanceof Error ? err.message : 'Failed to verify AWS role')
    } finally {
      setAwsSaving(false)
    }
  }

  // AWS legacy keys (fallback)
  const handleAddAwsLegacy = async () => {
    setAwsSaving(true)
    setAwsError(null)
    try {
      const acct = await addAwsAccount(
        awsForm.alias || 'AWS',
        awsForm.accessKeyId || '',
        awsForm.secretAccessKey || '',
        awsForm.sessionToken || null,
        awsForm.region || 'eu-west-1'
      )
      setAwsAccounts(prev => [...prev, acct])
      setAddingProvider(null)
      setShowProviderPicker(false)
      setAwsForm({})
      setAwsLegacyMode(false)
    } catch (err) {
      setAwsError(err instanceof Error ? err.message : 'Failed to add AWS account')
    } finally {
      setAwsSaving(false)
    }
  }

  // Azure OAuth flow
  const handleAzureOAuth = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setAzureSaving(true)
    setAzureError(null)
    try {
      const result = await initiateAzureOAuth(
        accountId,
        azureForm.alias || 'Azure',
        azureForm.subscriptionId || '',
      )
      window.location.href = result.auth_url
    } catch (err) {
      setAzureError(err instanceof Error ? err.message : 'Failed to initiate Azure connection')
    } finally {
      setAzureSaving(false)
    }
  }

  // Azure legacy (fallback)
  const handleAddAzureLegacy = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setAzureSaving(true)
    setAzureError(null)
    try {
      const cred = await addAzureCredential(
        accountId,
        azureForm.alias || 'Azure',
        azureForm.tenantId || '',
        azureForm.clientId || '',
        azureForm.clientSecret || '',
        azureForm.subscriptionId || ''
      )
      setCredentials(prev => [...prev, cred])
      setAddingProvider(null)
      setShowProviderPicker(false)
      setAzureForm({})
      setAzureLegacyMode(false)
    } catch (err) {
      setAzureError(err instanceof Error ? err.message : t('settings.validationFailed'))
    } finally {
      setAzureSaving(false)
    }
  }

  const handleRemoveCredential = async (credId: string) => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    try {
      await removeCloudCredential(accountId, credId)
      setCredentials(prev => prev.filter(c => c.id !== credId))
    } catch { /* ignore */ }
  }

  const handleRemoveAws = async (awsId: string) => {
    try {
      await removeAwsAccount(awsId)
      setAwsAccounts(prev => prev.filter(a => a.id !== awsId))
    } catch { /* ignore */ }
  }

  const handleValidate = async (credId: string) => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setValidatingId(credId)
    setValidationResult(prev => ({ ...prev, [credId]: null }))
    try {
      const result = await validateCloudCredential(accountId, credId)
      setValidationResult(prev => ({ ...prev, [credId]: result.valid }))
    } catch {
      setValidationResult(prev => ({ ...prev, [credId]: false }))
    } finally {
      setValidatingId(null)
    }
  }

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    critical: true,
    weekly: true,
    threshold: true,
  })

  const toggleNotification = (key: string) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const notificationItems = [
    { key: 'critical', label: t('settings.criticalAlert'), desc: t('settings.criticalAlertDesc') },
    { key: 'weekly', label: t('settings.weeklyDigest'), desc: t('settings.weeklyDigestDesc') },
    { key: 'threshold', label: t('settings.scoreThreshold'), desc: t('settings.scoreThresholdDesc') },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-syne text-white">{t('settings.title')}</h1>
        <p className="text-sm text-navy-300 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <User size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">{t('settings.account')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label={t('settings.orgName')} value={name} onChange={e => setName(e.target.value)} />
          <Input label={t('settings.contactEmail')} value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
          <CountrySelector
            countries={countries}
            value={country}
            onChange={handleCountryChange}
            label={t('settings.country')}
          />
          <div>
            <label className="block text-xs font-medium text-[#CBD8E8] mb-1.5">{t('settings.language')}</label>
            <LanguageSwitcher />
          </div>
        </div>
        {saveMessage && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${saveMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {saveMessage.text}
          </div>
        )}
        <div className="mt-4">
          <Button size="sm" onClick={handleSave} loading={saving}>{t('common.save')}</Button>
        </div>
      </Card>

      {/* Cloud Providers */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Cloud size={16} className="text-cyan-400" />
            <div>
              <h2 className="text-base font-bold font-syne text-white">{t('settings.cloudProviders')}</h2>
              <p className="text-xs text-navy-400 mt-0.5">{t('settings.cloudProvidersDesc')}</p>
            </div>
          </div>
          {!addingProvider && !showProviderPicker && (
            <Button size="sm" variant="secondary" onClick={() => setShowProviderPicker(true)}>
              <Plus size={14} /> {t('settings.addProvider')}
            </Button>
          )}
        </div>

        {/* Existing credentials */}
        {credLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 size={20} className="text-cyan-400 animate-spin" />
          </div>
        ) : awsAccounts.length === 0 && credentials.length === 0 && !showProviderPicker && !addingProvider ? (
          <div className="text-center py-6">
            <Cloud size={32} className="text-navy-600 mx-auto mb-2" />
            <p className="text-sm text-navy-400">{t('settings.noProviders')}</p>
            <p className="text-xs text-navy-500 mt-1">{t('settings.noProvidersDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Legacy AWS accounts (key-based) */}
            {awsAccounts.map(acct => (
              <div key={acct.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 border border-orange-500/20">
                    <Cloud size={14} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{acct.alias}</p>
                    <p className="text-[10px] text-navy-400 uppercase">AWS · {acct.awsRegion}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAws(acct.id)}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {/* All cloud credentials (AWS role + Azure) */}
            {credentials.map(cred => {
              const isAws = cred.provider === 'aws'
              const colorClass = isAws ? 'orange' : 'blue'
              return (
                <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${colorClass}-500/10 border border-${colorClass}-500/20`}>
                      <Cloud size={14} className={`text-${colorClass}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{cred.alias}</p>
                      <p className="text-[10px] text-navy-400 uppercase">
                        {cred.provider.toUpperCase()}
                        {cred.connection_type === 'role' && ' · IAM Role'}
                        {cred.connection_type === 'oauth' && ' · OAuth'}
                        {isAws && cred.aws_region && ` · ${cred.aws_region}`}
                        {!isAws && cred.azure_subscription_id && ` · ${cred.azure_subscription_id}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {validationResult[cred.id] === true && (
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    )}
                    {validationResult[cred.id] === false && (
                      <AlertCircle size={14} className="text-red-400" />
                    )}
                    <button
                      onClick={() => handleValidate(cred.id)}
                      disabled={validatingId === cred.id}
                      className="text-xs text-navy-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {validatingId === cred.id ? <Loader2 size={12} className="animate-spin" /> : t('settings.validateProvider')}
                    </button>
                    <button
                      onClick={() => handleRemoveCredential(cred.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Provider picker */}
        {showProviderPicker && !addingProvider && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-3">{t('settings.selectProvider')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setAddingProvider('aws'); setShowProviderPicker(false) }}
                className="p-4 rounded-lg border border-navy-700 hover:border-orange-500/40 bg-navy-900/40 hover:bg-orange-500/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/10 border border-orange-500/20 mb-2">
                  <Cloud size={14} className="text-orange-400" />
                </div>
                <p className="text-sm font-medium text-white">AWS</p>
                <p className="text-[10px] text-navy-400 mt-0.5">Amazon Web Services</p>
              </button>
              <button
                onClick={() => { setAddingProvider('azure'); setShowProviderPicker(false) }}
                className="p-4 rounded-lg border border-navy-700 hover:border-blue-500/40 bg-navy-900/40 hover:bg-blue-500/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 mb-2">
                  <Cloud size={14} className="text-blue-400" />
                </div>
                <p className="text-sm font-medium text-white">Azure</p>
                <p className="text-[10px] text-navy-400 mt-0.5">Microsoft Azure</p>
              </button>
            </div>
            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => setShowProviderPicker(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Add AWS — CloudFormation role flow */}
        {addingProvider === 'aws' && !awsLegacyMode && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-1">{t('settings.awsConnectTitle')}</h3>
            <p className="text-xs text-navy-400 mb-4">{t('settings.awsConnectDesc')}</p>

            {awsRoleStep === 'init' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label={t('settings.awsAlias')}
                    value={awsForm.alias || ''}
                    onChange={e => setAwsForm(p => ({ ...p, alias: e.target.value }))}
                    placeholder="e.g. Production"
                  />
                  <Input
                    label={t('settings.awsRegion')}
                    value={awsForm.region || 'eu-west-1'}
                    onChange={e => setAwsForm(p => ({ ...p, region: e.target.value }))}
                    placeholder="eu-west-1"
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setAwsLegacyMode(true)}
                    className="text-[11px] text-navy-500 hover:text-navy-300 transition-colors"
                  >
                    {t('settings.useLegacyKeys')}
                  </button>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAwsError(null); setAwsRoleStep('init') }}>
                      {t('common.cancel')}
                    </Button>
                    <Button size="sm" onClick={handleAwsInitiate} loading={awsSaving}>
                      {t('settings.awsDeployStack')}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {awsRoleStep === 'pending' && (
              <>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <p className="text-xs text-cyan-300 font-medium mb-1">{t('settings.awsStep2Title')}</p>
                  <ol className="text-xs text-navy-300 space-y-1 list-decimal list-inside">
                    <li>{t('settings.awsStep2Line1')}</li>
                    <li>{t('settings.awsStep2Line2')}</li>
                    <li>{t('settings.awsStep2Line3')}</li>
                  </ol>
                  {awsCfUrl && (
                    <a href={awsCfUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline">
                      {t('settings.awsOpenCfConsole')}
                    </a>
                  )}
                </div>
                <Input
                  label={t('settings.awsRoleArn')}
                  value={awsForm.roleArn || ''}
                  onChange={e => setAwsForm(p => ({ ...p, roleArn: e.target.value }))}
                  placeholder="arn:aws:iam::123456789012:role/KonformeAuditRole"
                />
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAwsError(null); setAwsRoleStep('init'); setAwsPendingCredId(null); setAwsCfUrl(null) }}>
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleAwsComplete} loading={awsSaving}>
                    {t('settings.awsVerifyConnect')}
                  </Button>
                </div>
              </>
            )}

            {awsError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{awsError}</p>
              </div>
            )}
          </div>
        )}

        {/* Add AWS — Legacy keys fallback */}
        {addingProvider === 'aws' && awsLegacyMode && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-3">{t('settings.awsLegacyTitle')}</h3>
            <AwsIamPolicy />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('settings.awsAlias')} value={awsForm.alias || ''} onChange={e => setAwsForm(p => ({ ...p, alias: e.target.value }))} placeholder="e.g. Production" />
              <Input label={t('settings.awsRegion')} value={awsForm.region || 'eu-west-1'} onChange={e => setAwsForm(p => ({ ...p, region: e.target.value }))} />
              <Input label="Access Key ID" value={awsForm.accessKeyId || ''} onChange={e => setAwsForm(p => ({ ...p, accessKeyId: e.target.value }))} />
              <Input label="Secret Access Key" type="password" value={awsForm.secretAccessKey || ''} onChange={e => setAwsForm(p => ({ ...p, secretAccessKey: e.target.value }))} />
              <Input label="Session Token (optional)" value={awsForm.sessionToken || ''} onChange={e => setAwsForm(p => ({ ...p, sessionToken: e.target.value }))} />
            </div>
            {awsError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{awsError}</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setAwsLegacyMode(false)} className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                {t('settings.useSecureConnection')}
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAwsError(null); setAwsLegacyMode(false) }}>{t('common.cancel')}</Button>
                <Button size="sm" onClick={handleAddAwsLegacy} loading={awsSaving}>{t('settings.addProvider')}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Azure — OAuth flow */}
        {addingProvider === 'azure' && !azureLegacyMode && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-1">{t('settings.azureConnectTitle')}</h3>
            <p className="text-xs text-navy-400 mb-4">{t('settings.azureConnectDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={t('settings.azureAlias')}
                value={azureForm.alias || ''}
                onChange={e => setAzureForm(p => ({ ...p, alias: e.target.value }))}
                placeholder="e.g. Production"
              />
              <Input
                label={t('settings.azureSubscriptionId')}
                value={azureForm.subscriptionId || ''}
                onChange={e => setAzureForm(p => ({ ...p, subscriptionId: e.target.value }))}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            {azureError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{azureError}</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setAzureLegacyMode(true)}
                className="text-[11px] text-navy-500 hover:text-navy-300 transition-colors"
              >
                {t('settings.useLegacyCredentials')}
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAzureError(null) }}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={handleAzureOAuth} loading={azureSaving}>
                  {t('settings.azureConnectViaMicrosoft')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Azure — Legacy service principal fallback */}
        {addingProvider === 'azure' && azureLegacyMode && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-3">{t('settings.azureLegacyTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label={t('settings.azureAlias')} value={azureForm.alias || ''} onChange={e => setAzureForm(p => ({ ...p, alias: e.target.value }))} />
              <Input label="Tenant ID" value={azureForm.tenantId || ''} onChange={e => setAzureForm(p => ({ ...p, tenantId: e.target.value }))} />
              <Input label="Client ID (App ID)" value={azureForm.clientId || ''} onChange={e => setAzureForm(p => ({ ...p, clientId: e.target.value }))} />
              <Input label="Client Secret" type="password" value={azureForm.clientSecret || ''} onChange={e => setAzureForm(p => ({ ...p, clientSecret: e.target.value }))} />
              <Input label={t('settings.azureSubscriptionId')} value={azureForm.subscriptionId || ''} onChange={e => setAzureForm(p => ({ ...p, subscriptionId: e.target.value }))} />
            </div>
            {azureError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{azureError}</p>
              </div>
            )}
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setAzureLegacyMode(false)} className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors">
                {t('settings.useSecureConnection')}
              </button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAzureError(null); setAzureLegacyMode(false) }}>{t('common.cancel')}</Button>
                <Button size="sm" onClick={handleAddAzureLegacy} loading={azureSaving}>{t('settings.addProvider')}</Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Bell size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">{t('settings.notifications')}</h2>
        </div>
        <div className="space-y-3">
          {notificationItems.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-navy-400 mt-0.5">{item.desc}</p>
              </div>
              <Toggle
                enabled={notifications[item.key]}
                onToggle={() => toggleNotification(item.key)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">{t('settings.compliance')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t('settings.primaryFramework')}
            options={[
              { value: 'nis2', label: 'NIS2 (EU 2022/2555)' },
              { value: 'iso27001', label: 'ISO 27001 — Coming Soon', disabled: true },
              { value: 'soc2', label: 'SOC 2 Type II — Coming Soon', disabled: true },
            ]}
          />
          <Select
            label={t('settings.scanSchedule')}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'manual', label: 'Manual only' },
            ]}
          />
        </div>
      </Card>

      {/* Scoring Weights — editable 3-pillar model */}
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <Scale size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">{t('settings.scoringConfig')}</h2>
        </div>
        <p className="text-xs text-navy-400 mb-4">{t('settings.scoringConfigDesc')}</p>

        {/* Preset buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {([
            { key: 'balanced', color: 'cyan' },
            { key: 'technical-first', color: 'purple' },
            { key: 'governance-led', color: 'blue' },
            { key: 'controls-focused', color: 'emerald' },
          ] as const).map(({ key, color }) => {
            const isActive = scoringPreset === key
            return (
              <button
                key={key}
                onClick={() => handleScoringPreset(key)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isActive
                    ? `border-${color}-500 bg-${color}-500/10`
                    : 'border-navy-800 bg-navy-900/40 hover:border-navy-600'
                }`}
              >
                <p className="text-xs font-semibold text-white mb-0.5">
                  {t(`settings.preset${key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}` as any)}
                </p>
                <p className="text-[10px] text-navy-400 leading-tight">
                  {t(`settings.preset${key.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')}Desc` as any)}
                </p>
              </button>
            )
          })}
        </div>

        {/* Custom option */}
        <button
          onClick={() => handleScoringPreset('custom')}
          className={`w-full p-2.5 rounded-lg border text-left transition-all mb-4 ${
            scoringPreset === 'custom'
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-navy-800 bg-navy-900/40 hover:border-navy-600'
          }`}
        >
          <p className="text-xs font-semibold text-white">{t('settings.presetCustom')}</p>
          <p className="text-[10px] text-navy-400">{t('settings.presetCustomDesc')}</p>
        </button>

        {/* Weight sliders */}
        <div className="space-y-3 mb-4">
          {(['technical', 'assessment', 'controls'] as const).map(key => {
            const colors = { technical: 'purple', assessment: 'blue', controls: 'emerald' }
            const color = colors[key]
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-navy-300">{t(`settings.${key}Weight`)}</label>
                  <span className={`text-sm font-bold text-${color}-400`}>{scoringWeights[key]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={scoringWeights[key]}
                  onChange={e => adjustScoringWeight(key, parseInt(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-navy-700 accent-cyan-500"
                />
              </div>
            )
          })}
        </div>

        {/* Preview + Save */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-navy-400">
            {previewScore && previewScore.score != null && (
              <span>{t('settings.previewScore')}: <strong className="text-white">{previewScore.score}%</strong> ({previewScore.grade})</span>
            )}
          </div>
          <Button size="sm" onClick={handleSaveScoring} loading={scoringSaving}>
            {t('settings.saveScoringWeights')}
          </Button>
        </div>

        {scoringMessage && (
          <div className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-2 ${
            scoringMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {scoringMessage.type === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {scoringMessage.text}
          </div>
        )}

        <p className="text-[11px] text-navy-500 mt-3">{t('settings.scoringFixedNote')}</p>
      </Card>

      {/* Version */}
      <div className="text-center text-xs text-navy-600 py-4">
        {t('settings.version')}
      </div>
    </div>
  )
}
