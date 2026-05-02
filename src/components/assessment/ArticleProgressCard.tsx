import React from 'react'
import type { ArticleScore } from '../../types/assessment'
import { ProgressBar } from '../ui'

interface ArticleProgressCardProps {
  articleScore: ArticleScore
  projectedScore: number
  isActive: boolean
  onClick: () => void
}

export default function ArticleProgressCard({ articleScore, projectedScore, isActive, onClick }: ArticleProgressCardProps) {
  const { article, title, answered, total } = articleScore
  const displayScore = projectedScore
  const color = displayScore >= 75 ? 'text-emerald-600' : displayScore >= 50 ? 'text-amber-600' : displayScore > 0 ? 'text-red-600' : 'text-muted-foreground'
  const progress = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isActive
          ? 'bg-card border-primary shadow-sm'
          : 'bg-card border-border hover:border-border/80 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-muted-foreground">{article}</span>
        <span className={`text-xs font-semibold ${color}`}>
          {displayScore}%
        </span>
      </div>
      <h4 className={`text-xs font-medium leading-snug mb-2 ${
        isActive ? 'text-primary' : 'text-foreground'
      }`}>
        {title}
      </h4>
      <div className="space-y-1">
        <ProgressBar
          value={progress}
          color={isActive ? 'bg-primary' : undefined}
          height="h-1"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">
            {answered}/{total} answered
          </span>
          {answered === total && answered > 0 && (
            <span className="text-[11px] text-emerald-600 font-medium">Complete</span>
          )}
        </div>
      </div>
    </button>
  )
}
