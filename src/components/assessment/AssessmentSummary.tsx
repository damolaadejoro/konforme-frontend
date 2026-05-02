import React from 'react'
import { AlertTriangle, Target } from 'lucide-react'
import type { ArticleScore, AssessmentGap } from '../../types/assessment'
import { MATURITY_LABELS, MATURITY_COLORS } from '../../types/assessment'
import { Card, ProgressBar } from '../ui'

interface AssessmentSummaryProps {
  overallScore: number
  projectedScore: number
  articleScores: ArticleScore[]
  projectedArticleScores: ArticleScore[]
  gaps: AssessmentGap[]
  answeredCount: number
  totalQuestions: number
  isComplete: boolean
}

export default function AssessmentSummary({
  overallScore,
  projectedScore,
  articleScores,
  projectedArticleScores,
  gaps,
  answeredCount,
  totalQuestions,
  isComplete,
}: AssessmentSummaryProps) {
  const allAnswered = answeredCount >= totalQuestions
  const primaryScore = allAnswered ? overallScore : projectedScore
  const displayArticleScores = allAnswered ? articleScores : projectedArticleScores
  const scoreColor = primaryScore >= 75 ? 'text-emerald-600' : primaryScore >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreLabel = primaryScore >= 75 ? 'Strong' : primaryScore >= 50 ? 'Moderate' : 'Needs Improvement'
  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  const highGaps = gaps.filter(g => g.severity === 'high')

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <div className="text-center py-4">
          <div className={`text-5xl font-semibold mb-2 ${scoreColor}`}>
            {primaryScore}%
          </div>
          <div className={`text-lg font-medium mb-1 ${scoreColor}`}>
            {scoreLabel}
          </div>
          <p className="text-sm text-muted-foreground">
            {answeredCount} of {totalQuestions} questions assessed
          </p>
          {!allAnswered && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">
                {answeredCount} of {totalQuestions} questions answered — unanswered count as not addressed
              </p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-semibold text-red-600">{criticalGaps.length}</div>
            <div className="text-xs text-muted-foreground">Critical Gaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-orange-600">{highGaps.length}</div>
            <div className="text-xs text-muted-foreground">High Gaps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold text-emerald-600">
              {displayArticleScores.filter(a => a.score >= 75).length}
            </div>
            <div className="text-xs text-muted-foreground">Strong Articles</div>
          </div>
        </div>
      </Card>

      {/* Per-article scores */}
      <Card>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Article Maturity Scores
        </h3>
        <div className="space-y-3">
          {displayArticleScores.map(art => {
            const artColor = art.score >= 75 ? 'text-emerald-600' : art.score >= 50 ? 'text-amber-600' : art.score > 0 ? 'text-red-600' : 'text-muted-foreground'
            return (
              <div key={art.article} className="p-3 rounded-lg bg-muted border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">{art.article}</span>
                    <h4 className="text-sm font-medium text-foreground">{art.title}</h4>
                  </div>
                  <span className={`text-lg font-semibold ${artColor}`}>
                    {art.score}%
                  </span>
                </div>
                <ProgressBar
                  value={art.score}
                  color={art.score >= 75 ? 'bg-emerald-500' : art.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                  height="h-1.5"
                />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Gap list */}
      {gaps.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 className="text-base font-semibold text-foreground">
              Gaps & Recommendations ({gaps.length})
            </h3>
          </div>
          <div className="space-y-3">
            {gaps.slice(0, 10).map((gap, i) => {
              const levelColor = gap.maturityLevel !== null ? MATURITY_COLORS[gap.maturityLevel] : '#94a3b8'
              const levelLabel = gap.maturityLevel !== null ? MATURITY_LABELS[gap.maturityLevel] : 'N/A'
              const sevStyle = gap.severity === 'critical'
                ? 'bg-red-50 text-red-700'
                : gap.severity === 'high'
                ? 'bg-orange-50 text-orange-700'
                : 'bg-amber-50 text-amber-700'

              return (
                <div key={gap.questionId} className="p-3 rounded-lg bg-muted border border-border/50">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs font-medium text-foreground/70">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sevStyle}`}>
                          {gap.severity}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{gap.article}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${levelColor}15`, color: levelColor }}>
                          Level {gap.maturityLevel}: {levelLabel}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium mb-2">{gap.question}</p>
                      <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-100">
                        <div className="flex items-start gap-1.5">
                          <Target size={12} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-emerald-700 leading-relaxed">{gap.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {gaps.length > 10 && (
              <p className="text-center text-sm text-muted-foreground">
                + {gaps.length - 10} more gaps
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
