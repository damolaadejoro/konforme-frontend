import React, { useState, useMemo } from 'react'
import { useRemediation } from '../hooks/useRemediation'
import { useControlsContext } from '../context/ControlsContext'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import RemediationLedger from '../components/data/RemediationLedger'
import type { RemediationItem } from '../components/data/RemediationLedger'
import { Info } from 'lucide-react'
import type { RemediationTask } from '../types/assessment'

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

  const { controls } = useControlsContext()

  // Build a map from control ID to its article letter for deep linking
  const controlArticleMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of controls) {
      const match = c.article?.toLowerCase().match(/\(([a-j])\)/)
      if (match) map[c.id] = match[1]
    }
    return map
  }, [controls])

  function taskToItem(t: RemediationTask): RemediationItem {
    const isControl = t.questionId?.startsWith('ctrl:')
    const controlId = t.relatedControlId || (isControl ? t.questionId.replace('ctrl:', '') : undefined)
    const articleCode = controlId ? controlArticleMap[controlId] : undefined

    let source: RemediationItem['source'] = 'manual'
    let sourceLabel = ''
    let href = '/remediation'

    if (isControl && articleCode) {
      source = 'control'
      sourceLabel = `Art. 21(2)(${articleCode})`
      href = `/controls?code=${articleCode}`
    } else if (!isControl && t.questionId && !t.questionId.startsWith('local')) {
      source = 'assessment'
      sourceLabel = 'Assessment'
      href = '/assessment'
    }

    return {
      priority: priorityToP(t.priority),
      text: t.title,
      due: formatDue(t.dueDate),
      href,
      source,
      sourceLabel,
    }
  }

  const openItems = openTasks.map(taskToItem)

  const resolvedItems = resolvedTasks.map(t => ({
    ...taskToItem(t),
    due: t.completedAt ? formatDue(t.completedAt) : '—',
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

          {/* Scheduling note */}
          {openTasks.length > 0 && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/15">
              <Info size={16} className="text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-foreground/70 leading-relaxed">
                <span className="font-medium text-foreground">Tasks are phased by severity.</span>{' '}
                Critical items are due within 30 days, high-priority within 45–75 days, and medium within 75–120 days.
                Deadlines are staggered so you can focus on a few controls at a time rather than everything at once.
              </div>
            </div>
          )}

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
