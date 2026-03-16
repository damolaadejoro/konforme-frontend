import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useControlsContext } from './ControlsContext'
import { useAssessment } from '../hooks/useAssessment'
import { getCombinedScore, isConnected, getStoredAuth, type CombinedScoreResponse } from '../services/api'

interface ScoreContextValue {
  /** Backend response (null if not fetched yet or not connected) */
  backendScore: CombinedScoreResponse | null
  /** Authoritative overall score — backend if available, else frontend fallback */
  overallScore: number
  /** Technical scan score */
  technicalScore: number
  /** Assessment/maturity score */
  assessmentScore: number
  /** Controls implementation score */
  controlsScore: number
  /** Re-fetch score from backend */
  refreshScore: () => void
  /** Fetch score filtered by a specific cloud account */
  fetchFilteredScore: (opts?: { awsAccountId?: string; credentialId?: string }) => Promise<CombinedScoreResponse | null>
}

const ScoreContext = createContext<ScoreContextValue | null>(null)

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const { selectedAwsAccountId } = useAuth()
  const { complianceScore } = useControlsContext()
  const { projectedScore: assessmentScoreRaw } = useAssessment()
  const [backendScore, setBackendScore] = useState<CombinedScoreResponse | null>(null)

  const fetchScore = useCallback(() => {
    if (isConnected()) {
      const { accountId } = getStoredAuth()
      if (accountId) {
        getCombinedScore(accountId, selectedAwsAccountId ? { awsAccountId: selectedAwsAccountId } : undefined)
          .then(setBackendScore)
          .catch(() => {})
      }
    }
  }, [selectedAwsAccountId])

  useEffect(() => {
    fetchScore()
  }, [fetchScore])

  const fetchFilteredScore = useCallback(async (opts?: { awsAccountId?: string; credentialId?: string }) => {
    if (!isConnected()) return null
    const { accountId } = getStoredAuth()
    if (!accountId) return null
    try {
      return await getCombinedScore(accountId, opts)
    } catch {
      return null
    }
  }, [])

  const technicalScore = backendScore?.technicalScore ?? 0
  const controlsScore = backendScore?.controlsScore ?? complianceScore.overall
  const assessmentScore = assessmentScoreRaw

  const overallScore = useMemo(() => {
    if (backendScore?.overallScore != null) {
      return backendScore.overallScore
    }
    // Frontend fallback: 3-pillar proportional weighting (use backend weights if available)
    const wTech = backendScore?.technicalWeight ?? 0.40
    const wAssess = backendScore?.assessmentWeight ?? 0.35
    const wControls = backendScore?.controlsWeight ?? 0.25
    const pillars: { score: number; weight: number }[] = []
    if (technicalScore > 0) pillars.push({ score: technicalScore, weight: wTech })
    if (assessmentScore > 0) pillars.push({ score: assessmentScore, weight: wAssess })
    if (controlsScore > 0) pillars.push({ score: controlsScore, weight: wControls })

    const totalWeight = pillars.reduce((s, p) => s + p.weight, 0)
    return totalWeight > 0
      ? Math.round(pillars.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight)
      : 0
  }, [backendScore, technicalScore, assessmentScore, controlsScore])

  const value = useMemo<ScoreContextValue>(() => ({
    backendScore,
    overallScore,
    technicalScore,
    assessmentScore,
    controlsScore,
    refreshScore: fetchScore,
    fetchFilteredScore,
  }), [backendScore, overallScore, technicalScore, assessmentScore, controlsScore, fetchScore, fetchFilteredScore])

  return (
    <ScoreContext.Provider value={value}>
      {children}
    </ScoreContext.Provider>
  )
}

export function useScore(): ScoreContextValue {
  const ctx = useContext(ScoreContext)
  if (!ctx) {
    throw new Error('useScore must be used within a ScoreProvider')
  }
  return ctx
}
