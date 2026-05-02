import React, { useState, useMemo } from 'react'
import { useDashboardScan } from '../hooks/useDashboardScan'
import PageHeader from '../components/layout/PageHeader'
import FindingsList from '../components/data/FindingsList'
import type { Finding as ScanFinding } from '../types'

const SEVERITY_OPTIONS = ['all', 'critical', 'high', 'medium', 'low'] as const
const STATUS_OPTIONS = ['all', 'fail', 'pass'] as const

type SeverityFilter = typeof SEVERITY_OPTIONS[number]
type StatusFilter = typeof STATUS_OPTIONS[number]

function FilterTab<T extends string>({
  label,
  value,
  current,
  onSelect,
}: {
  label: string
  value: T
  current: T
  onSelect: (v: T) => void
}) {
  const isActive = value === current
  return (
    <button
      onClick={() => onSelect(value)}
      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-foreground text-white font-medium'
          : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {label}
    </button>
  )
}

const PAGE_SIZE = 10

export default function Findings() {
  const { scanData } = useDashboardScan()
  const allFindings = (scanData?.findings ?? []) as ScanFinding[]

  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [articleFilter, setArticleFilter] = useState<string>('all')
  const [page, setPage] = useState(0)

  const articles = useMemo(() => {
    const set = new Set(allFindings.map(f => f.article))
    return Array.from(set).sort()
  }, [allFindings])

  const filtered = useMemo(() => {
    return allFindings.filter(f => {
      if (severity !== 'all' && f.severity !== severity) return false
      if (status !== 'all' && f.status !== status) return false
      if (articleFilter !== 'all' && f.article !== articleFilter) return false
      return true
    })
  }, [allFindings, severity, status, articleFilter])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const mappedFindings = paged.map((f, i) => ({
    id: `F-${String(page * PAGE_SIZE + i + 1).padStart(4, '0')}`,
    severity: (f.severity === 'critical' || f.severity === 'high' ? 'High' : f.severity === 'medium' ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
    articleCode: f.article || '21(2)',
    detectedAt: new Date().toISOString(),
    title: f.checkName,
    body: f.description || f.evidence || '',
    href: '/scan/findings',
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Findings"
        subtitle={`${filtered.length} of ${allFindings.length} results`}
      />

      {/* Filter row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <FilterTab label="All" value="all" current={status} onSelect={v => { setStatus(v); setPage(0) }} />
          <FilterTab label="Open" value="fail" current={status} onSelect={v => { setStatus(v); setPage(0) }} />
          <FilterTab label="Resolved" value="pass" current={status} onSelect={v => { setStatus(v); setPage(0) }} />
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {SEVERITY_OPTIONS.map(s => (
            <FilterTab
              key={s}
              label={s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              value={s}
              current={severity}
              onSelect={v => { setSeverity(v); setPage(0) }}
            />
          ))}
        </div>

        {articles.length > 0 && (
          <select
            value={articleFilter}
            onChange={e => { setArticleFilter(e.target.value); setPage(0) }}
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-card text-foreground"
          >
            <option value="all">All articles</option>
            {articles.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
      </div>

      {/* Findings list */}
      <FindingsList findings={mappedFindings} totalOpen={filtered.length} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-border rounded-md bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
