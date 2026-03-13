import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import { Card } from './ui'
import { getCountryDeadlines, type CountryDeadline } from '../services/api'

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

interface DeadlinesWidgetProps {
  countryCode: string | null
}

export default function DeadlinesWidget({ countryCode }: DeadlinesWidgetProps) {
  const { t } = useTranslation()
  const [deadlines, setDeadlines] = useState<CountryDeadline[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!countryCode) {
      setDeadlines([])
      return
    }
    setLoading(true)
    getCountryDeadlines(countryCode)
      .then(d => setDeadlines(d))
      .catch(() => setDeadlines([]))
      .finally(() => setLoading(false))
  }, [countryCode])

  if (!countryCode) return null
  if (loading) return null
  if (deadlines.length === 0) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-cyan-400" />
        <h3 className="text-sm font-bold font-syne text-white">{t('overview.deadlines')}</h3>
      </div>
      <div className="space-y-2">
        {deadlines.map(d => {
          const days = daysUntil(d.deadlineDate)
          const isPast = days < 0
          const isUrgent = days >= 0 && days <= 30

          return (
            <div
              key={d.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                isPast
                  ? 'bg-red-500/10 border-red-500/20'
                  : isUrgent
                  ? 'bg-orange-500/10 border-orange-500/20'
                  : 'bg-navy-900/40 border-navy-800'
              }`}
            >
              <div className="mt-0.5">
                {isPast ? (
                  <AlertTriangle size={14} className="text-red-400" />
                ) : (
                  <Clock size={14} className={isUrgent ? 'text-orange-400' : 'text-navy-400'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{d.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-[#94b4d1]">{d.deadlineDate}</span>
                  <span className={`text-[10px] font-semibold ${
                    isPast ? 'text-red-400' : isUrgent ? 'text-orange-400' : 'text-[#94b4d1]'
                  }`}>
                    {isPast
                      ? t('overview.deadlinePassed')
                      : t('overview.daysRemaining', { days })
                    }
                  </span>
                </div>
                {d.legalReference && (
                  <span className="text-[10px] text-[#CBD8E8] mt-0.5 block">{d.legalReference}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
