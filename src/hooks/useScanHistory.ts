import { useState, useEffect } from 'react'
import { getScanHistory, getStoredAuth, ScanSummary } from '../services/api'

export function useScanHistory() {
  const [scans, setScans] = useState<ScanSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { accountId, selectedAwsAccountId } = getStoredAuth()
    if (!accountId || !selectedAwsAccountId) {
      setLoading(false)
      return
    }

    getScanHistory(accountId, selectedAwsAccountId)
      .then(setScans)
      .catch(() => setScans([]))
      .finally(() => setLoading(false))
  }, [])

  return { scans, loading }
}
