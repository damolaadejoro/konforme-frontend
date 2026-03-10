import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, ChevronRight, RotateCcw, Send, ChevronLeft } from 'lucide-react'
import { Card, Button, ProgressBar, InfoTooltip } from '../components/ui'
import { ARTICLES, QUESTIONS_BY_ARTICLE, ASSESSMENT_QUESTIONS } from '../data/assessmentQuestions'
import { useAssessment } from '../hooks/useAssessment'
import QuestionCard from '../components/assessment/QuestionCard'
import ArticleProgressCard from '../components/assessment/ArticleProgressCard'
import AssessmentSummary from '../components/assessment/AssessmentSummary'

export default function Assessment() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    responses,
    answerQuestion,
    completeAssessment,
    resetAssessment,
    isComplete,
    loading,
    submitting,
    overallScore,
    articleScores,
    projectedScore,
    projectedArticleScores,
    gaps,
    answeredCount,
    totalQuestions,
    progressPercent,
  } = useAssessment()

  const [activeArticle, setActiveArticle] = useState(ARTICLES[0].article)
  const [showSummary, setShowSummary] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isComplete || showSummary) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[26px] font-bold font-syne text-white">{t('assessment.complete')}</h1>
            <p className="text-[14px] text-[#CBD8E8] mt-1">
              {t('assessment.completeSubtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setShowSummary(false); if (isComplete) resetAssessment(); }}>
              <RotateCcw size={14} />
              {isComplete ? t('assessment.newAssessment') : t('assessment.backToQuestions')}
            </Button>
            <Button onClick={() => navigate('/assessment/history')}>
              {t('assessment.viewHistory')} <ChevronRight size={14} />
            </Button>
          </div>
        </div>

        <AssessmentSummary
          overallScore={overallScore}
          projectedScore={projectedScore}
          articleScores={articleScores}
          projectedArticleScores={projectedArticleScores}
          gaps={gaps}
          answeredCount={answeredCount}
          totalQuestions={totalQuestions}
          isComplete={isComplete}
        />
      </div>
    )
  }

  const activeQuestions = QUESTIONS_BY_ARTICLE[activeArticle] || []
  const activeIndex = ARTICLES.findIndex(a => a.article === activeArticle)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white flex items-center gap-2">
            {t('assessment.title')}
            <InfoTooltip content={t('assessment.tooltipInfo')} />
          </h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">
            {t('assessment.maturitySubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          {answeredCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => setShowSummary(true)}
            >
              {t('assessment.previewResults')}
            </Button>
          )}
          <Button
            onClick={async () => {
              await completeAssessment()
              setShowSummary(true)
            }}
            loading={submitting}
            disabled={answeredCount < totalQuestions}
          >
            <Send size={14} />
            {t('assessment.submit')}
          </Button>
        </div>
      </div>

      {/* Progress banner */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-cyan-400" />
            <span className="text-sm font-semibold text-white">
              {t('assessment.progress', { answered: answeredCount, total: totalQuestions })}
            </span>
          </div>
          <span className="text-sm font-bold text-cyan-400 flex items-center gap-1">
            {progressPercent}%
            <InfoTooltip content={t('assessment.percentComplete')} size={12} />
          </span>
        </div>
        <ProgressBar value={progressPercent} color="bg-cyan-500" height="h-2" />
        {answeredCount > 0 && (
          <div className="mt-2">
            <p className="text-sm text-[#94b4d1]">
              {t('assessment.currentScore')} <span className="font-bold text-white">{projectedScore}%</span>
              <InfoTooltip content={t('assessment.currentScoreTooltip')} size={12} className="ml-1" />
            </p>
          </div>
        )}
      </Card>

      {/* Main content: sidebar + questions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Article navigation sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider mb-3">
            {t('assessment.nis2Articles')}
          </h3>
          {ARTICLES.map(art => {
            const artScore = articleScores.find(s => s.article === art.article)
            const projArtScore = projectedArticleScores.find(s => s.article === art.article)
            return (
              <ArticleProgressCard
                key={art.id}
                articleScore={artScore || { article: art.article, title: art.title, score: 0, answered: 0, total: 4 }}
                projectedScore={projArtScore?.score ?? 0}
                isActive={activeArticle === art.article}
                onClick={() => setActiveArticle(art.article)}
              />
            )
          })}
        </div>

        {/* Questions panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Article header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-cyan-400">{activeArticle}</span>
              <h2 className="text-lg font-bold font-syne text-white">
                {ARTICLES.find(a => a.article === activeArticle)?.title}
              </h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={activeIndex === 0}
                onClick={() => setActiveArticle(ARTICLES[activeIndex - 1].article)}
              >
                <ChevronLeft size={14} /> {t('assessment.previous')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={activeIndex === ARTICLES.length - 1}
                onClick={() => setActiveArticle(ARTICLES[activeIndex + 1].article)}
              >
                {t('assessment.next')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* Question cards */}
          {activeQuestions.map((q, i) => {
            const resp = responses[q.id]
            return (
              <QuestionCard
                key={q.id}
                question={q}
                maturityLevel={resp?.maturityLevel}
                notes={resp?.notes || ''}
                onAnswer={(level, notes) => answerQuestion(q.id, level, notes)}
                index={i}
              />
            )
          })}

          {/* Navigation footer */}
          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              disabled={activeIndex === 0}
              onClick={() => setActiveArticle(ARTICLES[activeIndex - 1].article)}
            >
              <ChevronLeft size={14} /> {t('assessment.previousArticle')}
            </Button>
            {activeIndex < ARTICLES.length - 1 ? (
              <Button
                onClick={() => setActiveArticle(ARTICLES[activeIndex + 1].article)}
              >
                {t('assessment.nextArticle')} <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  if (answeredCount >= totalQuestions) {
                    await completeAssessment()
                  }
                  setShowSummary(true)
                }}
                loading={submitting}
              >
                <Send size={14} />
                {answeredCount >= totalQuestions ? t('assessment.submit') : t('assessment.previewResults')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
