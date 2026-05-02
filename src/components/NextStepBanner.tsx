import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lightbulb, X } from 'lucide-react'
import { Button } from './ui'

interface Step {
  key: string
  label: string
  description: string
  action: string
  path: string
}

const DISMISS_KEY = 'konforme_banner_dismissed'
const COMPLETED_KEY = 'konforme_completed_steps'

function getCompletedSteps(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
  } catch {
    return []
  }
}

export default function NextStepBanner() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  )

  const steps: Step[] = [
    {
      key: 'assessment',
      label: t('nextStepBanner.assessmentLabel'),
      description: t('nextStepBanner.assessmentDescription'),
      action: t('nextStepBanner.assessmentAction'),
      path: '/assessment',
    },
    {
      key: 'scan',
      label: t('nextStepBanner.scanLabel'),
      description: t('nextStepBanner.scanDescription'),
      action: t('nextStepBanner.scanAction'),
      path: '/scan',
    },
    {
      key: 'tasks',
      label: t('nextStepBanner.tasksLabel'),
      description: t('nextStepBanner.tasksDescription'),
      action: t('nextStepBanner.tasksAction'),
      path: '/people-tasks',
    },
    {
      key: 'report',
      label: t('nextStepBanner.reportLabel'),
      description: t('nextStepBanner.reportDescription'),
      action: t('nextStepBanner.reportAction'),
      path: '/reports',
    },
  ]

  const completed = getCompletedSteps()
  const step = steps.find((s) => !completed.includes(s.key)) ?? null

  if (dismissed || !step) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="bg-card rounded-xl p-4 mb-6 border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
          <Lightbulb size={18} className="text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground">{step.label}</h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">{step.description}</p>
        </div>

        <Button size="sm" onClick={() => navigate(step.path)} className="flex-shrink-0">
          {step.action}
        </Button>

        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1"
          aria-label={t('nextStepBanner.dismissAriaLabel')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
