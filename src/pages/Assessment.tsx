import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, ChevronRight, RotateCcw, Send, ChevronLeft } from 'lucide-react'
import { Card, ProgressBar, InfoTooltip } from '../components/ui'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
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
    nationalRefMap,
    additionalQuestions,
  } = useAssessment()

  const [activeArticle, setActiveArticle] = useState(ARTICLES[0].article)
  const [showSummary, setShowSummary] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-navy border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isComplete || showSummary) {
    return (
      <PageContainer>
        <PageHeader
          title={t('assessment.complete')}
          description={t('assessment.completeSubtitle')}
          actions={
            <>
              <Button variant="secondary" onClick={() => { setShowSummary(false); if (isComplete) resetAssessment(); }}>
                <RotateCcw size={14} />
                {isComplete ? t('assessment.newAssessment') : t('assessment.backToQuestions')}
              </Button>
              <Button onClick={() => navigate('/assessment/history')}>
                {t('assessment.viewHistory')} <ChevronRight size={14} />
              </Button>
            </>
          }
        />
        <PageContent className="space-y-6">
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
        </PageContent>
      </PageContainer>
    )
  }

  const activeQuestions = QUESTIONS_BY_ARTICLE[activeArticle] || []
  const activeIndex = ARTICLES.findIndex(a => a.article === activeArticle)

  return (
    <PageContainer>
      <PageHeader
        title={t('assessment.title')}
        description={t('assessment.maturitySubtitle')}
        actions={
          <>
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
          </>
        }
      />
      <PageContent className="space-y-6">
        {/* Progress banner */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-navy" />
              <span className="text-sm font-medium text-foreground">
                {t('assessment.progress', { answered: answeredCount, total: totalQuestions })}
              </span>
            </div>
            <span className="text-sm font-semibold text-navy flex items-center gap-1">
              {progressPercent}%
              <InfoTooltip content={t('assessment.percentComplete')} size={12} />
            </span>
          </div>
          <ProgressBar value={progressPercent} />
          {answeredCount > 0 && (
            <div className="mt-2">
              <p className="text-sm text-muted-foreground">
                {t('assessment.currentScore')} <span className="font-semibold text-foreground">{projectedScore}%</span>
                <InfoTooltip content={t('assessment.currentScoreTooltip')} size={12} className="ml-1" />
              </p>
            </div>
          )}
        </Card>

        {/* Main content: sidebar + questions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Article navigation sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
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
                <span className="text-xs font-mono text-navy">{activeArticle}</span>
                <h2 className="text-lg font-semibold text-foreground">
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
              const countryRef = nationalRefMap[q.id]
              return (
                <div key={q.id}>
                  {countryRef?.nationalLegalReference && (
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {countryRef.nationalLegalReference}
                      </span>
                    </div>
                  )}
                  <QuestionCard
                    question={q}
                    maturityLevel={resp?.maturityLevel}
                    notes={resp?.notes || ''}
                    onAnswer={(level, notes) => answerQuestion(q.id, level, notes)}
                    index={i}
                  />
                </div>
              )
            })}

            {/* Country-specific additional questions */}
            {additionalQuestions.filter(q => q.article === activeArticle).length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {t('assessment.nationalRequirement', 'National Requirement')}
                  </span>
                  <span className="text-xs text-muted-foreground">{t('assessment.countrySpecificQuestions', 'Country-specific questions')}</span>
                </div>
                {additionalQuestions
                  .filter(q => q.article === activeArticle)
                  .map((q, i) => {
                    const resp = responses[q.id]
                    return (
                      <div key={q.id} className="mb-4">
                        {q.nationalLegalReference && (
                          <div className="mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              {q.nationalLegalReference}
                            </span>
                          </div>
                        )}
                        <QuestionCard
                          question={q}
                          maturityLevel={resp?.maturityLevel}
                          notes={resp?.notes || ''}
                          onAnswer={(level, notes) => answerQuestion(q.id, level, notes)}
                          index={activeQuestions.length + i}
                        />
                      </div>
                    )
                  })}
              </div>
            )}

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
      </PageContent>
    </PageContainer>
  )
}
