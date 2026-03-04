import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, X } from 'lucide-react'
import { Button } from './ui'

interface Step {
  key: string
  label: string
  description: string
  action: string
  path: string
}

const steps: Step[] = [
  {
    key: 'assessment',
    label: 'Complete the NIS2 Assessment',
    description: 'Answer questions about your organisation to get your first compliance score.',
    action: 'Start Assessment',
    path: '/assessment',
  },
  {
    key: 'scan',
    label: 'Connect Your AWS Account',
    description: 'Auto-scan your infrastructure to populate technical controls.',
    action: 'Connect AWS',
    path: '/scan',
  },
  {
    key: 'tasks',
    label: 'Assign People Tasks',
    description: 'Delegate compliance tasks to team members and track progress.',
    action: 'Manage Tasks',
    path: '/people-tasks',
  },
  {
    key: 'report',
    label: 'Generate Your First Report',
    description: 'Export a PDF audit report to share with stakeholders or auditors.',
    action: 'Go to Reports',
    path: '/reports',
  },
]

const DISMISS_KEY = 'konforme_banner_dismissed'
const COMPLETED_KEY = 'konforme_completed_steps'

function getCompletedSteps(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) || '[]')
  } catch {
    return []
  }
}

function getNextStep(): Step | null {
  const completed = getCompletedSteps()
  return steps.find((s) => !completed.includes(s.key)) ?? null
}

export default function NextStepBanner() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  )

  const step = getNextStep()

  if (dismissed || !step) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="glass-card rounded-xl p-4 mb-6 border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-transparent">
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
          <Lightbulb size={18} className="text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white">{step.label}</h3>
          <p className="text-[13px] text-[#94b4d1] mt-0.5">{step.description}</p>
        </div>

        <Button size="sm" onClick={() => navigate(step.path)} className="flex-shrink-0">
          {step.action}
        </Button>

        <button
          onClick={handleDismiss}
          className="text-navy-400 hover:text-white transition-colors flex-shrink-0 p-1"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
