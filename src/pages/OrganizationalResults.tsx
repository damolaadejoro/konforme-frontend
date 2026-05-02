import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Edit,
  RotateCcw,
  ChevronRight,
  Lightbulb,
  Shield,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useOrganizational } from '../hooks/useOrganizational'
import { Card, Button, SeverityBadge, ProgressBar, StatCard } from '../components/ui'

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation()
  if (active && payload && payload.length) {
    return (
      <div className="bg-foreground border border-foreground/80 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="font-semibold text-white mb-1">{label}</p>
        <p className="text-primary">{t('organizationalResults.tooltipScoreLabel')} <span className="font-bold">{payload[0].value}%</span></p>
      </div>
    )
  }
  return null
}

export default function OrganizationalResults() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { assessment, sectionScores, resetAssessment, isComplete } = useOrganizational()

  if (!isComplete && assessment.answered === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="text-center py-12">
          <AlertTriangle size={48} className="text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {t('organizationalResults.noAssessmentTitle')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('organizationalResults.noAssessmentDescription')}
          </p>
          <Button onClick={() => navigate('/assessment/organizational')}>
            <FileText size={16} />
            {t('organizationalResults.startAssessmentButton')}
          </Button>
        </Card>
      </div>
    )
  }

  const score = assessment.score
  const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const scoreLabel = score >= 75 ? t('organizationalResults.scoreLabelStrong') : score >= 50 ? t('organizationalResults.scoreLabelModerate') : t('organizationalResults.scoreLabelNeedsImprovement')

  const criticalGaps = assessment.gaps.filter(g => g.severity === 'critical')
  const highGaps = assessment.gaps.filter(g => g.severity === 'high')

  const donutData = [
    { name: 'Score', value: score },
    { name: 'Gap', value: 100 - score },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('organizationalResults.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('organizationalResults.pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/assessment/organizational')}>
            <Edit size={15} />
            {t('organizationalResults.editAnswersButton')}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(t('organizationalResults.resetConfirmation'))) {
                resetAssessment()
                navigate('/assessment/organizational')
              }
            }}
          >
            <RotateCcw size={15} />
            {t('organizationalResults.resetButton')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('organizationalResults.organizationalScoreLabel')}
          value={`${score}%`}
          accent={`text-${score >= 75 ? 'emerald' : score >= 50 ? 'yellow' : 'red'}-400`}
          icon={<Shield size={18} style={{ color: scoreColor }} />}
          trend={scoreLabel}
        />
        <StatCard
          label={t('organizationalResults.criticalGapsLabel')}
          value={criticalGaps.length}
          accent="text-red-500"
          icon={<AlertTriangle size={18} className="text-red-500" />}
        />
        <StatCard
          label={t('organizationalResults.highGapsLabel')}
          value={highGaps.length}
          accent="text-orange-400"
          icon={<AlertTriangle size={18} className="text-orange-400" />}
        />
        <StatCard
          label={t('organizationalResults.questionsAnsweredLabel')}
          value={`${assessment.answered}/${assessment.totalQuestions}`}
          icon={<CheckCircle size={18} className="text-primary" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card glow className="flex flex-col items-center">
          <h2 className="text-base font-bold text-foreground mb-4 self-start">
            {t('organizationalResults.overallScoreTitle')}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: scoreColor }}>
                {score}%
              </span>
              <span className="text-xs font-semibold mt-1" style={{ color: scoreColor }}>
                {scoreLabel}
              </span>
            </div>
          </div>

          <div className={`mt-4 w-full p-3 rounded-lg border flex items-start gap-2 ${
            score >= 75 ? 'bg-emerald-50 border-emerald-200' :
            score >= 50 ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            {score >= 75 ? (
              <TrendingUp size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
            ) : (
              <TrendingDown size={14} className={`${score >= 50 ? 'text-amber-600' : 'text-red-600'} mt-0.5 flex-shrink-0`} />
            )}
            <p className={`text-xs ${
              score >= 75 ? 'text-emerald-700' :
              score >= 50 ? 'text-amber-700' :
              'text-red-700'
            }`}>
              {score >= 75
                ? t('organizationalResults.strongControlsMessage')
                : score >= 50
                ? t('organizationalResults.moderateControlsMessage')
                : t('organizationalResults.significantGapsMessage')}
            </p>
          </div>
        </Card>

        <Card className="col-span-2">
          <h2 className="text-base font-bold text-foreground mb-5">
            {t('organizationalResults.scoreBySectionTitle')}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={sectionScores}
              margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="section"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {sectionScores.map((entry, index) => (
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

          <div className="grid grid-cols-2 gap-3 mt-5">
            {sectionScores.map(c => (
              <div key={c.section} className="bg-muted rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground truncate">{c.section}</span>
                  <span className="text-xs font-bold" style={{
                    color: c.score >= 75 ? '#10b981' : c.score >= 50 ? '#f59e0b' : '#ef4444'
                  }}>
                    {c.score}%
                  </span>
                </div>
                <ProgressBar value={c.score} />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">{c.answered}/{c.total} {t('organizationalResults.answeredLabel')}</span>
                  <span className="text-xs text-red-600">{c.critical}{t('organizationalResults.criticalAbbrev')} {c.high}{t('organizationalResults.highAbbrev')} {c.medium}{t('organizationalResults.mediumAbbrev')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {assessment.gaps.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-foreground">
              {t('organizationalResults.gapsAndRecommendationsTitle')}
            </h2>
            <span className="text-sm text-muted-foreground">{t('organizationalResults.itemsCount', { count: assessment.gaps.length })}</span>
          </div>

          <div className="space-y-3">
            {assessment.gaps.map((gap, i) => (
              <div
                key={gap.questionId}
                className="p-4 rounded-lg bg-muted border border-border hover:border-border/80 transition-all"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <SeverityBadge severity={gap.severity} />
                      <span className="text-xs font-mono font-semibold text-primary/70">{gap.article}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{gap.section}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">{gap.question}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{t('organizationalResults.responseLabel')}</span>
                      <span className={gap.response === 'partial' ? 'text-amber-600' : 'text-red-600'}>
                        {gap.response === 'partial' ? t('organizationalResults.responsePartial') : t('organizationalResults.responseNo')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ml-9 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={13} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      {t('organizationalResults.recommendationLabel')}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700 leading-relaxed">{gap.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {assessment.gaps.length === 0 && assessment.answered > 0 && (
        <Card className="text-center py-12">
          <CheckCircle size={48} className="text-emerald-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">
            {t('organizationalResults.noGapsTitle')}
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('organizationalResults.noGapsDescription')}
          </p>
        </Card>
      )}

      <div className="flex items-center justify-center gap-3 pt-4">
        <Button variant="secondary" onClick={() => navigate('/')}>
          <Shield size={15} />
          {t('organizationalResults.viewDashboardButton')}
        </Button>
        <Button onClick={() => navigate('/reports')}>
          {t('organizationalResults.viewFullReportButton')} <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  )
}
