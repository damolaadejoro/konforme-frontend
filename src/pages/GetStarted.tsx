import { useNavigate } from 'react-router-dom'
import { FlaskConical, Cloud, ClipboardCheck, ChevronRight } from 'lucide-react'
import { Card, Button } from '../components/ui'
import Logo from '../components/layout/Logo'
import { ASSESSMENT_QUESTIONS } from '../data/assessmentQuestions'
import type { QuestionResponse, MaturityLevel } from '../types/assessment'

/**
 * Generate realistic demo assessment responses.
 * Critical questions get a mix of 2-3, high questions 2-4, medium questions 3-4.
 * This produces an overall score around 55-65% — enough to show value and gaps.
 */
function generateDemoResponses(): Record<string, QuestionResponse> {
  // Deterministic but varied maturity levels per question severity
  const levelsBySeverity: Record<string, MaturityLevel[]> = {
    critical: [2, 3, 1, 3, 2, 3, 2, 1, 3, 2, 3, 2, 3, 2, 1, 3],
    high:     [3, 2, 4, 3, 2, 3, 4, 2, 3, 2, 4, 3, 2, 3, 4, 2, 3, 2, 4, 3],
    medium:   [3, 4, 3, 4, 3],
  }

  const counters: Record<string, number> = { critical: 0, high: 0, medium: 0 }

  const responses: Record<string, QuestionResponse> = {}
  for (const q of ASSESSMENT_QUESTIONS) {
    const levels = levelsBySeverity[q.severity]
    const idx = counters[q.severity] % levels.length
    counters[q.severity]++

    responses[q.id] = {
      questionId: q.id,
      maturityLevel: levels[idx],
      notes: '',
      evidenceRefs: [],
      answeredAt: new Date().toISOString(),
    }
  }
  return responses
}

const cards = [
  {
    key: 'demo',
    title: 'Run a Demo Assessment',
    description: 'See how Konforme works with sample data. Instantly populates your dashboard with realistic scores.',
    action: 'Try the Demo',
    icon: FlaskConical,
    accent: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    key: 'scan',
    title: 'Connect Your AWS Account',
    description: 'Scan your infrastructure automatically to populate technical controls and identify gaps.',
    action: 'Connect AWS',
    icon: Cloud,
    accent: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    key: 'assessment',
    title: 'Start the NIS2 Assessment',
    description: 'Answer questions about your organisation\'s policies, processes, and technical measures.',
    action: 'Begin Assessment',
    icon: ClipboardCheck,
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
  },
] as const

export default function GetStarted() {
  const navigate = useNavigate()

  const handleSelect = (key: string) => {
    localStorage.setItem('konforme_onboarded', 'true')

    if (key === 'demo') {
      // Pre-fill assessment with sample answers so the dashboard shows real scores
      const demoData = {
        responses: generateDemoResponses(),
        completedAt: null,
      }
      localStorage.setItem('konforme_assessment_v2', JSON.stringify(demoData))
      navigate('/')
      return
    }

    const paths: Record<string, string> = {
      scan: '/scan',
      assessment: '/assessment',
    }
    navigate(paths[key] || '/')
  }

  const handleSkip = () => {
    localStorage.setItem('konforme_onboarded', 'true')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold font-syne text-white">Welcome to Konforme</h1>
          <p className="text-sm text-navy-400 mt-1 max-w-md mx-auto">
            Get your first NIS2 compliance result in minutes. Pick the option that fits your situation best.
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.key} className="flex flex-col hover:border-cyan-500/40 transition-all">
                <div className={`p-3 rounded-lg border ${card.iconBg} w-fit mb-4`}>
                  <Icon size={24} className={card.accent} />
                </div>
                <h2 className="text-[15px] font-semibold text-white mb-2">{card.title}</h2>
                <p className="text-[13px] text-[#94b4d1] leading-relaxed flex-1 mb-4">
                  {card.description}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleSelect(card.key)}
                >
                  {card.action}
                  <ChevronRight size={14} />
                </Button>
              </Card>
            )
          })}
        </div>

        {/* Skip link */}
        <div className="text-center mt-6">
          <button
            onClick={handleSkip}
            className="text-sm text-navy-400 hover:text-white transition-colors"
          >
            Skip for now — go to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
