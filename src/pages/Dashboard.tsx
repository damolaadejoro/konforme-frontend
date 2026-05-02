import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Radar,
  ChevronRight,
  ChevronDown,
  TrendingDown,
  Lock,
  Eye,
  Database,
  Server,
  Users,
  FileText,
  Clock,
  HelpCircle,
  Loader2,
} from 'lucide-react'
import { Card, StatCard, SeverityBadge, Button, ProgressBar } from '../components/ui'
import { useHumanFactor } from '../hooks/useHumanFactor'
import { useOrganizational } from '../hooks/useOrganizational'
import { useDashboardScan } from '../hooks/useDashboardScan'
import { useScanHistory } from '../hooks/useScanHistory'
import { useScore } from '../context/ScoreContext'
import { format } from 'date-fns'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        <p className="text-primary">Score: <span className="font-bold">{payload[0].value}%</span></p>
      </div>
    )
  }
  return null
}

const domainIcons: Record<string, React.ReactNode> = {
  'Access Control': <Lock size={14} className="text-primary" />,
  'Monitoring': <Eye size={14} className="text-primary" />,
  'Encryption': <Database size={14} className="text-primary" />,
  'Business Continuity': <Server size={14} className="text-primary" />,
}

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { scanData, loading: scanLoading } = useDashboardScan()
  const { scans: scanHistory, loading: historyLoading } = useScanHistory()
  const { assessment: humanAssessment } = useHumanFactor()
  const { assessment: orgAssessment } = useOrganizational()
  const [scoreExplainerOpen, setScoreExplainerOpen] = useState(false)
  const { overallScore: contextOverallScore } = useScore()

  // Loading state
  if (scanLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Loader2 size={40} className="text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">{t('dashboard.loadingScanData')}</p>
      </div>
    )
  }

  // Empty state — no scan yet
  if (!scanData) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
          </div>
        </div>
        <Card glow className="flex flex-col items-center justify-center py-16 text-center">
          <Radar size={48} className="text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t('dashboard.noScanTitle')}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            {t('dashboard.noScanDesc')}
          </p>
          <Button onClick={() => navigate('/scan')} size="md">
            <Radar size={16} />
            {t('dashboard.runFirstScan')}
          </Button>
        </Card>
      </div>
    )
  }

  const score = scanData.overallScore ?? 0
  const scoreColor =
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const scoreLabel =
    score >= 75 ? t('common.compliant') : score >= 50 ? t('common.atRisk') : t('common.nonCompliant')

  const donutData = [
    { name: 'Score', value: score },
    { name: 'Gap', value: 100 - score },
  ]

  const criticalFindings = scanData.findings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 5)

  // Individual scores for assessment cards
  const technicalScore = score
  const humanScore = humanAssessment.score
  const orgScore = orgAssessment.score
  const hasHumanAssessment = humanAssessment.answered > 0
  const hasOrgAssessment = orgAssessment.answered > 0

  // Use ScoreContext's overall score (3-pillar, user-configured weights)
  const combinedScore = contextOverallScore > 0 ? contextOverallScore : score

  const combinedColor = combinedScore >= 75 ? '#10b981' : combinedScore >= 50 ? '#f59e0b' : '#ef4444'
  const combinedLabel = combinedScore >= 75 ? t('common.compliant') : combinedScore >= 50 ? t('common.atRisk') : t('common.nonCompliant')

  const hasAllAssessments = hasHumanAssessment && hasOrgAssessment

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('dashboard.subtitle')} ·{' '}
            {scanData.completedAt
              ? format(new Date(scanData.completedAt), 'MMMM d, yyyy')
              : t('common.inProgress')}
          </p>
        </div>
        <Button onClick={() => navigate('/scan')} size="md">
          <Radar size={16} />
          {t('dashboard.runNewScan')}
        </Button>
      </div>

      {/* Combined NIS2 Score Banner */}
      <Card glow className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Shield size={20} className="text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {t('dashboard.overallScore')}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('dashboard.overallScoreDesc')}
              </p>

              {/* Score breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Radar size={14} className="text-purple-400" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('dashboard.technical')}</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{technicalScore}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{t('dashboard.awsInfrastructure')}</div>
                </div>

                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={14} className="text-emerald-600" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('dashboard.humanFactor')}</span>
                  </div>
                  <div className={`text-2xl font-bold ${hasHumanAssessment ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {hasHumanAssessment ? `${humanScore}%` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {hasHumanAssessment ? t('dashboard.peopleSecurity') : (
                      <button
                        onClick={() => navigate('/assessment/human-factor')}
                        className="text-primary hover:text-primary/70 transition-colors"
                      >
                        {t('dashboard.startAssessment')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('dashboard.organizational')}</span>
                  </div>
                  <div className={`text-2xl font-bold ${hasOrgAssessment ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {hasOrgAssessment ? `${orgScore}%` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {hasOrgAssessment ? t('dashboard.policiesGovernance') : (
                      <button
                        onClick={() => navigate('/assessment/organizational')}
                        className="text-primary hover:text-primary/70 transition-colors"
                      >
                        {t('dashboard.startAssessment')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-50/50 border border-primary/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-primary" />
                    <span className="text-xs text-primary uppercase tracking-wider font-semibold">{t('dashboard.combined')}</span>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: combinedColor }}>
                    {combinedScore}%
                  </div>
                  <div className="text-xs font-semibold mt-1" style={{ color: combinedColor }}>
                    {combinedLabel}
                  </div>
                </div>
              </div>

              {!hasAllAssessments && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-700">
                      <strong>{t('dashboard.incompleteAssessment')}</strong> {!hasHumanAssessment && !hasOrgAssessment ? t('dashboard.completeBothAssessments') : !hasHumanAssessment ? t('dashboard.completeHumanFactor') : t('dashboard.completeOrganizational')}
                    </p>
                  </div>
                  {!hasHumanAssessment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/assessment/human-factor')}
                      className="text-amber-600 hover:text-amber-500"
                    >
                      {t('dashboard.humanFactor')} <ChevronRight size={12} />
                    </Button>
                  )}
                  {!hasOrgAssessment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/assessment/organizational')}
                      className="text-amber-600 hover:text-amber-500"
                    >
                      {t('dashboard.organizational')} <ChevronRight size={12} />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Score Explanation */}
      <button
        onClick={() => setScoreExplainerOpen(!scoreExplainerOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <HelpCircle size={14} />
        <span>{t('dashboard.howScoreCalculated')}</span>
        {scoreExplainerOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {scoreExplainerOpen && (
        <Card className="text-sm text-muted-foreground space-y-4">
          <div>
            <h3 className="text-foreground font-semibold mb-1">{t('dashboard.technicalScoreTitle')}</h3>
            <p>{t('dashboard.technicalScoreDesc')}</p>
            <p className="mt-1">
              Formula: <code className="text-primary bg-muted px-1.5 py-0.5 rounded text-xs">{t('dashboard.technicalScoreFormula')}</code>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.technicalScoreNote')}</p>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-1">{t('dashboard.domainScoresTitle')}</h3>
            <p>{t('dashboard.domainScoresDesc')} <code className="text-primary bg-muted px-1.5 py-0.5 rounded text-xs">{t('dashboard.domainScoresFormula')}</code></p>
            <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.domainScoresNote')}</p>
          </div>

          <div>
            <h3 className="text-foreground font-semibold mb-1">{t('dashboard.combinedScoreTitle')}</h3>
            <ul className="space-y-1 text-xs">
              <li><span className="text-foreground">{t('dashboard.combinedTechnicalOnly')}</span> {t('dashboard.combinedTechnicalOnlyDesc')}</li>
              <li><span className="text-foreground">{t('dashboard.combinedOneAssessment')}</span> {t('dashboard.combinedOneAssessmentDesc')}</li>
              <li><span className="text-foreground">{t('dashboard.combinedBothAssessments')}</span> {t('dashboard.combinedBothAssessmentsDesc')}</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label={t('dashboard.nis2Score')}
          value={`${score}%`}
          accent={score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}
          icon={<Shield size={18} className={score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'} />}
          trend={scoreLabel}
        />
        <StatCard
          label={t('dashboard.totalChecks')}
          value={scanData.totalChecks}
          icon={<CheckCircle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          label={t('dashboard.passed')}
          value={scanData.passed}
          accent="text-emerald-600"
          icon={<CheckCircle size={18} className="text-emerald-600" />}
        />
        <StatCard
          label={t('dashboard.failed')}
          value={scanData.failed}
          accent="text-red-600"
          icon={<XCircle size={18} className="text-red-600" />}
        />
        <StatCard
          label={t('dashboard.critical')}
          value={scanData.criticalCount}
          accent="text-red-500"
          icon={<AlertTriangle size={18} className="text-red-500" />}
          trend={scanData.criticalCount > 0 ? t('dashboard.requiresAction') : undefined}
        />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Donut */}
        <Card glow className="flex flex-col items-center">
          <h2 className="text-base font-bold text-foreground mb-4 self-start">
            {t('dashboard.overallComplianceScore')}
          </h2>
          <div className="relative">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={96}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill={scoreColor} />
                  <Cell fill="#e2e8f0" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-4xl font-bold"
                style={{ color: scoreColor }}
              >
                {score}%
              </span>
              <span className="text-xs font-semibold mt-1" style={{ color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full mt-4 space-y-2">
            {[
              { label: t('common.critical'), count: scanData.criticalCount, color: '#ef4444' },
              { label: t('common.high'), count: scanData.highCount, color: '#f97316' },
              { label: t('common.medium'), count: scanData.mediumCount, color: '#f59e0b' },
              { label: t('common.passed'), count: scanData.passed, color: '#10b981' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-semibold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>

          {/* Alert */}
          {score < 50 && (
            <div className="mt-4 w-full p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <TrendingDown size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                {t('dashboard.scoreBelow50')}
              </p>
            </div>
          )}
        </Card>

        {/* Domain bar chart */}
        <Card className="col-span-2">
          <h2 className="text-base font-bold text-foreground mb-5">
            {t('dashboard.scoreByDomain')}
          </h2>
          {scanData.domainScores.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={scanData.domainScores}
                  margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="domain"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {scanData.domainScores.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.score >= 75
                            ? '#10b981'
                            : entry.score >= 50
                            ? '#f59e0b'
                            : '#ef4444'
                        }
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Domain details */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                {scanData.domainScores.map(d => (
                  <div key={d.domain} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {domainIcons[d.domain]}
                        <span className="text-xs font-semibold text-foreground">{d.domain}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{d.article}</span>
                    </div>
                    <ProgressBar value={d.score} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-emerald-600">{d.passed} {t('dashboard.pass')}</span>
                      <span className="text-xs text-red-600">{d.failed} {t('dashboard.fail')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dashboard.noDomainScores')}</p>
          )}
        </Card>
      </div>

      {/* Recent critical findings */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-foreground">
            {t('dashboard.criticalHighFindings')}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/scan/findings')}>
            {t('common.viewAll')} <ChevronRight size={14} />
          </Button>
        </div>

        {criticalFindings.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle size={16} className="text-emerald-600" />
            <p className="text-sm text-emerald-700">{t('dashboard.noCriticalFindings')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {criticalFindings.map((finding, i) => (
              <div
                key={finding.id}
                onClick={() => navigate('/scan/findings')}
                className="group flex items-center gap-4 p-3 rounded-lg bg-muted hover:bg-muted border border-border hover:border-border/80 cursor-pointer transition-all duration-200"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <SeverityBadge severity={finding.severity as any} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {finding.checkName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{finding.resource}</p>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">{finding.article}</span>
                  <span className="text-xs text-muted-foreground">{finding.region}</span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Scan History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">{t('dashboard.scanHistory')}</h2>
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 size={16} className="text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">{t('dashboard.loadingScanHistory')}</span>
          </div>
        ) : scanHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('dashboard.noPreviousScans')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.dateHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.statusHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.scoreHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.checksHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.passedHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('dashboard.failedHeader')}</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('dashboard.criticalHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map(s => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {s.startedAt ? format(new Date(s.startedAt), 'MMM d, yyyy HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.status === 'complete'
                          ? 'bg-emerald-50 text-emerald-600'
                          : s.status === 'error'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-semibold" style={{
                      color: s.overallScore != null
                        ? s.overallScore >= 75 ? '#10b981' : s.overallScore >= 50 ? '#f59e0b' : '#ef4444'
                        : '#94a3b8',
                    }}>
                      {s.overallScore != null ? `${s.overallScore}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.totalChecks}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600">{s.passed}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600">{s.failed}</td>
                    <td className="px-4 py-2.5 text-sm text-red-500 hidden md:table-cell">{s.criticalCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Scan info footer */}
      <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted border border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t('common.account')}: <span className="text-foreground">{scanData.accountName} ({scanData.accountId})</span></span>
          <span>{t('common.region')}: <span className="text-foreground">{scanData.region}</span></span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/scan')}>
          <Radar size={13} />
          {t('dashboard.reScan')}
        </Button>
      </div>
    </div>
  )
}
