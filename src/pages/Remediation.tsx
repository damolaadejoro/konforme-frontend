import React, { useState, useMemo } from 'react'
import { useRemediation } from '../hooks/useRemediation'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import RemediationLedger from '../components/data/RemediationLedger'

type PriorityFilter = 'all' | 'P0' | 'P1' | 'P2'

function priorityToP(p: string): 'P0' | 'P1' | 'P2' {
  if (p === 'critical') return 'P0'
  if (p === 'high') return 'P1'
  return 'P2'
}

function formatDue(d: string | null | undefined): string {
  if (!d) return '—'
  const date = new Date(d)
  const now = new Date()
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff <= 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function priorityVariant(p: PriorityFilter): 'danger' | 'warning' | 'muted' {
  switch (p) {
    case 'P0': return 'danger'
    case 'P1': return 'warning'
    case 'P2': return 'muted'
    default: return 'muted'
  }
}

export default function Remediation() {
  const { tasks, loading } = useRemediation()
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [showDueThisWeek, setShowDueThisWeek] = useState(false)

  const openTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'open' || t.status === 'in_progress')
      .filter(t => {
        if (priorityFilter !== 'all' && priorityToP(t.priority) !== priorityFilter) return false
        if (showDueThisWeek && t.dueDate) {
          const due = new Date(t.dueDate)
          const now = new Date()
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (due > weekFromNow) return false
        }
        return true
      })
  }, [tasks, priorityFilter, showDueThisWeek])

  const resolvedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'completed')
  }, [tasks])

  const openItems = openTasks.map(t => ({
    priority: priorityToP(t.priority),
    text: t.title,
    due: formatDue(t.dueDate),
    href: '/remediation',
  }))

  const resolvedItems = resolvedTasks.map(t => ({
    priority: priorityToP(t.priority),
    text: t.title,
    due: t.completedAt ? formatDue(t.completedAt) : '—',
    href: '/remediation',
  }))

  const PRIORITY_OPTIONS: PriorityFilter[] = ['all', 'P0', 'P1', 'P2']

  return (
    <PageContainer>
      <PageHeader
        title="Remediation"
        description={`${openTasks.length} open items`}
      />
      <PageContent>
        <div className="space-y-6">
          {/* Filter row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    priorityFilter === p
                      ? 'bg-foreground text-background font-medium'
                      : 'text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {p === 'all' ? 'All' : p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowDueThisWeek(!showDueThisWeek)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                showDueThisWeek
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              Due this week
            </button>
          </div>

          {/* Open items */}
          {openItems.length > 0 ? (
            <RemediationLedger items={openItems} meanTimeToResolutionDays={3.2} />
          ) : (
            <div className="bg-card border border-border rounded-lg">
              <EmptyState
                title="No outstanding items"
                description="All remediation tasks have been resolved."
              />
            </div>
          )}

          {/* Resolved this quarter */}
          {resolvedItems.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Resolved This Quarter</h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="divide-y divide-border">
                  {resolvedItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 opacity-60">
                      <Badge variant={priorityVariant(item.priority as PriorityFilter)} size="sm">
                        {item.priority}
                      </Badge>
                      <span className="flex-1 text-sm text-muted-foreground truncate line-through">{item.text}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{item.due}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </PageContainer>
  )
}
