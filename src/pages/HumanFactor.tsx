import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  CheckCircle,
  Circle,
  MinusCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Info,
  Shield,
  BarChart3,
} from 'lucide-react'
import { useHumanFactor } from '../hooks/useHumanFactor'
import { humanFactorQuestions, categories } from '../data/humanFactorQuestions'
import { QuestionResponse } from '../types/humanFactor'
import { Card, Button, ProgressBar, SeverityBadge } from '../components/ui'

function ResponseButton({
  response,
  selected,
  onClick,
}: {
  response: QuestionResponse
  selected: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()

  const config = {
    yes: {
      icon: CheckCircle,
      label: t('humanFactor.responseYes'),
      color: selected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'border-border text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-600',
      iconColor: 'text-emerald-600',
    },
    partial: {
      icon: MinusCircle,
      label: t('humanFactor.responsePartial'),
      color: selected ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-600',
      iconColor: 'text-amber-600',
    },
    no: {
      icon: XCircle,
      label: t('humanFactor.responseNo'),
      color: selected ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'border-border text-muted-foreground hover:border-red-500/30 hover:text-red-600',
      iconColor: 'text-red-600',
    },
    na: {
      icon: Circle,
      label: t('humanFactor.responseNa'),
      color: selected ? 'bg-muted border-border text-muted-foreground' : 'border-border text-muted-foreground/60 hover:border-border/80 hover:text-muted-foreground',
      iconColor: 'text-muted-foreground',
    },
  }

  const cfg = config[response as keyof typeof config]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${cfg.color}`}
    >
      <Icon size={16} className={selected ? cfg.iconColor : ''} />
      {cfg.label}
    </button>
  )
}

function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: typeof humanFactorQuestions[0]
  answer: QuestionResponse
  onAnswer: (response: QuestionResponse) => void
}) {
  const { t } = useTranslation()
  const [showGuidance, setShowGuidance] = useState(false)

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <SeverityBadge severity={question.severity} />
            <span className="text-xs font-mono font-semibold text-primary/70">{question.article}</span>
          </div>
          <h3 className="text-base font-semibold text-foreground leading-snug">{question.question}</h3>
          <p className="text-sm text-foreground/60 mt-2 leading-relaxed">{question.description}</p>
        </div>
        {answer && answer !== null && (
          <div className="flex-shrink-0">
            {answer === 'yes' && <CheckCircle size={20} className="text-emerald-600" />}
            {answer === 'partial' && <MinusCircle size={20} className="text-amber-600" />}
            {answer === 'no' && <XCircle size={20} className="text-red-600" />}
            {answer === 'na' && <Circle size={20} className="text-muted-foreground" />}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ResponseButton response="yes" selected={answer === 'yes'} onClick={() => onAnswer('yes')} />
        <ResponseButton response="partial" selected={answer === 'partial'} onClick={() => onAnswer('partial')} />
        <ResponseButton response="no" selected={answer === 'no'} onClick={() => onAnswer('no')} />
        <ResponseButton response="na" selected={answer === 'na'} onClick={() => onAnswer('na')} />
      </div>

      {question.guidance && (
        <button
          onClick={() => setShowGuidance(!showGuidance)}
          className="flex items-center gap-2 text-xs text-primary hover:text-primary/70 transition-colors"
        >
          <Info size={13} />
          <span>{showGuidance ? t('humanFactor.hideGuidance') : t('humanFactor.showGuidance')}</span>
          {showGuidance ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      )}

      {showGuidance && question.guidance && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-sm text-foreground/70 leading-relaxed">
          {question.guidance}
        </div>
      )}
    </div>
  )
}

export default function HumanFactor() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { assessment, answers, answerQuestion, completeAssessment, progressPercent, isComplete } = useHumanFactor()
  const [expandedCategory, setExpandedCategory] = useState<string | null>(categories[0])

  const handleAnswer = (questionId: string, response: QuestionResponse) => {
    answerQuestion(questionId, response)
  }

  const handleComplete = () => {
    completeAssessment()
    navigate('/human-factor/results')
  }

  const allAnswered = assessment.answered === assessment.totalQuestions

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('humanFactor.pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('humanFactor.pageSubtitle')}
          </p>
        </div>
        {isComplete && (
          <Button variant="secondary" onClick={() => navigate('/human-factor/results')}>
            <BarChart3 size={16} />
            {t('humanFactor.viewResultsButton')}
          </Button>
        )}
      </div>

      <Card glow>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">{t('humanFactor.assessmentProgressTitle')}</h2>
          </div>
          <span className="text-sm font-semibold text-primary">
            {t('humanFactor.questionsCount', { answered: assessment.answered, total: assessment.totalQuestions })}
          </span>
        </div>
        <ProgressBar value={progressPercent} animated color="bg-primary" height="h-2.5" />
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-muted-foreground">{t('humanFactor.percentComplete', { percent: progressPercent })}</span>
          {allAnswered && !isComplete && (
            <Button size="sm" onClick={handleComplete}>
              {t('humanFactor.completeAssessmentButton')} <ChevronRight size={14} />
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <Info size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm leading-relaxed space-y-2">
            <p className="font-semibold text-foreground">{t('humanFactor.instructionsTitle')}</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-emerald-600">{t('humanFactor.instructionYes')}</strong> — {t('humanFactor.instructionYesDescription')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-amber-600">{t('humanFactor.instructionPartial')}</strong> — {t('humanFactor.instructionPartialDescription')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-red-600">{t('humanFactor.instructionNo')}</strong> — {t('humanFactor.instructionNoDescription')}</span>
              </li>
              <li className="flex items-start gap-2">
                <ChevronRight size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <span><strong className="text-muted-foreground">{t('humanFactor.instructionNa')}</strong> — {t('humanFactor.instructionNaDescription')}</span>
              </li>
            </ul>
            <p className="text-primary/70 text-xs mt-3">
              {t('humanFactor.autoSaveNote')}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {categories.map(category => {
          const categoryQuestions = humanFactorQuestions.filter(q => q.category === category)
          const categoryAnswered = categoryQuestions.filter(
            q => answers[q.id] && answers[q.id].response !== null
          ).length
          const isExpanded = expandedCategory === category

          return (
            <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users size={18} className="text-primary" />
                  <div className="text-left">
                    <h3 className="text-base font-bold text-foreground">{category}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('humanFactor.answeredOfTotal', { answered: categoryAnswered, total: categoryQuestions.length })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {categoryQuestions.map(q => {
                      const ans = answers[q.id]?.response
                      return (
                        <div
                          key={q.id}
                          className={`w-2 h-2 rounded-full ${
                            ans === 'yes' ? 'bg-emerald-400' :
                            ans === 'partial' ? 'bg-yellow-400' :
                            ans === 'no' ? 'bg-red-400' :
                            ans === 'na' ? 'bg-muted-foreground' :
                            'bg-border'
                          }`}
                        />
                      )
                    })}
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-primary" />
                  ) : (
                    <ChevronRight size={18} className="text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {categoryQuestions.map(q => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      answer={answers[q.id]?.response || null}
                      onAnswer={(response) => handleAnswer(q.id, response)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {allAnswered && !isComplete && (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <CheckCircle size={40} className="text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-foreground">{t('humanFactor.allQuestionsAnsweredTitle')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('humanFactor.allQuestionsAnsweredSubtitle')}
              </p>
            </div>
            <Button size="lg" onClick={handleComplete}>
              {t('humanFactor.completeAssessmentButton')} <ChevronRight size={16} />
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
