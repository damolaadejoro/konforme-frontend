import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  FileText,
  Users,
  Radar,
  Activity,
  ClipboardCheck,
  CheckSquare,
} from 'lucide-react'
import { useControlsContext } from '../context/ControlsContext'
import { useScore } from '../context/ScoreContext'
import { Card, Button, StatCard, ProgressBar, SeverityBadge, InfoTooltip } from '../components/ui'
import { ControlStatus } from '../types/controls'
import CompanyNameModal from '../components/ui/CompanyNameModal'
import { generateComplianceReport } from '../utils/generatePDF'
import { isConnected, getCloudCredentials, getStoredAuth, type CombinedScoreResponse, type CloudCredential } from '../services/api'
import { useAssessment } from '../hooks/useAssessment'
import { useAuth } from '../context/AuthContext'
import { translateStatus, translateCategory } from '../utils/controlTranslations'
import NextStepBanner from '../components/NextStepBanner'
import CountryInfoCard from '../components/CountryInfoCard'
import DeadlinesWidget from '../components/DeadlinesWidget'

const statusColors: Record<ControlStatus, string> = {
  'Not Started': '#ef4444',
  'Planned': '#f97316',
  'Partial': '#f59e0b',
  'Implemented': '#10b981'
}

const statusBgColors: Record<ControlStatus, string> = {
  'Not Started': 'bg-red-500/10 border-red-500/20',
  'Planned': 'bg-orange-500/10 border-orange-500/20',
  'Partial': 'bg-yellow-500/10 border-yellow-500/20',
  'Implemented': 'bg-emerald-500/10 border-emerald-500/20'
}

