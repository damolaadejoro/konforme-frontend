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
    evidence: 'bg-blue-500/20 text-blue-400',
    control: 'bg-emerald-500/20 text-emerald-400',
    assessment: 'bg-purple-500/20 text-purple-400',
    scan: 'bg-amber-500/20 text-amber-400',
    team: 'bg-pink-500/20 text-pink-400',
    auth: 'bg-cyan-500/20 text-cyan-400',
    account: 'bg-orange-500/20 text-orange-400',
  }
  const cls = colors[category] || 'bg-navy-700 text-slate-400'
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
          <h1 className="text-2xl font-bold text-white font-syne flex items-center gap-3">
            <History className="text-cyan-400" size={24} />
            {t('activity.title', 'Activity Log')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('activity.description', 'Tamper-evident audit trail of all compliance actions')}
          </p>
        </div>
        <button
          onClick={handleVerify}
          disabled={verifying}
          className="inline-flex items-center gap-2 px-4 py-2 bg-navy-800 border border-navy-700 hover:border-cyan-500/30 text-slate-200 rounded-lg transition-colors text-sm"
        >
          {verifying ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {t('activity.verifyChain', 'Verify Chain')}
        </button>
      </div>

      {/* Verification result */}
      {verification && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          verification.valid
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
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
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder={t('activity.searchPlaceholder', 'Search by user, entity...')}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
          className="bg-navy-800 border border-navy-700 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
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
          <Loader2 size={24} className="animate-spin text-cyan-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('activity.noEvents', 'No activity recorded yet')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 px-4 py-3 rounded-lg bg-navy-800/30 border border-navy-700/30 hover:bg-navy-800/50 transition-colors"
            >
              <div className="mt-1 shrink-0">
                <EventBadge category={entry.eventCategory} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">
                  <span className="font-medium">{entry.eventType}</span>
                  {entry.entityLabel && (
                    <span className="text-slate-400"> — {entry.entityLabel}</span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {entry.actorEmail || 'System'}
                  {' · '}
                  {new Date(entry.occurredAt).toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-slate-600 shrink-0">#{entry.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-navy-800 text-slate-400 disabled:opacity-50 hover:bg-navy-700 transition-colors"
            >
              {t('common.previous', 'Previous')}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded bg-navy-800 text-slate-400 disabled:opacity-50 hover:bg-navy-700 transition-colors"
            >
              {t('common.next', 'Next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
