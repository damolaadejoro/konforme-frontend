import { useState, useEffect, useCallback } from 'react'
import { fetchReports, generateReportRecord, deleteReportRecord, downloadReportPdf, getStoredAuth } from '../services/api'
import type { ReportArchiveItem } from '../services/api'

export function useReports() {
  const [reports, setReports] = useState<ReportArchiveItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { accountId } = getStoredAuth()
    if (!accountId) { setLoading(false); return }
    try {
      const data = await fetchReports(accountId)
      setReports(data)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const generate = useCallback(async (period: string, periodStart: string, periodEnd: string) => {
    const { accountId } = getStoredAuth()
    if (!accountId) return null
    const report = await generateReportRecord(accountId, {
      period,
      period_start: periodStart,
      period_end: periodEnd,
    })
    setReports(prev => [report, ...prev])
    return report
  }, [])

  const download = useCallback(async (reportId: string, documentId: string) => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    await downloadReportPdf(accountId, reportId, documentId)
  }, [])

  const remove = useCallback(async (reportId: string) => {
    const { accountId } = getStoredAuth()
    if (!accountId) return
    await deleteReportRecord(accountId, reportId)
    setReports(prev => prev.filter(r => r.id !== reportId))
  }, [])

  return { reports, loading, generate, download, remove, reload: load }
}
