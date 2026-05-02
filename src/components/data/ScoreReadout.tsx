import React from 'react'

type ScoreReadoutProps = {
  aggregate: number
  technical: number
  technicalChecks: number
  technicalFailures: number
  human: number
  humanQuestions: number
  humanCompletedBy: number
  humanTotalStaff: number
  delta: number
  grade: 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F'
  maturityLevel: 1 | 2 | 3 | 4 | 5
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function progressColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function deltaLabel(d: number): string {
  if (d > 0) return `+${d.toFixed(1)}`
  if (d < 0) return `${d.toFixed(1)}`
  return '0.0'
}

function deltaColor(d: number): string {
  if (d > 0) return 'text-emerald-600'
  if (d < 0) return 'text-red-600'
  return 'text-muted-foreground'
}

export default function ScoreReadout({
  aggregate,
  technical,
  technicalChecks,
  technicalFailures,
  human,
  humanQuestions,
  humanCompletedBy,
  humanTotalStaff,
  delta,
  grade,
  maturityLevel,
}: ScoreReadoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Aggregate */}
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Overall Score</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-5xl font-semibold ${scoreColor(aggregate)}`}>
            {aggregate.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs font-medium text-foreground/80">Grade {grade}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">Level {maturityLevel}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className={`text-xs font-medium ${deltaColor(delta)}`}>{deltaLabel(delta)}</span>
        </div>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColor(aggregate)}`}
            style={{ width: `${Math.min(aggregate, 100)}%` }}
          />
        </div>
      </div>

      {/* Technical */}
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Technical</p>
        <span className={`text-5xl font-semibold ${scoreColor(technical)}`}>
          {technical}
        </span>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">{technicalChecks} checks</span>
          {technicalFailures > 0 && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-xs font-medium text-red-600">
                {technicalFailures} failure{technicalFailures !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColor(technical)}`}
            style={{ width: `${Math.min(technical, 100)}%` }}
          />
        </div>
      </div>

      {/* Human Factor */}
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Human Factor</p>
        <span className={`text-5xl font-semibold ${scoreColor(human)}`}>
          {human}
        </span>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">{humanQuestions} questions</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{humanCompletedBy}/{humanTotalStaff} staff</span>
        </div>
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColor(human)}`}
            style={{ width: `${Math.min(human, 100)}%` }}
          />
        </div>
      </div>

      {/* Delta */}
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Change vs Q1</p>
        <span className={`text-5xl font-semibold ${deltaColor(delta)}`}>
          {deltaLabel(delta)}
        </span>
        <p className="text-xs text-muted-foreground mt-3">
          {delta > 0 ? 'Score improved this quarter' : delta < 0 ? 'Score declined this quarter' : 'No change this quarter'}
        </p>
      </div>
    </div>
  )
}