export default function NIS2Overview() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { complianceScore, articleAreas, criticalGaps, allCriticalGaps, employeeComplianceStats, controls, getCountryOverlay } = useControlsContext()
  const { overallScore, technicalScore, assessmentScore: assessmentScoreVal, controlsScore, backendScore, fetchFilteredScore } = useScore()
  const { answeredCount, totalQuestions } = useAssessment()
  const { awsAccounts, country } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [perAccountScores, setPerAccountScores] = useState<Record<string, CombinedScoreResponse>>({})
  const [azureCredentials, setAzureCredentials] = useState<CloudCredential[]>([])
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null) // null = all accounts

  // Stabilize awsAccounts reference to prevent infinite re-render loop
  const awsAccountIds = useMemo(() => awsAccounts.map(a => a.id).join(','), [awsAccounts])

  // Fetch per-account scores and Azure credentials
  useEffect(() => {
    if (isConnected()) {
      const { accountId } = getStoredAuth()
      if (accountId) {
        // Fetch per-AWS-account scores
        if (awsAccounts.length > 0) {
          awsAccounts.forEach(acc => {
            fetchFilteredScore({ awsAccountId: acc.id })
              .then(score => { if (score) setPerAccountScores(prev => ({ ...prev, [acc.id]: score })) })
          })
        }

        // Fetch Azure credentials + per-credential scores
        getCloudCredentials(accountId)
          .then(data => {
            const azureCreds = data.credentials.filter(c => c.provider === 'azure')
            setAzureCredentials(azureCreds)
            azureCreds.forEach(cred => {
              fetchFilteredScore({ credentialId: cred.id })
                .then(score => { if (score) setPerAccountScores(prev => ({ ...prev, [cred.id]: score })) })
            })
          })
          .catch(() => {})
      }
    }
  }, [dashboardFilter, awsAccountIds, fetchFilteredScore])

  const implementedCount = controls.filter(c => c.status === 'Implemented').length
  const totalControls = controls.length

  const score = overallScore
  const scoreColor = score >= 91 ? '#3b82f6' : score >= 71 ? '#10b981' : score >= 41 ? '#f59e0b' : '#ef4444'
  const scoreLabel = score >= 91 ? t('overview.excellent') : score >= 71 ? t('overview.good') : score >= 41 ? t('overview.atRisk') : t('overview.critical')
  const scoreBg = score >= 91 ? 'from-blue-500/10' : score >= 71 ? 'from-emerald-500/10' : score >= 41 ? 'from-yellow-500/10' : 'from-red-500/10'

  const handleGenerateReport = async (companyName: string) => {
    setIsGenerating(true)
    try {
      await generateComplianceReport({
        companyName,
        complianceScore,
        controls,
        articleAreas,
        criticalGaps
      }, i18n.language)
      // Close modal after successful generation
      setTimeout(() => {
        setIsModalOpen(false)
        setIsGenerating(false)
      }, 500)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      setIsGenerating(false)
      alert(t('common.reportGenerateFailed'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Onboarding next-step nudge */}
      <NextStepBanner />

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white">{t('overview.title')}</h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">
            {t('overview.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} loading={isGenerating}>
          <FileText size={16} />
          {t('overview.generateReport')}
        </Button>
      </div>

      {/* Overall Readiness Score Banner */}
      <Card glow className={`relative overflow-hidden bg-gradient-to-br ${scoreBg} to-transparent`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={24} className="text-cyan-400" />
                <h2 className="text-xl font-bold font-syne text-white flex items-center gap-2">
                  {t('overview.readinessScore')}
                  <InfoTooltip content={t('overview.readinessScoreTooltip')} />
                </h2>
              </div>
              <p className="text-[14px] text-[#CBD8E8] mb-6">
                {t('overview.readinessDesc')}
              </p>

              {/* Score breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-lg bg-gradient-to-br ${scoreBg} to-transparent border border-cyan-500/20`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className="text-cyan-400" />
                    <span className="text-xs text-cyan-400 uppercase tracking-wider font-semibold">{t('overview.overall')}</span>
                    <InfoTooltip content={t('overview.overallTooltip')} size={12} />
                  </div>
                  <div className="text-4xl font-bold font-syne mb-1" style={{ color: scoreColor }}>
                    {score}%
                  </div>
                  <div className="text-xs font-semibold" style={{ color: scoreColor }}>
                    {scoreLabel}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-navy-900/60 border border-navy-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Radar size={14} className="text-purple-400" />
                    <span className="text-xs text-[#94b4d1] uppercase tracking-wider font-semibold">{t('overview.technical')}</span>
                    <InfoTooltip content={t('overview.technicalTooltip')} size={12} />
                  </div>
                  <div className="text-3xl font-bold font-syne text-white mb-1">{technicalScore}%</div>
                  <ProgressBar value={technicalScore} color="bg-purple-500" height="h-1.5" />
                  {backendScore?.lastTechnicalScan ? (
                    <p className="text-[11px] text-[#94b4d1] mt-1">
                      {t('overview.lastScan')}: {new Date(backendScore.lastTechnicalScan).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#94b4d1] mt-1">{t('overview.noScanYet')}</p>
                  )}
                </div>

                <div
                  className="p-4 rounded-lg bg-navy-900/60 border border-navy-700 cursor-pointer hover:border-cyan-500/40 transition-all"
                  onClick={() => navigate('/assessment')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardCheck size={14} className="text-blue-400" />
                    <span className="text-xs text-[#94b4d1] uppercase tracking-wider font-semibold">{t('overview.assessment')}</span>
                    <InfoTooltip content={t('overview.assessmentTooltip')} size={12} />
                  </div>
                  <div className="text-3xl font-bold font-syne text-white mb-1">{assessmentScoreVal}%</div>
                  <ProgressBar value={assessmentScoreVal} color="bg-blue-500" height="h-1.5" />
                  <p className="text-[11px] text-[#94b4d1] mt-1">{answeredCount}/{totalQuestions} {t('overview.questions')}</p>
                </div>

                <div
                  className="p-4 rounded-lg bg-navy-900/60 border border-navy-700 cursor-pointer hover:border-cyan-500/40 transition-all"
                  onClick={() => navigate('/controls')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare size={14} className="text-emerald-400" />
                    <span className="text-xs text-[#94b4d1] uppercase tracking-wider font-semibold">{t('overview.controlsCard')}</span>
                    <InfoTooltip content={t('overview.controlsCardTooltip')} size={12} />
                  </div>
                  <div className="text-3xl font-bold font-syne text-white mb-1">{controlsScore}%</div>
                  <ProgressBar value={controlsScore} color="bg-emerald-500" height="h-1.5" />
                  <p className="text-[11px] text-[#94b4d1] mt-1">{t('overview.controlsImplemented', { count: implementedCount, total: totalControls })}</p>
                </div>
              </div>

              {/* Status alert */}
              {score < 71 && (
                <div className={`mt-6 p-3 rounded-lg border flex items-start gap-2 ${
                  score >= 41 ? 'bg-yellow-500/8 border-yellow-500/15' : 'bg-red-500/8 border-red-500/15'
                }`}>
                  <AlertTriangle size={14} className={`${score >= 41 ? 'text-yellow-400' : 'text-red-400'} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1">
                    <p className={`text-[13px] ${score >= 41 ? 'text-yellow-300' : 'text-red-300'}`}>
                      {score >= 41
                        ? t('overview.moderateRisk')
                        : t('overview.criticalRisk')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/controls')}
                    className={score >= 41 ? 'text-yellow-400 hover:text-yellow-300' : 'text-red-400 hover:text-red-300'}
                  >
                    {t('overview.viewControls')} <ChevronRight size={12} />
                  </Button>
                </div>
              )}

              {score >= 91 && (
                <div className="mt-6 p-3 rounded-lg bg-blue-500/8 border border-blue-500/15 flex items-start gap-2">
                  <TrendingUp size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] text-blue-300">
                    {t('overview.excellentMsg')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Country Info */}
      <CountryInfoCard />

      {/* Deadlines */}
      <DeadlinesWidget countryCode={country} />

      {/* Cloud Provider Scores */}
      {isConnected() && (awsAccounts.length > 0 || azureCredentials.length > 0) && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[18px] font-bold font-syne text-white">{t('overview.cloudScores')}</h2>
              <p className="text-[13px] text-[#94b4d1] mt-1">{t('overview.cloudScoresDesc')}</p>
            </div>
            {(awsAccounts.length + azureCredentials.length) > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDashboardFilter(null)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    !dashboardFilter ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-navy-400 hover:text-white'
                  }`}
                >
                  {t('common.all')}
                </button>
                {awsAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => setDashboardFilter(acc.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      dashboardFilter === acc.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-navy-400 hover:text-white'
                    }`}
                  >
                    {acc.alias}
                  </button>
                ))}
                {azureCredentials.map(cred => (
                  <button
                    key={cred.id}
                    onClick={() => setDashboardFilter(cred.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      dashboardFilter === cred.id ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'text-navy-400 hover:text-white'
                    }`}
                  >
                    {cred.alias}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={`grid gap-3 ${(awsAccounts.length + azureCredentials.length) === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {awsAccounts.map(acc => {
              const accScore = perAccountScores[acc.id]
              const s = accScore?.overallScore
              const grade = accScore?.grade || '—'
              const lastScanDate = accScore?.lastTechnicalScan
                ? new Date(accScore.lastTechnicalScan).toLocaleDateString()
                : t('overview.noScan')
              const sColor = s != null ? (s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-navy-400'
              const sBg = s != null ? (s >= 75 ? 'bg-emerald-500/8 border-emerald-500/20' : s >= 50 ? 'bg-yellow-500/8 border-yellow-500/20' : 'bg-red-500/8 border-red-500/20') : 'bg-navy-900/40 border-navy-800'

              return (
                <div
                  key={acc.id}
                  onClick={() => setDashboardFilter(acc.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/40 ${sBg}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold">AWS</span>
                        <p className="text-sm font-semibold text-white">{acc.alias}</p>
                      </div>
                      <p className="text-[11px] text-navy-400 font-mono mt-0.5">{acc.awsAccountId} · {acc.awsRegion}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold font-syne ${sColor}`}>
                        {s != null ? `${s}%` : '—'}
                      </div>
                      <div className={`text-[10px] font-semibold ${sColor}`}>{grade}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-navy-400">
                    <span>{t('overview.lastScan')}: {lastScanDate}</span>
                    {s != null && <ProgressBar value={s} height="h-1" />}
                  </div>
                </div>
              )
            })}
            {azureCredentials.map(cred => {
              const accScore = perAccountScores[cred.id]
              const s = accScore?.overallScore
              const grade = accScore?.grade || '—'
              const lastScanDate = accScore?.lastTechnicalScan
                ? new Date(accScore.lastTechnicalScan).toLocaleDateString()
                : t('overview.noScan')
              const sColor = s != null ? (s >= 75 ? 'text-emerald-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-navy-400'
              const sBg = s != null ? (s >= 75 ? 'bg-emerald-500/8 border-emerald-500/20' : s >= 50 ? 'bg-yellow-500/8 border-yellow-500/20' : 'bg-red-500/8 border-red-500/20') : 'bg-navy-900/40 border-navy-800'

              return (
                <div
                  key={cred.id}
                  onClick={() => setDashboardFilter(cred.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/40 ${sBg}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">Azure</span>
                        <p className="text-sm font-semibold text-white">{cred.alias}</p>
                      </div>
                      <p className="text-[11px] text-navy-400 font-mono mt-0.5">{cred.azure_subscription_id || '—'}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold font-syne ${sColor}`}>
                        {s != null ? `${s}%` : '—'}
                      </div>
                      <div className={`text-[10px] font-semibold ${sColor}`}>{grade}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-navy-400">
                    <span>{t('overview.lastScan')}: {lastScanDate}</span>
                    {s != null && <ProgressBar value={s} height="h-1" />}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label={t('overview.controls')}
          value={articleAreas.reduce((sum, area) => sum + area.controlCount, 0)}
          icon={<Shield size={18} className="text-navy-300" />}
          accent="text-white"
          tooltip={t('overview.controlsTooltip')}
          onClick={() => navigate('/controls')}
        />
        <StatCard
          label={t('overview.implemented')}
          value={articleAreas.reduce((sum, area) => sum + area.implementedCount, 0)}
          icon={<CheckCircle size={18} className="text-emerald-400" />}
          accent="text-emerald-400"
          tooltip={t('overview.implementedTooltip')}
          onClick={() => navigate('/controls?status=Implemented')}
        />
        <StatCard
          label={t('overview.criticalGaps')}
          value={allCriticalGaps.length}
          icon={<AlertTriangle size={18} className="text-red-500" />}
          accent="text-red-500"
          trend={t('overview.requiresAttention')}
          tooltip={t('overview.criticalGapsTooltip')}
          onClick={() => navigate('/controls?view=critical-gaps')}
        />
        <StatCard
          label={t('overview.employeeTasks')}
          value={`${employeeComplianceStats.completionRate}%`}
          icon={<Users size={18} className="text-cyan-400" />}
          accent="text-cyan-400"
          trend={`${employeeComplianceStats.completedTasks}/${employeeComplianceStats.totalTasks} ${t('overview.completed')}`}
          tooltip={t('overview.employeeTasksTooltip')}
          onClick={() => navigate('/people-tasks')}
        />
        <StatCard
          label={t('overview.articleAreas')}
          value={articleAreas.length}
          icon={<Activity size={18} className="text-navy-300" />}
          accent="text-white"
          tooltip={t('overview.articleAreasTooltip')}
          onClick={() => document.getElementById('coverage-map')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>

      {/* NIS2 Article 21 Coverage Map */}
      <div id="coverage-map">
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold font-syne text-white flex items-center gap-2">
              {t('overview.coverageMap')}
              <InfoTooltip content={t('overview.coverageMapTooltip')} />
            </h2>
            <p className="text-[13px] text-[#94b4d1] mt-1">{t('overview.coverageMapDesc')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/controls')}>
            {t('overview.viewAllControls')} <ChevronRight size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {articleAreas.map(area => {
            const color = statusColors[area.status]
            const bgClass = statusBgColors[area.status]
            const progress = Math.round((area.implementedCount / area.controlCount) * 100)

            return (
              <div
                key={area.id}
                onClick={() => navigate(`/controls?area=${encodeURIComponent(area.name)}`)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/40 ${bgClass}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-[#94b4d1]">{area.article}</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color
                        }}
                      >
                        {translateStatus(t, area.status)}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-white leading-snug">{translateCategory(t, area.name)}</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <ProgressBar value={progress} />
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[#94b4d1]">
                      {t('overview.ofControls', { implemented: area.implementedCount, count: area.controlCount })}
                    </span>
                    <span className="font-semibold" style={{ color }}>
                      {progress}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
      </div>

      {/* Critical Gaps */}
      <Card>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[18px] font-bold font-syne text-white">
              {t('overview.topGaps')}
            </h2>
            <p className="text-[13px] text-[#94b4d1] mt-1">{t('overview.topGapsDesc')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/controls')}>
            {t('common.viewAll')} <ChevronRight size={14} />
          </Button>
        </div>

        {criticalGaps.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-syne text-white mb-2">
              {t('overview.noGaps')}
            </h3>
            <p className="text-[14px] text-[#CBD8E8] max-w-md mx-auto">
              {t('overview.noGapsDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {criticalGaps.map((control, i) => (
              <div
                key={control.id}
                onClick={() => navigate(`/controls?open=${encodeURIComponent(control.id)}`)}
                className="group flex items-center gap-4 p-3 rounded-lg bg-navy-900/40 hover:bg-navy-800/60 border border-navy-800 hover:border-navy-700 cursor-pointer transition-all"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex-shrink-0">
                  <SeverityBadge severity={control.severity} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[15px] font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                      {t(`controls.${control.id}.title`, { defaultValue: control.title })}
                    </h4>
                    {control.isCountrySpecific && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 flex-shrink-0">
                        {t('controls.nationalRequirement', 'National Requirement')}
                      </span>
                    )}
                    {(getCountryOverlay(control.article)?.goesBeyondEu || control.goesBeyondEu) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 flex-shrink-0">
                        {t('controls.goesBeyondEu', 'Beyond EU')}
                      </span>
                    )}
                    {(getCountryOverlay(control.article)?.nationalLegalReference || control.nationalLegalReference) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex-shrink-0">
                        {getCountryOverlay(control.article)?.nationalLegalReference || control.nationalLegalReference}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="text-[#94b4d1] font-mono">{control.article}</span>
                    <span className="text-[#4a6580]">•</span>
                    <span className="text-[#94b4d1]">{translateCategory(t, control.category)}</span>
                    <span className="text-[#4a6580]">•</span>
                    <span
                      className="font-semibold"
                      style={{ color: statusColors[control.status] }}
                    >
                      {translateStatus(t, control.status)}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <span className="text-[13px] text-[#94b4d1]">{control.owner}</span>
                  <ChevronRight size={14} className="text-[#4a6580] group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Continuous Compliance Widget */}
      {backendScore?.continuousComplianceRate != null && (
        <Card className="hover:border-cyan-500/30 cursor-pointer transition-all" onClick={() => navigate('/people-tasks/continuous')}>
          <div className="flex items-center gap-6 p-2">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Activity size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">{t('overview.continuousCompliance', 'Continuous Compliance')}</h3>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-cyan-400">{Math.round(backendScore.continuousComplianceRate * 100)}%</span>
                <ProgressBar value={backendScore.continuousComplianceRate * 100} color="bg-cyan-500" height="h-2" />
              </div>
            </div>
            <ChevronRight size={18} className="text-navy-400" />
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-cyan-500/40 transition-all cursor-pointer" onClick={() => navigate('/controls')}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Shield size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white mb-1">{t('overview.manageControls')}</h3>
              <p className="text-[13px] text-[#94b4d1] leading-relaxed mb-3">
                {t('overview.manageControlsDesc')}
              </p>
              <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 -ml-2">
                {t('overview.openControls')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="hover:border-blue-500/40 transition-all cursor-pointer" onClick={() => navigate('/assessment')}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <ClipboardCheck size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white mb-1">{t('overview.nis2Assessment')}</h3>
              <p className="text-[13px] text-[#94b4d1] leading-relaxed mb-3">
                {t('overview.nis2AssessmentDesc')}
              </p>
              <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 -ml-2">
                {answeredCount > 0 ? t('overview.continueAssessment') : t('overview.startAssessment')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="hover:border-purple-500/40 transition-all cursor-pointer" onClick={() => navigate('/scan')}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Radar size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white mb-1">{t('overview.technicalScan')}</h3>
              <p className="text-[13px] text-[#94b4d1] leading-relaxed mb-3">
                {t('overview.technicalScanDesc')}
              </p>
              <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 -ml-2">
                {t('overview.runScan')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="hover:border-emerald-500/40 transition-all cursor-pointer" onClick={() => navigate('/people-tasks')}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Users size={24} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-white mb-1">{t('overview.peopleTasksTitle')}</h3>
              <p className="text-[13px] text-[#94b4d1] leading-relaxed mb-3">
                {t('overview.peopleTasksDesc')}
              </p>
              <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 -ml-2">
                {t('overview.viewCampaigns')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Company Name Modal */}
      <CompanyNameModal
        isOpen={isModalOpen}
        onClose={() => !isGenerating && setIsModalOpen(false)}
        onConfirm={handleGenerateReport}
        isGenerating={isGenerating}
      />
    </div>
  )
}
