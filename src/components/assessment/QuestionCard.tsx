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
  critical: 'bg-red-500/15 text-red-400 border-red-500/25',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
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

  // Translated question text — falls back to source data if no translation key exists
  const qText = t(`questions.${question.id}.question`, { defaultValue: question.question })
  const qDesc = t(`questions.${question.id}.description`, { defaultValue: question.description })
  const qGuidance = t(`questions.${question.id}.guidance`, { defaultValue: question.guidance })
  const isAnswered = maturityLevel !== undefined

  // Sync localNotes when notes prop changes (e.g. navigating between articles)
  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isAnswered
          ? 'bg-navy-900/40 border-navy-700'
          : 'bg-navy-900/20 border-navy-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-navy-800 flex items-center justify-center text-xs font-semibold text-navy-300">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                severityStyles[question.severity]
              }`}
            >
              {question.severity}
            </span>
            <span className="text-xs text-navy-400 font-mono">{question.id}</span>
            {isAnswered && maturityLevel !== null && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${MATURITY_COLORS[maturityLevel]}20`,
                  color: MATURITY_COLORS[maturityLevel],
                }}
              >
                Level {maturityLevel}: {MATURITY_LABELS[maturityLevel]}
              </span>
            )}
            {maturityLevel === null && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-700/50 text-navy-400">
                N/A
              </span>
            )}
          </div>
          <h4 className="text-[15px] font-semibold text-white leading-snug">
            {qText}
          </h4>
          <p className="text-[13px] text-[#94b4d1] mt-1 leading-relaxed">
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
          className="w-full bg-navy-900/60 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-navy-500 focus:outline-none focus:border-cyan-500/50 resize-none"
          rows={1}
          disabled={disabled}
        />

        {/* Guidance accordion */}
        {qGuidance && (
          <button
            type="button"
            onClick={() => setShowGuidance(!showGuidance)}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Lightbulb size={12} />
            {showGuidance ? t('assessment.hideGuidance') : t('assessment.showGuidance')}
            {showGuidance ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
        {showGuidance && (
          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-[13px] text-cyan-200 leading-relaxed">
            {qGuidance}
          </div>
        )}
      </div>
    </div>
  )
}
