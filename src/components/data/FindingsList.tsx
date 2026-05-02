import React from 'react'
import { Link } from 'react-router-dom'

type Finding = {
  id: string
  severity: 'High' | 'Medium' | 'Low'
  articleCode: string
  detectedAt: string
  title: string
  body: string
  owner?: string
  targetDate?: string
  href: string
}

type FindingsListProps = {
  findings: Finding[]
  totalOpen: number
}

function severityBadge(s: Finding['severity']): { bg: string; text: string } {
  switch (s) {
    case 'High': return { bg: 'bg-red-50', text: 'text-red-700' }
    case 'Medium': return { bg: 'bg-amber-50', text: 'text-amber-700' }
    case 'Low': return { bg: 'bg-muted', text: 'text-foreground/70' }
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FindingsList({ findings, totalOpen }: FindingsListProps) {
  const remaining = totalOpen - findings.length

  return (
    <div className="space-y-3">
      {findings.map((f) => {
        const badge = severityBadge(f.severity)
        return (
          <Link
            key={f.id}
            to={f.href}
            className="block bg-card border border-border rounded-lg p-4 hover:border-border/80 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {f.severity}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{f.id}</span>
                  <span className="text-xs text-muted-foreground">Art. {f.articleCode}</span>
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{f.body}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground">{formatDate(f.detectedAt)}</p>
                {f.owner && <p className="text-xs text-muted-foreground mt-1">{f.owner}</p>}
              </div>
            </div>
            {f.targetDate && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">Target: {formatDate(f.targetDate)}</p>
              </div>
            )}
          </Link>
        )
      })}

      {remaining > 0 && (
        <div className="text-center pt-2">
          <Link
            to="/scan/findings"
            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            View all {totalOpen} findings →
          </Link>
        </div>
      )}
    </div>
  )
}
