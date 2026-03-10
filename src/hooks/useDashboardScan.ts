import { useState, useEffect } from 'react'
import { getLatestScan, getStoredAuth, ScanResponse } from '../services/api'

export function useDashboardScan() {
  const [scanData, setScanData] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { accountId, selectedAwsAccountId } = getStoredAuth()
    if (!accountId || !selectedAwsAccountId) {
      setLoading(false)
      return
    }

    getLatestScan(accountId, selectedAwsAccountId)
      .then(setScanData)
      .catch(() => setScanData(null))
      .finally(() => setLoading(false))
  }, [])

  return { scanData, loading }
}
