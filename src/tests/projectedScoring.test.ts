import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssessment } from '../hooks/useAssessment'
import { ASSESSMENT_QUESTIONS, ARTICLES, QUESTIONS_BY_ARTICLE } from '../data/assessmentQuestions'
import { SEVERITY_WEIGHTS } from '../types/assessment'
import type { QuestionResponse } from '../types/assessment'

// Mock the API module so the hook doesn't make real network calls
vi.mock('../services/api', () => ({
  submitAssessmentV2: vi.fn(),
  getAssessmentV2: vi.fn(),
  autoSaveResponse: vi.fn(),
  getStoredAuth: vi.fn(() => ({ accountId: null })),
  isConnected: vi.fn(() => false),
}))

const STORAGE_KEY = 'konforme_assessment_v2'

function buildStoredAssessment(responses: Record<string, QuestionResponse>) {
  return JSON.stringify({ responses, completedAt: null })
}

describe('Projected Assessment Scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
  })

  describe('projectedScore', () => {
    it('returns 0 when no questions are answered', () => {
      const { result } = renderHook(() => useAssessment())
      expect(result.current.projectedScore).toBe(0)
    })

    it('is lower than overallScore when only a few questions are answered at high maturity', () => {
      // Answer first 4 questions at level 4 (max maturity)
      const responses: Record<string, QuestionResponse> = {}
      ASSESSMENT_QUESTIONS.slice(0, 4).forEach(q => {
        responses[q.id] = {
          questionId: q.id,
          maturityLevel: 4,
          notes: '',
          evidenceRefs: [],
        }
      })

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      const { result } = renderHook(() => useAssessment())

      // overallScore only considers answered questions — should be 100%
      expect(result.current.overallScore).toBe(100)
      // projectedScore includes unanswered as 0 — should be much lower
      expect(result.current.projectedScore).toBeLessThan(result.current.overallScore)
      expect(result.current.projectedScore).toBeGreaterThan(0)
    })

    it('equals overallScore when all questions are answered', () => {
      const responses: Record<string, QuestionResponse> = {}
      ASSESSMENT_QUESTIONS.forEach(q => {
        responses[q.id] = {
          questionId: q.id,
          maturityLevel: 3,
          notes: '',
          evidenceRefs: [],
        }
      })

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      const { result } = renderHook(() => useAssessment())
      expect(result.current.projectedScore).toBe(result.current.overallScore)
    })

    it('excludes N/A questions from projected max (same as overallScore)', () => {
      // Answer 2 questions: one at level 4, one as N/A
      const q1 = ASSESSMENT_QUESTIONS[0]
      const q2 = ASSESSMENT_QUESTIONS[1]
      const responses: Record<string, QuestionResponse> = {
        [q1.id]: { questionId: q1.id, maturityLevel: 4, notes: '', evidenceRefs: [] },
        [q2.id]: { questionId: q2.id, maturityLevel: null, notes: '', evidenceRefs: [] }, // N/A
      }

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      const { result } = renderHook(() => useAssessment())

      // N/A should be excluded from both scores' max weight
      // projectedScore should still be > 0 because q1 is answered
      expect(result.current.projectedScore).toBeGreaterThan(0)
      // projectedScore should be higher than if N/A were counted as 0
      // (since N/A is excluded from denominator, not counted against you)
    })

    it('calculates correct projected score for known inputs', () => {
      // Answer the first question at level 4 — we can calculate exactly
      const q = ASSESSMENT_QUESTIONS[0]
      const responses: Record<string, QuestionResponse> = {
        [q.id]: { questionId: q.id, maturityLevel: 4, notes: '', evidenceRefs: [] },
      }

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      // Calculate expected: earned = (4/4) * weight, max = sum of ALL question weights
      const earnedWeight = SEVERITY_WEIGHTS[q.severity]
      const totalWeight = ASSESSMENT_QUESTIONS.reduce(
        (sum, q) => sum + SEVERITY_WEIGHTS[q.severity], 0
      )
      const expectedScore = Math.round((earnedWeight / totalWeight) * 100 * 10) / 10

      const { result } = renderHook(() => useAssessment())
      expect(result.current.projectedScore).toBe(expectedScore)
    })
  })

  describe('projectedArticleScores', () => {
    it('shows 0% for articles with no answered questions', () => {
      const { result } = renderHook(() => useAssessment())

      result.current.projectedArticleScores.forEach(art => {
        expect(art.score).toBe(0)
      })
    })

    it('shows projected score per article with unanswered counting as 0', () => {
      // Answer first question in first article at level 4
      const firstArticle = ARTICLES[0].article
      const articleQuestions = QUESTIONS_BY_ARTICLE[firstArticle]
      const q = articleQuestions[0]

      const responses: Record<string, QuestionResponse> = {
        [q.id]: { questionId: q.id, maturityLevel: 4, notes: '', evidenceRefs: [] },
      }

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      const { result } = renderHook(() => useAssessment())

      const artProjected = result.current.projectedArticleScores.find(a => a.article === firstArticle)!
      const artAnswered = result.current.articleScores.find(a => a.article === firstArticle)!

      // Answered-only score should be 100% (one question at max maturity)
      expect(artAnswered.score).toBe(100)
      // Projected should be lower (other questions in article count as 0)
      if (articleQuestions.length > 1) {
        expect(artProjected.score).toBeLessThan(artAnswered.score)
      }
      expect(artProjected.score).toBeGreaterThan(0)
    })

    it('projected matches answered score when all article questions are answered', () => {
      const firstArticle = ARTICLES[0].article
      const articleQuestions = QUESTIONS_BY_ARTICLE[firstArticle]

      const responses: Record<string, QuestionResponse> = {}
      articleQuestions.forEach(q => {
        responses[q.id] = {
          questionId: q.id,
          maturityLevel: 3,
          notes: '',
          evidenceRefs: [],
        }
      })

      localStorage.getItem.mockImplementation((key: string) => {
        if (key === STORAGE_KEY) return buildStoredAssessment(responses)
        return null
      })

      const { result } = renderHook(() => useAssessment())

      const artProjected = result.current.projectedArticleScores.find(a => a.article === firstArticle)!
      const artAnswered = result.current.articleScores.find(a => a.article === firstArticle)!

      expect(artProjected.score).toBe(artAnswered.score)
    })

    it('returns scores for all articles', () => {
      const { result } = renderHook(() => useAssessment())
      expect(result.current.projectedArticleScores.length).toBe(ARTICLES.length)
    })
  })
})
