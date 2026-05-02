import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Radar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  AlertTriangle,
  Info,
  Play,
  RotateCcw,
  Link,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Cloud,
} from 'lucide-react'
import { useScan } from '../hooks/useScan'
import { useAuth } from '../context/AuthContext'
import {
  getCloudCredentials,
  getStoredAuth,
  initiateAwsRoleConnection,
  completeAwsRoleConnection,
  initiateAzureOAuth,
  type CloudCredential,
} from '../services/api'
import { Card, Input, Select, SeverityBadge, ProgressBar, InfoTooltip, Tooltip as AppTooltip } from '../components/ui'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'

type Provider = 'aws' | 'azure'

const IAM_POLICY_JSON = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KonformeReadOnlyScan",
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "iam:GetAccountPasswordPolicy",
        "iam:ListUsers",
        "iam:ListMFADevices",
        "iam:ListAccessKeys",
        "iam:GetAccessKeyLastUsed",
        "iam:ListAttachedUserPolicies",
        "iam:ListUserPolicies",
        "s3:ListAllMyBuckets",
        "s3:GetBucketEncryption",
        "s3:GetBucketPublicAccessBlock",
        "s3:GetBucketVersioning",
        "s3:GetBucketLogging",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeFlowLogs",
        "ec2:DescribeVpcs",
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus",
        "guardduty:ListDetectors",
        "securityhub:DescribeHub",
        "kms:ListKeys",
        "kms:DescribeKey",
        "kms:GetKeyRotationStatus",
        "rds:DescribeDBInstances",
        "backup:ListBackupVaults",
        "acm:ListCertificates",
        "acm:DescribeCertificate",
        "elasticloadbalancing:DescribeLoadBalancers",
        "wafv2:ListWebACLs",
        "sns:ListTopics",
        "cloudwatch:DescribeAlarms",
        "ecr:DescribeRepositories",
        "ecr:GetRepositoryPolicy",
        "inspector2:BatchGetAccountStatus",
        "config:DescribeConfigurationRecorders"
      ],
      "Resource": "*"
    }
  ]
}`

const REGIONS = [
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'eu-north-1', 'us-east-1', 'us-east-2', 'us-west-2', 'ap-southeast-1',
]

const AWS_SCAN_DOMAINS = [
  { article: 'Art 21(2)(i)', labelKey: 'scan.iamAccessControl', checks: 5, color: 'text-cyan-600' },
  { article: 'Art 21(2)(a)', labelKey: 'scan.monitoringLogging', checks: 3, color: 'text-purple-400' },
  { article: 'Art 21(2)(h)', labelKey: 'scan.encryption', checks: 4, color: 'text-blue-400' },
  { article: 'Art 21(2)(b/e)', labelKey: 'scan.businessContinuity', checks: 3, color: 'text-emerald-600' },
]

const AZURE_SCAN_DOMAINS = [
  { article: 'Art 21(2)(i)', labelKey: 'scan.azureAccessControl', checks: 5, color: 'text-cyan-600' },
  { article: 'Art 21(2)(b/e)', labelKey: 'scan.azureBusinessContinuity', checks: 4, color: 'text-emerald-600' },
  { article: 'Art 21(2)(d)', labelKey: 'scan.azureDataProtection', checks: 4, color: 'text-amber-600' },
  { article: 'Art 21(2)(h)', labelKey: 'scan.azureEncryption', checks: 4, color: 'text-blue-400' },
  { article: 'Art 21(2)(e)', labelKey: 'scan.azureNetwork', checks: 4, color: 'text-orange-400' },
  { article: 'Art 21(2)(a)', labelKey: 'scan.azureLogging', checks: 4, color: 'text-purple-400' },
]

function ProviderTabs({ active, onChange }: { active: Provider; onChange: (p: Provider) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border w-fit">
      {([
        { id: 'aws' as Provider, label: t('scan.providerAws') },
        { id: 'azure' as Provider, label: t('scan.providerAzure') },
      ]).map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            active === tab.id
              ? 'bg-primary/50/15 text-cyan-600 border border-cyan-500/30'
              : 'text-muted-foreground hover:text-foreground border border-transparent'
          }`}
        >
          <Cloud size={14} />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function ScanTerminal({ checks, currentIndex, progress, status, scanRegion, provider, subscriptionId }: {
  checks: ReturnType<typeof useScan>['checks']
  currentIndex: number
  progress: number
  status: string
  scanRegion: string
  provider: Provider
  subscriptionId?: string
}) {
  const { t } = useTranslation()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [checks])

  const started = checks.filter(c => c.status !== 'pending')

  const terminalCommand = provider === 'azure'
    ? `$ konforme scan --provider azure --subscription ${subscriptionId || '<id>'}`
    : `$ konforme scan --framework nis2 --region ${scanRegion}`

  const initMsg = provider === 'azure' ? t('scan.initAzureSession') : t('scan.initSession')
  const rulesetMsg = provider === 'azure' ? t('scan.loadingAzureRuleset') : t('scan.loadingRuleset')

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-navy-900 border-b border-navy-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="ml-2 text-xs text-navy-400 font-mono">{t('scan.terminalTitle')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-cyan-400" />
          <span className="text-xs text-cyan-400 font-mono">
            {status === 'scanning' ? t('scan.runningCheck', { current: currentIndex + 1, total: checks.length }) :
             status === 'complete' ? t('scan.scanComplete', { total: checks.length }) : t('scan.ready')}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {status === 'scanning' && (
        <div className="px-4 py-2 bg-navy-950">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-navy-400 font-mono">{t('scan.progress')}</span>
            <span className="text-xs text-cyan-400 font-mono font-bold">{progress}%</span>
          </div>
          <ProgressBar value={progress} animated height="h-1" color="bg-primary/50" />
        </div>
      )}

      {/* Terminal body */}
      <div className="h-96 overflow-y-auto bg-navy-950 p-4 font-mono text-xs space-y-1.5">
        {/* Boot messages */}
        <div className="text-navy-400 mb-3">
          <p className="text-cyan-500 font-bold">{terminalCommand}</p>
          <p className="mt-1 text-navy-500">{initMsg}</p>
          <p className="text-navy-500">{rulesetMsg}</p>
          <p className="text-navy-500">{t('scan.startingScan')}</p>
          <p className="text-navy-500 mb-3">─────────────────────────────────────────</p>
        </div>

        {started.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-3"
            style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
          >
            <div className="mt-0.5 flex-shrink-0">
              {check.status === 'scanning' && (
                <span className="inline-block w-4 h-4">
                  <svg className="animate-spin" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="#00C2D4" strokeWidth="2" strokeDasharray="18" strokeDashoffset="6" />
                  </svg>
                </span>
              )}
              {check.status === 'pass' && <CheckCircle size={14} className="text-emerald-400" />}
              {check.status === 'info' && <Info size={14} className="text-sky-400" />}
              {check.status === 'warn' && <AlertTriangle size={14} className="text-amber-400" />}
              {check.status === 'fail' && (
                <XCircle size={14} className={
                  check.severity === 'critical' ? 'text-red-400' :
                  check.severity === 'high' ? 'text-orange-400' :
                  check.severity === 'medium' ? 'text-yellow-400' :
                  'text-blue-400'
                } />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className={
                  check.status === 'scanning' ? 'text-cyan-300 animate-pulse' :
                  check.status === 'pass' ? 'text-emerald-300' :
                  check.status === 'info' ? 'text-sky-300' :
                  check.status === 'warn' ? 'text-amber-300' :
                  check.status === 'fail' ? (
                    check.severity === 'critical' ? 'text-red-300' :
                    check.severity === 'high' ? 'text-orange-300' :
                    check.severity === 'medium' ? 'text-yellow-300' : 'text-blue-300'
                  ) : 'text-navy-400'
                }>
                  {check.checkName}
                </span>
                <span className="text-navy-600">·</span>
                <span className="text-navy-500 text-xs">{check.resource}</span>
              </div>
              {check.status !== 'scanning' && check.status !== 'pending' && (
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-xs ${
                    check.status === 'pass' ? 'text-emerald-500' :
                    check.status === 'info' ? 'text-sky-400' :
                    check.status === 'warn' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {check.status === 'pass' ? '[PASS]' : check.status === 'info' ? '[NOTE]' : check.status === 'warn' ? '[WARN]' : '[FAIL]'}
                  </span>
                  {check.severity && check.status === 'fail' && (
                    <span className={`text-xs ${
                      check.severity === 'critical' ? 'text-red-400' :
                      check.severity === 'high' ? 'text-orange-400' :
                      check.severity === 'medium' ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      severity:{check.severity}
                    </span>
                  )}
                  {check.duration && <span className="text-navy-600">{check.duration}ms</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {status === 'scanning' && (
          <div className="text-cyan-400">
            <span className="cursor-blink">█</span>
          </div>
        )}

        {status === 'complete' && (
          <div className="mt-4 pt-4 border-t border-navy-800">
            <p className="text-navy-500">─────────────────────────────────────────</p>
            <p className="text-white font-bold mt-2">{t('scan.scanCompleteLabel')}</p>
            <p className="text-navy-400">
              {t('scan.totalLabel')} {checks.length} checks ·{' '}
              <span className="text-emerald-400">{checks.filter(c => c.status === 'pass').length} {t('scan.passedLabel')}</span> ·{' '}
              <span className="text-red-400">{checks.filter(c => c.status === 'fail').length} {t('scan.failedLabel')}</span>
              {checks.filter(c => c.status === 'info').length > 0 && (
                <> · <span className="text-sky-400">{checks.filter(c => c.status === 'info').length} {t('scan.notApplicableLabel')}</span></>
              )}
              {checks.filter(c => c.status === 'warn').length > 0 && (
                <> · <span className="text-amber-400">{checks.filter(c => c.status === 'warn').length} {t('scan.warningsLabel')}</span></>
              )}
            </p>
            <p className="text-cyan-500 mt-2">$ _<span className="cursor-blink">█</span></p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function ScanComplete({ onReset, scanResult, provider }: { onReset: () => void; scanResult: ReturnType<typeof useScan>['scanResult']; provider: Provider }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const passed = scanResult?.passed ?? 0
  const failed = scanResult?.failed ?? 0
  const critical = scanResult?.criticalCount ?? 0
  const high = scanResult?.highCount ?? 0
  const medium = scanResult?.mediumCount ?? 0
  const low = scanResult?.lowCount ?? 0
  const score = scanResult?.overallScore ?? 0
  const total = scanResult?.totalChecks ?? 0

  const isCompliant = score >= 70
  const scoreClasses = isCompliant
    ? { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', label: 'text-emerald-600' }
    : score >= 50
    ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', label: 'text-amber-600' }
    : { bg: 'bg-red-50 border-red-200', text: 'text-red-600', label: 'text-red-600' }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className={`p-5 rounded-lg ${scoreClasses.bg}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isCompliant
                ? <CheckCircle size={18} className={scoreClasses.text} />
                : <AlertTriangle size={18} className={scoreClasses.text} />
              }
              <h3 className={`font-semibold ${scoreClasses.text}`}>
                {isCompliant ? t('scan.scanCompleteCompliant') : t('scan.scanCompleteAction')}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                provider === 'azure' ? 'bg-blue-500/15 text-blue-400' : 'bg-orange-500/15 text-orange-400'
              }`}>
                {provider.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('scan.awsScoreDesc', { score, failed, total })}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${scoreClasses.text}`}>{score}%</div>
            <div className={`text-xs font-semibold ${scoreClasses.label}`}>{isCompliant ? t('common.compliant') : t('common.nonCompliant')}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: t('common.critical'), value: critical, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: t('common.high'), value: high, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: t('common.medium'), value: medium, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: t('common.low'), value: low, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: t('common.passed'), value: passed, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(item => (
          <div key={item.label} className={`rounded-lg p-3 border ${item.bg} text-center`}>
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate('/')} variant="secondary" size="lg" className="flex-1">
          <Shield size={16} />
          {t('common.goToDashboard')}
        </Button>
        <Button onClick={onReset} variant="ghost" size="lg">
          <RotateCcw size={16} />
          {t('scan.newScan')}
        </Button>
      </div>
    </div>
  )
}

function AwsIdleContent({
  awsAccounts,
  credentials,
  selectedAwsAccountId,
  selectedCredId,
  selectAwsAccount,
  selectCredential,
  showAddForm,
  setShowAddForm,
  handleRunScan,
  handleRunProviderScan,
  handleDemo,
  resuming,
}: {
  awsAccounts: any[]
  credentials: CloudCredential[]
  selectedAwsAccountId: string | null
  selectedCredId: string | null
  selectAwsAccount: (id: string) => void
  selectCredential: (id: string) => void
  showAddForm: boolean
  setShowAddForm: (v: boolean) => void
  handleRunScan: () => void
  handleRunProviderScan: (credId: string) => void
  handleDemo: () => void
  resuming: boolean
}) {
  const { t } = useTranslation()
  const awsCredentials = credentials.filter(c => c.provider === 'aws')
  const hasAnyAccount = awsAccounts.length > 0 || awsCredentials.length > 0

  // Role connection state
  const [roleStep, setRoleStep] = useState<'init' | 'pending'>('init')
  const [roleForm, setRoleForm] = useState({ alias: '', region: 'eu-west-1', roleArn: '' })
  const [pendingCredId, setPendingCredId] = useState<string | null>(null)
  const [cfUrl, setCfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInitiate = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setSaving(true)
    setError(null)
    try {
      const result = await initiateAwsRoleConnection(accountId, roleForm.alias || 'AWS', roleForm.region)
      setPendingCredId(result.credential_id)
      setCfUrl(result.cf_url)
      setRoleStep('pending')
      window.open(result.cf_url, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId || !pendingCredId) return
    setSaving(true)
    setError(null)
    try {
      const cred = await completeAwsRoleConnection(accountId, pendingCredId, roleForm.roleArn, roleForm.region)
      selectCredential(cred.id)
      setShowAddForm(false)
      setRoleStep('init')
      setRoleForm({ alias: '', region: 'eu-west-1', roleArn: '' })
      setPendingCredId(null)
      setCfUrl(null)
      // Reload page to refresh credential list
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify role')
    } finally {
      setSaving(false)
    }
  }

  const canScan = selectedAwsAccountId || selectedCredId

  return (
    <div className="space-y-5">
      {/* Account/credential selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {!hasAnyAccount ? t('scan.addFirstAccount') : t('scan.awsAccounts')}
          </span>
          {hasAnyAccount && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="text-cyan-600 hover:text-primary/70">
              {showAddForm ? t('common.cancel') : t('scan.addAccount')}
            </Button>
          )}
        </div>
        {/* Legacy key-based accounts */}
        {awsAccounts.map((acc: any) => (
          <div
            key={acc.id}
            onClick={() => selectAwsAccount(acc.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              acc.id === selectedAwsAccountId
                ? 'bg-primary/50/8 border-cyan-500/30'
                : 'bg-muted border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{acc.alias}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{acc.awsAccountId} · {acc.awsRegion}</p>
              </div>
              {acc.id === selectedAwsAccountId && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
            </div>
          </div>
        ))}
        {/* Role-based credentials */}
        {awsCredentials.map(cred => (
          <div
            key={cred.id}
            onClick={() => selectCredential(cred.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              cred.id === selectedCredId
                ? 'bg-primary/50/8 border-cyan-500/30'
                : 'bg-muted border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{cred.alias}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {cred.aws_account_id || 'AWS'} · {cred.aws_region || 'eu-west-1'}
                  {cred.connection_type === 'role' && <span className="text-cyan-600 ml-1">· IAM Role</span>}
                </p>
              </div>
              {cred.id === selectedCredId && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
            </div>
          </div>
        ))}
      </div>

      {/* Add AWS — CloudFormation role flow */}
      {(showAddForm || !hasAnyAccount) && (
        <div className="space-y-3 p-4 rounded-lg bg-muted border border-border">
          <h3 className="text-sm font-semibold text-foreground">{t('settings.awsConnectTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('settings.awsConnectDesc')}</p>

          {roleStep === 'init' && (
            <>
              <Input label={t('scan.aliasLabel')} placeholder={t('scan.aliasPlaceholder')} value={roleForm.alias} onChange={e => setRoleForm(p => ({ ...p, alias: e.target.value }))} />
              <Select label={t('scan.awsRegionLabel')} value={roleForm.region} onChange={e => setRoleForm(p => ({ ...p, region: e.target.value }))} options={REGIONS.map(r => ({ value: r, label: r }))} />
              <Button size="sm" onClick={handleInitiate} loading={saving} className="w-full">{t('settings.awsDeployStack')}</Button>
            </>
          )}

          {roleStep === 'pending' && (
            <>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                <p className="text-xs text-primary font-medium mb-1">{t('settings.awsStep2Title')}</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>{t('settings.awsStep2Line1')}</li>
                  <li>{t('settings.awsStep2Line2')}</li>
                  <li>{t('settings.awsStep2Line3')}</li>
                </ol>
                {cfUrl && (
                  <a href={cfUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-xs text-cyan-600 hover:text-primary/70 underline">
                    {t('settings.awsOpenCfConsole')}
                  </a>
                )}
              </div>
              <Input label={t('settings.awsRoleArn')} value={roleForm.roleArn} onChange={e => setRoleForm(p => ({ ...p, roleArn: e.target.value }))} placeholder="arn:aws:iam::123456789012:role/KonformeAuditRole" />
              <Button size="sm" onClick={handleComplete} loading={saving} className="w-full">{t('settings.awsVerifyConnect')}</Button>
            </>
          )}

          {error && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <AppTooltip content={t('scan.runScanTooltip')}>
          <Button
            onClick={() => {
              if (selectedCredId) handleRunProviderScan(selectedCredId)
              else handleRunScan()
            }}
            size="lg"
            className="flex-1"
            disabled={!canScan || resuming}
          >
            {resuming ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
            {resuming ? t('scan.checkingForScans') : t('scan.runScan')}
          </Button>
        </AppTooltip>
        <AppTooltip content={t('scan.runDemoTooltip')}>
          <Button type="button" variant="secondary" size="lg" onClick={handleDemo} disabled={resuming}>
            <Radar size={16} />
            {t('scan.runDemo')}
          </Button>
        </AppTooltip>
      </div>
    </div>
  )
}

function AzureIdleContent({
  handleRunAzureScan,
  handleDemo,
  resuming,
}: {
  handleRunAzureScan: (credId: string) => void
  handleDemo: () => void
  resuming: boolean
}) {
  const { t } = useTranslation()
  const [azureCredentials, setAzureCredentials] = useState<CloudCredential[]>([])
  const [selectedCredId, setSelectedCredId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ alias: '', subscriptionId: '' })

  useEffect(() => {
    const { accountId } = getStoredAuth()
    if (!accountId) { setLoading(false); return }
    getCloudCredentials(accountId)
      .then(res => {
        const azure = res.credentials.filter(c => c.provider === 'azure')
        setAzureCredentials(azure)
        if (azure.length > 0 && !selectedCredId) setSelectedCredId(azure[0].id)
        if (azure.length === 0) setShowAddForm(true)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAzureOAuth = async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    setAdding(true)
    setAddError(null)
    try {
      const result = await initiateAzureOAuth(accountId, form.alias || 'Azure', form.subscriptionId)
      window.location.href = result.auth_url
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to initiate Azure connection')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Loading Azure credentials...</div>
  }

  return (
    <div className="space-y-5">
      {/* Azure credential selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            {azureCredentials.length === 0 ? t('scan.addFirstAzureCredential') : t('scan.azureCredentials')}
          </span>
          {azureCredentials.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="text-cyan-600 hover:text-primary/70">
              {showAddForm ? t('common.cancel') : t('scan.addAccount')}
            </Button>
          )}
        </div>
        {azureCredentials.map(cred => (
          <div
            key={cred.id}
            onClick={() => setSelectedCredId(cred.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              cred.id === selectedCredId
                ? 'bg-primary/50/8 border-cyan-500/30'
                : 'bg-muted border-border hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{cred.alias}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {cred.azure_subscription_id || 'No subscription ID'}
                  {cred.connection_type === 'oauth' && <span className="text-blue-400 ml-1">· OAuth</span>}
                </p>
              </div>
              {cred.id === selectedCredId && (
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Azure — OAuth flow */}
      {(showAddForm || azureCredentials.length === 0) && (
        <div className="space-y-3 p-4 rounded-lg bg-muted border border-border">
          <h3 className="text-sm font-semibold text-foreground">{t('settings.azureConnectTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('settings.azureConnectDesc')}</p>
          <Input label={t('scan.aliasLabel')} placeholder={t('scan.aliasPlaceholder')} value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} />
          <Input label={t('settings.azureSubscriptionId')} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.subscriptionId} onChange={e => setForm(p => ({ ...p, subscriptionId: e.target.value }))} />
          {addError && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{addError}</p>
            </div>
          )}
          <Button size="sm" onClick={handleAzureOAuth} loading={adding} className="w-full">{t('settings.azureConnectViaMicrosoft')}</Button>
        </div>
      )}

      <div className="flex gap-3">
        <AppTooltip content={t('scan.runScanTooltip')}>
          <Button onClick={() => selectedCredId && handleRunAzureScan(selectedCredId)} size="lg" className="flex-1" disabled={!selectedCredId || resuming}>
            {resuming ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
            {resuming ? t('scan.checkingForScans') : t('scan.runScan')}
          </Button>
        </AppTooltip>
        <AppTooltip content={t('scan.runDemoTooltip')}>
          <Button type="button" variant="secondary" size="lg" onClick={handleDemo} disabled={resuming}>
            <Radar size={16} />
            {t('scan.runDemo')}
          </Button>
        </AppTooltip>
      </div>
    </div>
  )
}

function ScanSidebar({ provider }: { provider: Provider }) {
  const { t } = useTranslation()
  const domains = provider === 'azure' ? AZURE_SCAN_DOMAINS : AWS_SCAN_DOMAINS

  return (
    <Card>
      <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Terminal size={14} className="text-cyan-600" />
        {t('scan.whatGetsScanned')}
        <InfoTooltip content={t('scan.whatGetsScannedTooltip')} size={12} />
      </h2>
      <div className="space-y-2">
        {domains.map(item => (
          <div key={item.article + item.labelKey} className="flex items-center justify-between p-2.5 rounded-lg bg-muted">
            <div>
              <span className={`text-xs font-mono font-bold ${item.color}`}>{item.article}</span>
              <p className="text-xs text-foreground mt-0.5">{t(item.labelKey)}</p>
            </div>
            <span className="text-xs text-muted-foreground">{t('scan.checksCount', { count: item.checks })}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={13} className="text-cyan-600" />
          <span className="text-xs font-semibold text-cyan-600">{t('scan.estDuration')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('scan.estDurationDesc')}</p>
      </div>

      {provider === 'aws' && (
        <div className="mt-4 p-3 rounded-lg bg-purple-500/8 border border-purple-500/15">
          <div className="flex items-center gap-2 mb-1">
            <Info size={13} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-400">{t('scan.comingSoonTitle')}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t('scan.comingSoonDesc')}</p>
        </div>
      )}
    </Card>
  )
}

export default function Scan() {
  const { t } = useTranslation()
  const { accountName, awsAccounts, selectedAwsAccountId, selectAwsAccount } = useAuth()
  const [provider, setProvider] = useState<Provider>('aws')
  const [showAddForm, setShowAddForm] = useState(awsAccounts.length === 0)
  const [activeAzureCredId, setActiveAzureCredId] = useState<string | null>(null)
  const [selectedAwsCredId, setSelectedAwsCredId] = useState<string | null>(null)
  const [allCredentials, setAllCredentials] = useState<CloudCredential[]>([])
  const { status, checks, currentCheckIndex, progress, scanResult, error, resuming, startScan, startProviderScan, resetScan } = useScan(selectedAwsAccountId)

  // Load all cloud credentials
  useEffect(() => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    getCloudCredentials(accountId)
      .then(res => setAllCredentials(res.credentials))
      .catch(() => {})
  }, [])

  const selectedAccount = awsAccounts.find(a => a.id === selectedAwsAccountId)
  const scanRegion = scanResult?.region || selectedAccount?.awsRegion || 'eu-west-1'

  const handleRunScan = () => {
    startScan('api', selectedAwsAccountId || undefined)
  }

  const handleRunAwsProviderScan = (credentialId: string) => {
    setSelectedAwsCredId(credentialId)
    startProviderScan(credentialId, 'aws')
  }

  const handleRunAzureScan = (credentialId: string) => {
    setActiveAzureCredId(credentialId)
    startProviderScan(credentialId, 'azure')
  }

  const handleDemo = () => {
    startScan('demo')
  }

  const handleReset = () => {
    setActiveAzureCredId(null)
    setSelectedAwsCredId(null)
    resetScan()
  }

  const selectAwsCredential = (id: string) => {
    setSelectedAwsCredId(id)
    // Deselect legacy account when selecting a credential
    selectAwsAccount('')
  }

  const handleSelectLegacyAwsAccount = (id: string) => {
    selectAwsAccount(id)
    setSelectedAwsCredId(null)
  }

  // Determine display info for scanning/complete states
  const scanProvider = activeAzureCredId ? 'azure' : 'aws'
  const displayId = scanProvider === 'azure'
    ? (activeAzureCredId?.slice(0, 8) || '')
    : (selectedAccount?.awsAccountId || '123456789012')
  const displayName = scanProvider === 'azure'
    ? 'Azure Subscription'
    : (selectedAccount?.alias || accountName || t('scan.demoAccount'))

  return (
    <PageContainer>
      <PageHeader
        title={t('scan.title')}
        description={provider === 'azure' ? t('scan.subtitle_azure') : t('scan.subtitle')}
      />
      <PageContent className="space-y-6">
        {status === 'idle' && (
          <>
            <ProviderTabs active={provider} onChange={setProvider} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Link size={16} className="text-emerald-600" />
                    {accountName}
                  </h2>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-semibold ${
                    provider === 'azure' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  }`}>
                    {provider.toUpperCase()}
                  </span>
                </div>

                {provider === 'aws' ? (
                  <AwsIdleContent
                    awsAccounts={awsAccounts}
                    credentials={allCredentials}
                    selectedAwsAccountId={selectedAwsAccountId}
                    selectedCredId={selectedAwsCredId}
                    selectAwsAccount={handleSelectLegacyAwsAccount}
                    selectCredential={selectAwsCredential}
                    showAddForm={showAddForm}
                    setShowAddForm={setShowAddForm}
                    handleRunScan={handleRunScan}
                    handleRunProviderScan={handleRunAwsProviderScan}
                    handleDemo={handleDemo}
                    resuming={resuming}
                  />
                ) : (
                  <AzureIdleContent
                    handleRunAzureScan={handleRunAzureScan}
                    handleDemo={handleDemo}
                    resuming={resuming}
                  />
                )}
              </Card>

              <ScanSidebar provider={provider} />
            </div>
          </>
        )}

        {/* Error state */}
        {status === 'error' && (
          <Card>
            <div className="p-6 text-center">
              <AlertTriangle size={48} className="text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('scan.scanFailed')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{error || t('scan.unexpectedError')}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleReset} variant="secondary">
                  <RotateCcw size={16} />
                  {t('scan.tryAgain')}
                </Button>
                <Button onClick={handleDemo} variant="ghost">
                  <Radar size={16} />
                  {t('scan.runDemoInstead')}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {(status === 'scanning' || status === 'complete') && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted border border-border">
              <Shield size={16} className="text-cyan-600" />
              <div className="flex items-center gap-4 text-sm">
                <span className="text-foreground font-medium">{displayName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground font-mono">{displayId}</span>
                <span className="text-muted-foreground">·</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                  scanProvider === 'azure' ? 'bg-blue-500/15 text-blue-400' : 'bg-orange-500/15 text-orange-400'
                }`}>
                  {scanProvider.toUpperCase()}
                </span>
                {scanProvider === 'aws' && <span className="text-muted-foreground">{scanRegion}</span>}
              </div>
              {status === 'scanning' && (
                <div className="ml-auto flex items-center gap-2 text-xs text-cyan-600">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
                  {t('scan.scanningInProgress')}
                </div>
              )}
            </div>

            <ScanTerminal
              checks={checks}
              currentIndex={currentCheckIndex}
              progress={progress}
              status={status}
              scanRegion={scanRegion}
              provider={scanProvider as Provider}
              subscriptionId={displayId}
            />

            <Card>
              <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Radar size={14} className="text-cyan-600" />
                {t('scan.checkStatus')}
                <InfoTooltip content={t('scan.checkStatusTooltip')} size={12} />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300 ${
                      check.status === 'scanning'
                        ? 'bg-primary/50/8 border-cyan-500/20'
                        : check.status === 'pass'
                        ? 'bg-emerald-500/5 border-emerald-500/15'
                        : check.status === 'info'
                        ? 'bg-sky-500/5 border-sky-500/15'
                        : check.status === 'warn'
                        ? 'bg-amber-500/5 border-amber-500/15'
                        : check.status === 'fail'
                        ? 'bg-red-500/5 border-red-500/10'
                        : 'bg-muted border-border'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {check.status === 'pending' && <div className="w-2 h-2 rounded-full bg-border" />}
                      {check.status === 'scanning' && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                      {check.status === 'pass' && <CheckCircle size={13} className="text-emerald-600" />}
                      {check.status === 'info' && <Info size={13} className="text-sky-400" />}
                      {check.status === 'warn' && <AlertTriangle size={13} className="text-amber-400" />}
                      {check.status === 'fail' && <XCircle size={13} className={
                        check.severity === 'critical' ? 'text-red-600' :
                        check.severity === 'high' ? 'text-orange-400' :
                        check.severity === 'medium' ? 'text-amber-600' : 'text-blue-400'
                      } />}
                    </div>
                    <span className={`text-xs flex-1 truncate ${
                      check.status === 'pending' ? 'text-muted-foreground' :
                      check.status === 'scanning' ? 'text-cyan-600' :
                      check.status === 'pass' ? 'text-emerald-700' :
                      check.status === 'info' ? 'text-sky-600' :
                      check.status === 'warn' ? 'text-amber-700' : 'text-foreground'
                    }`}>
                      {check.checkName}
                    </span>
                    {check.severity && check.status === 'fail' && (
                      <SeverityBadge severity={check.severity} />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {status === 'complete' && <ScanComplete onReset={handleReset} scanResult={scanResult} provider={scanProvider as Provider} />}
          </div>
        )}
      </PageContent>
    </PageContainer>
  )
}
