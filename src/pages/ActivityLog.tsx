import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History, Search, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getAuditLog,
  verifyAuditChain,
  type AuditLogEntry,
  type ChainVerificationResult,
} from '../services/api'

const EVENT_CATEGORIES = [
  '', 'evidence', 'control', 'assessment', 'scan', 'team', 'auth', 'account',
]

function EventBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    evidence: 'bg-blue-100 text-blue-600',
    control: 'bg-emerald-100 text-emerald-600',
    assessment: 'bg-purple-100 text-purple-600',
    scan: 'bg-amber-100 text-amber-600',
    team: 'bg-pink-100 text-pink-600',
    auth: 'bg-primary/15 text-primary',
    account: 'bg-orange-100 text-orange-600',
  }
  const cls = colors[category] || 'bg-muted text-muted-foreground'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{category}</span>
}

export default function ActivityLog() {
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verification, setVerification] = useState<ChainVerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)

  const loadLog = useCallback(async () => {
    if (!accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await getAuditLog(accountId, {
        q: query || undefined,
        eventType: categoryFilter ? undefined : undefined,
        page,
        perPage,
      })
      setEntries(result.items || [])
      setTotal(result.total || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, query, categoryFilter, page, perPage])

  useEffect(() => { loadLog() }, [loadLog])

  const handleVerify = async () => {
    if (!accountId) return
    setVerifying(true)
    try {
      const result = await verifyAuditChain(accountId)
      setVerification(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <History className="text-primary" size={24} />
            {t('activity.title', 'Activity Log')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('activity.description', 'Tamper-evident audit trail of all compliance actions')}
          </p>
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border hover:border-cyan-500/30 text-foreground/80 rounded-lg transition-colors text-sm"
        >
          {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {t('activity.verifyChain', 'Verify Chain')}
        </button>
      </div>

      {/* Verification result */}
      {verification && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          verification.valid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {verification.valid
            ? t('activity.chainValid', 'Hash chain verified: {{total}} events, all intact.', { total: verification.total })
            : t('activity.chainBroken', 'Chain broken at event #{{id}}. {{checked}} of {{total}} checked.', {
                id: verification.firstBrokenAt,
                checked: verification.checked,
                total: verification.total,
              })
          }
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder={t('activity.searchPlaceholder', 'Search by user, entity...')}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="bg-card border border-border rounded-lg text-sm text-foreground/80 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        >
          <option value="">{t('common.all', 'All')}</option>
          {EVENT_CATEGORIES.filter(Boolean).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('activity.noEvents', 'No activity recorded yet')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 px-4 py-3 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
            >
              <div className="mt-1 shrink-0">
                <EventBadge category={entry.eventCategory} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{entry.eventType}</span>
                  {entry.entityLabel && (
                    <span className="text-muted-foreground"> — {entry.entityLabel}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.actorEmail || 'System'}
                  {' · '}
                  {new Date(entry.occurredAt).toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-foreground/70 shrink-0">#{entry.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-card border border-border text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
            >
              {t('common.previous', 'Previous')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-card border border-border text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
