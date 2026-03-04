import { useNavigate } from 'react-router-dom'
import { FlaskConical, Cloud, ClipboardCheck, ChevronRight } from 'lucide-react'
import { Card, Button } from '../components/ui'
import Logo from '../components/layout/Logo'

const cards = [
  {
    title: 'Run a Demo Assessment',
    description: 'See how Konforme works with sample data. Takes about 2 minutes — no setup required.',
    action: 'Try the Demo',
    path: '/assessment?demo=true',
    icon: FlaskConical,
    accent: 'text-purple-400',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
  },
  {
    title: 'Connect Your AWS Account',
    description: 'Scan your infrastructure automatically to populate technical controls and identify gaps.',
    action: 'Connect AWS',
    path: '/scan',
    icon: Cloud,
    accent: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10 border-cyan-500/20',
  },
  {
    title: 'Start the NIS2 Assessment',
    description: 'Answer questions about your organisation\'s policies, processes, and technical measures.',
    action: 'Begin Assessment',
    path: '/assessment',
    icon: ClipboardCheck,
    accent: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
  },
] as const

export default function GetStarted() {
  const navigate = useNavigate()

  const handleSelect = (path: string) => {
    localStorage.setItem('konforme_onboarded', 'true')
    navigate(path)
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
              <Card key={card.title} className="flex flex-col hover:border-cyan-500/40 transition-all">
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
                  onClick={() => handleSelect(card.path)}
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
