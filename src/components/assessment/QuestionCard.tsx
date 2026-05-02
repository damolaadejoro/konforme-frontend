import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AssessmentQuestion, MaturityLevel } from '../../types/assessment'
import { MATURITY_LABELS, MATURITY_COLORS } from '../../types/assessment'
import MaturitySelector from './MaturitySelector'

interface QuestionCardProps {
  question: AssessmentQuestion
  maturityLevel: MaturityLevel
  notes: string
  onAnswer: (level: MaturityLevel, notes: string) => void
  index: number
  disabled?: boolean
}

const severityStyles: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
}

export default function QuestionCard({
  question,
  maturityLevel,
  notes,
  onAnswer,
  index,
  disabled,
}: QuestionCardProps) {
  const { t } = useTranslation()
  const [showGuidance, setShowGuidance] = useState(false)
  const [localNotes, setLocalNotes] = useState(notes)

  const qText = t(`questions.${question.id}.question`, { defaultValue: question.question })
  const qDesc = t(`questions.${question.id}.description`, { defaultValue: question.description })
  const qGuidance = t(`questions.${question.id}.guidance`, { defaultValue: question.guidance })
  const isAnswered = maturityLevel !== undefined

  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isAnswered
          ? 'bg-card border-border'
          : 'bg-muted/30 border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                severityStyles[question.severity] || 'bg-muted text-muted-foreground'
              }`}
            >
              {question.severity}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{question.id}</span>
            {isAnswered && maturityLevel !== null && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${MATURITY_COLORS[maturityLevel]}15`,
                  color: MATURITY_COLORS[maturityLevel],
                }}
              >
                Level {maturityLevel}: {MATURITY_LABELS[maturityLevel]}
              </span>
            )}
            {maturityLevel === null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                N/A
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium text-foreground leading-snug">
            {qText}
          </h4>
          <p className="text-sm text-foreground/60 mt-1 leading-relaxed">
            {qDesc}
          </p>
        </div>
      </div>

      {/* Maturity Selector */}
      <div className="ml-10 space-y-3">
        <MaturitySelector
          value={maturityLevel}
          onChange={(level) => onAnswer(level, localNotes)}
          disabled={disabled}
        />

        {/* Notes */}
        <textarea
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={() => {
            if (localNotes !== notes && isAnswered) {
              onAnswer(maturityLevel!, localNotes)
            }
          }}
          placeholder={t('assessment.notesPlaceholder')}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none"
          rows={1}
          disabled={disabled}
        />

        {/* Guidance accordion */}
        {qGuidance && (
          <button
            type="button"
            onClick={() => setShowGuidance(!showGuidance)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/70 transition-colors"
          >
            <Lightbulb size={12} />
            {showGuidance ? t('assessment.hideGuidance') : t('assessment.showGuidance')}
            {showGuidance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {showGuidance && (
          <div className="p-3 rounded-md bg-primary/5 border border-primary/15 text-sm text-foreground/70 leading-relaxed">
            {qGuidance}
          </div>
        )}
      </div>
    </div>
  )
}
