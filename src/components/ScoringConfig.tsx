import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Scale, RotateCcw } from 'lucide-react'
import { Card, Button, InfoTooltip } from './ui'
import { getScoringConfig, updateScoringConfig, getCombinedScore, getStoredAuth, isConnected } from '../services/api'

function gradeColor(grade: string | null): string {
  if (!grade) return 'text-muted-foreground'
  if (grade === 'A') return 'text-emerald-600'
  if (grade === 'B') return 'text-blue-600'
  if (grade === 'C') return 'text-amber-600'
  if (grade === 'D') return 'text-orange-600'
  return 'text-red-600'
}

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score >= 90) return '#10b981'
  if (score >= 80) return '#3b82f6'
  if (score >= 70) return '#f59e0b'
  if (score >= 60) return '#f97316'
  return '#ef4444'
}

function computeGrade(score: number | null): string | null {
  if (score === null) return null
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

export default function ScoringConfig() {
  const { t } = useTranslation()

  // Saved state (from backend)
  const [savedTechnical, setSavedTechnical] = useState(60)
  const [savedOrganizational, setSavedOrganizational] = useState(40)

  // Editing state
  const [technical, setTechnical] = useState(60)

  // Current scores from backend
  const [techScore, setTechScore] = useState<number | null>(null)
  const [humanScore, setHumanScore] = useState<number | null>(null)

  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const organizational = 100 - technical
  const hasChanges = technical !== savedTechnical

  // Compute preview scores
  const computeOverall = useCallback((tw: number) => {
    const ow = 100 - tw
    if (techScore !== null && humanScore !== null) {
      return Math.round(techScore * (tw / 100) + humanScore * (ow / 100) * 10) / 10
    }
    if (techScore !== null) return techScore
    if (humanScore !== null) return humanScore
    return null
  }, [techScore, humanScore])

  const savedOverall = computeOverall(savedTechnical)
  const previewOverall = computeOverall(technical)
  const savedGrade = computeGrade(savedOverall)
  const previewGrade = computeGrade(previewOverall)

  // Load config + scores on mount
  useEffect(() => {
    async function load() {
      try {
        const config = await getScoringConfig()
        const tw = Math.round(config.technicalWeight * 100)
        setSavedTechnical(tw)
        setSavedOrganizational(100 - tw)
        setTechnical(tw)

        if (isConnected()) {
          const { accountId } = getStoredAuth()
          if (accountId) {
            const score = await getCombinedScore(accountId)
            setTechScore(score.technicalScore)
            setHumanScore(score.humanFactorScore)
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setTechnical(val)
    setSaveMessage(null)
  }

  const handleReset = () => {
    setTechnical(60)
    setSaveMessage(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      await updateScoringConfig(technical / 100, organizational / 100, 0)
      setSavedTechnical(technical)
      setSavedOrganizational(organizational)
      setSaveMessage({ type: 'success', text: t('settings.scoringSaved') })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : t('settings.scoringSaveError') })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Scale size={16} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">{t('settings.scoringConfig')}</h2>
        </div>
        <div className="h-24 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-2">
        <Scale size={16} className="text-primary" />
        <h2 className="text-base font-bold text-foreground">{t('settings.scoringConfig')}</h2>
        <InfoTooltip content={t('settings.scoringConfigDesc')} side="right" />
      </div>
      <p className="text-xs text-muted-foreground mb-5">{t('settings.scoringConfigDesc')}</p>

      {/* Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            {t('settings.technicalWeight')}
          </span>
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            {t('settings.organizationalWeight')}
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={technical}
            onChange={handleSliderChange}
            className="w-full h-2 rounded-full appearance-none cursor-pointer scoring-slider"
            style={{
              background: `linear-gradient(to right, #00C2D4 ${technical}%, #e2e8f0 ${technical}%)`,
            }}
          />
        </div>

        <div className="flex justify-between">
          <span className="text-lg font-bold text-primary">{technical}%</span>
          <span className="text-lg font-bold text-muted-foreground">{organizational}%</span>
        </div>
      </div>

      {/* Live preview — only when both scores exist and there are unsaved changes */}
      {(techScore !== null || humanScore !== null) && (
        <div className="mt-5 p-4 rounded-lg bg-muted border border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Current (saved) */}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                {hasChanges ? t('settings.before') : t('settings.currentScore')}
              </p>
              <p className="text-2xl font-bold" style={{ color: scoreColor(savedOverall) }}>
                {savedOverall !== null ? savedOverall.toFixed(1) : '—'}
              </p>
              <p className={`text-sm font-bold ${gradeColor(savedGrade)}`}>
                {savedGrade || '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {savedTechnical}/{savedOrganizational}
              </p>
            </div>

            {/* Preview (unsaved) */}
            {hasChanges && (
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {t('settings.after')}
                </p>
                <p className="text-2xl font-bold" style={{ color: scoreColor(previewOverall) }}>
                  {previewOverall !== null ? previewOverall.toFixed(1) : '—'}
                </p>
                <p className={`text-sm font-bold ${gradeColor(previewGrade)}`}>
                  {previewGrade || '—'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {technical}/{organizational}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
          {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset} disabled={technical === 60}>
          <RotateCcw size={14} />
          {t('settings.resetDefaults')}
        </Button>
      </div>

      {saveMessage && (
        <div className={`mt-3 p-3 rounded-lg text-xs ${
          saveMessage.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-600'
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {saveMessage.text}
        </div>
      )}

      {/* Slider thumb styling */}
      <style>{`
        .scoring-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00C2D4;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 194, 212, 0.4);
        }
        .scoring-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00C2D4;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(0, 194, 212, 0.4);
        }
      `}</style>
    </Card>
  )
}
