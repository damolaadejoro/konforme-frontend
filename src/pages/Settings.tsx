import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Shield, User, Cloud, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, Button, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  updateAccount, getCloudCredentials, addAzureCredential,
  removeCloudCredential, validateCloudCredential,
  getStoredAuth, addAwsAccount, removeAwsAccount,
  type CloudCredential, type AwsAccountInfo,
} from '../services/api'
import CountrySelector from '../components/CountrySelector'
import AwsIamPolicy from '../components/AwsIamPolicy'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useCountryData } from '../hooks/useCountryData'
import ScoringConfig from '../components/ScoringConfig'

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
  const [awsForm, setAwsForm] = useState<Record<string, string>>({})
  const [awsSaving, setAwsSaving] = useState(false)
  const [awsError, setAwsError] = useState<string | null>(null)
  const [azureForm, setAzureForm] = useState<Record<string, string>>({})
  const [azureSaving, setAzureSaving] = useState(false)
  const [azureError, setAzureError] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<Record<string, boolean | null>>({})

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

  const handleAddAws = async () => {
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
    } catch (err) {
      setAwsError(err instanceof Error ? err.message : 'Failed to add AWS account')
    } finally {
      setAwsSaving(false)
    }
  }

  const handleAddAzure = async () => {
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
            {/* AWS accounts */}
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
            {/* Azure credentials */}
            {credentials.map(cred => (
              <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
                    <Cloud size={14} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{cred.alias}</p>
                    <p className="text-[10px] text-navy-400 uppercase">AZURE
                      {cred.azure_subscription_id && ` · ${cred.azure_subscription_id}`}
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
            ))}
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

        {/* Add AWS form */}
        {addingProvider === 'aws' && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-3">Add AWS Account</h3>
            <AwsIamPolicy />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Alias"
                value={awsForm.alias || ''}
                onChange={e => setAwsForm(p => ({ ...p, alias: e.target.value }))}
                placeholder="e.g. Production"
              />
              <Input
                label="Region"
                value={awsForm.region || 'eu-west-1'}
                onChange={e => setAwsForm(p => ({ ...p, region: e.target.value }))}
                placeholder="eu-west-1"
              />
              <Input
                label="Access Key ID"
                value={awsForm.accessKeyId || ''}
                onChange={e => setAwsForm(p => ({ ...p, accessKeyId: e.target.value }))}
              />
              <Input
                label="Secret Access Key"
                type="password"
                value={awsForm.secretAccessKey || ''}
                onChange={e => setAwsForm(p => ({ ...p, secretAccessKey: e.target.value }))}
              />
              <Input
                label="Session Token (optional)"
                value={awsForm.sessionToken || ''}
                onChange={e => setAwsForm(p => ({ ...p, sessionToken: e.target.value }))}
              />
            </div>
            {awsError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{awsError}</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAwsError(null) }}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleAddAws} loading={awsSaving}>
                {t('settings.addProvider')}
              </Button>
            </div>
          </div>
        )}

        {/* Add Azure form */}
        {addingProvider === 'azure' && (
          <div className="mt-4 p-4 rounded-lg bg-navy-900/60 border border-navy-700">
            <h3 className="text-sm font-semibold text-white mb-3">Add Azure Credential</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Alias"
                value={azureForm.alias || ''}
                onChange={e => setAzureForm(p => ({ ...p, alias: e.target.value }))}
              />
              <Input
                label="Tenant ID"
                value={azureForm.tenantId || ''}
                onChange={e => setAzureForm(p => ({ ...p, tenantId: e.target.value }))}
              />
              <Input
                label="Client ID (App ID)"
                value={azureForm.clientId || ''}
                onChange={e => setAzureForm(p => ({ ...p, clientId: e.target.value }))}
              />
              <Input
                label="Client Secret"
                type="password"
                value={azureForm.clientSecret || ''}
                onChange={e => setAzureForm(p => ({ ...p, clientSecret: e.target.value }))}
              />
              <Input
                label="Subscription ID"
                value={azureForm.subscriptionId || ''}
                onChange={e => setAzureForm(p => ({ ...p, subscriptionId: e.target.value }))}
              />
            </div>
            {azureError && (
              <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{azureError}</p>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="sm" onClick={() => { setAddingProvider(null); setAzureError(null) }}>
                {t('common.cancel')}
              </Button>
              <Button size="sm" onClick={handleAddAzure} loading={azureSaving}>
                {t('settings.addProvider')}
              </Button>
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

      {/* Scoring Weights */}
      <ScoringConfig />

      {/* Version */}
      <div className="text-center text-xs text-navy-600 py-4">
        {t('settings.version')}
      </div>
    </div>
  )
}
