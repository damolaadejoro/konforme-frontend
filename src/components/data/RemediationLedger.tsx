import React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Shield, ExternalLink } from 'lucide-react'

export type RemediationItem = {
  priority: 'P0' | 'P1' | 'P2'
  text: string
  due: string
  href: string
  source?: 'assessment' | 'control' | 'manual'
  sourceLabel?: string
}

type RemediationLedgerProps = {
  items: RemediationItem[]
  meanTimeToResolutionDays: number
}

function priorityBadge(p: RemediationItem['priority']): { bg: string; text: string } {
  switch (p) {
    case 'P0': return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' }
    case 'P1': return { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' }
    case 'P2': return { bg: 'bg-muted', text: 'text-muted-foreground' }
  }
}

function sourceIcon(source?: string) {
  if (source === 'assessment') return <ClipboardCheck size={12} className="text-blue-500" />
  if (source === 'control') return <Shield size={12} className="text-emerald-500" />
  return null
}

export default function RemediationLedger({ items, meanTimeToResolutionDays }: RemediationLedgerProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="divide-y divide-border">
        {items.map((item, i) => {
          const badge = priorityBadge(item.priority)
          const isLinked = item.href !== '/remediation'
          return (
            <Link
              key={i}
              to={item.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {item.priority}
              </span>
              <span className="flex-1 text-sm text-foreground truncate">{item.text}</span>
              {item.source && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  {sourceIcon(item.source)}
                  {item.sourceLabel || item.source}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex-shrink-0">{item.due}</span>
              {isLinked && (
                <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </Link>
          )
        })}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          Mean time to resolution: <span className="font-medium">{meanTimeToResolutionDays.toFixed(1)} days</span>
        </p>
      </div>
    </div>
  )
}
