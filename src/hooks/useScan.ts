import { useState, useCallback, useRef, useEffect } from 'react'
import { ScanCheckProgress, ScanStatus } from '../types'
import { mockScanChecks, checkResults } from '../data/mockData'
import {
  startScan as apiStartScan,
  startProviderScan as apiStartProviderScan,
  getScan as apiGetScan,
  getScanHistory,
  getStoredAuth,
  isConnected,
  type ScanResponse,
} from '../services/api'

const POLL_INTERVAL = 2000

export function useScan(selectedAwsAccountId?: string | null) {
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [checks, setChecks] = useState<ScanCheckProgress[]>([])
  const [currentCheckIndex, setCurrentCheckIndex] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start polling an existing scan by ID
  const pollScan = useCallback((scanId: string) => {
    setStatus('scanning')
    setError(null)
    setScanResult(null)

    pollingRef.current = setInterval(async () => {
      try {
        const scan = await apiGetScan(scanId)

        if (scan.status === 'complete') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setScanResult(scan)
          setStatus('complete')
          setProgress(100)

          const mappedChecks: ScanCheckProgress[] = scan.findings.map((f) => ({
            id: f.id,
            checkName: f.checkName,
            resource: f.resource,
            status: f.status === 'pass' ? 'pass' as const
                  : f.status === 'info' ? 'info' as const
                  : f.status === 'review' ? 'warn' as const
                  : 'fail' as const,
            severity: f.severity as ScanCheckProgress['severity'],
            duration: Math.round(Math.random() * 1200 + 600),
          }))
          setChecks(mappedChecks)
          setCurrentCheckIndex(-1)

          localStorage.setItem('konforme_last_scan', JSON.stringify(scan))
        } else if (scan.status === 'error') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          setStatus('error')
          setError('Scan failed. Check your permissions.')
        } else {
          setProgress(prev => Math.min(prev + 5, 90))
        }
      } catch (err) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to poll scan status')
      }
    }, POLL_INTERVAL)
  }, [])

  // On mount (or when selected account changes), check for in-progress scan and resume polling
  useEffect(() => {
    if (!isConnected()) return
    const { accountId } = getStoredAuth()
    const awsId = selectedAwsAccountId || getStoredAuth().selectedAwsAccountId
    if (!accountId || !awsId) return

    // Don't overwrite an already-running scan
    if (pollingRef.current) return

    setResuming(true)
    getScanHistory(accountId, awsId)
      .then(scans => {
        const running = scans.find(s => s.status === 'queued' || s.status === 'running')
        if (running) {
          setProgress(20)
          pollScan(running.id)
        }
      })
      .catch(() => {})
      .finally(() => setResuming(false))

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pollScan, selectedAwsAccountId])

  // Real API scan (AWS — legacy path)
  const startApiScan = useCallback(async (awsAccountId?: string) => {
    const { accountId, selectedAwsAccountId } = getStoredAuth()
    const targetAwsId = awsAccountId || selectedAwsAccountId
    if (!accountId) {
      setError('No connected account. Please connect your AWS account first.')
      return
    }
    if (!targetAwsId) {
      setError('No AWS account selected. Please select an AWS account to scan.')
      return
    }

    setStatus('scanning')
    setError(null)
    setProgress(0)
    setChecks([])
    setScanResult(null)

    try {
      const { scan_id } = await apiStartScan(accountId, targetAwsId)
      pollScan(scan_id)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to start scan')
    }
  }, [pollScan])

  // Provider scan (Azure or AWS via credential ID)
  const startProviderScanFn = useCallback(async (credentialId: string, provider: 'aws' | 'azure') => {
    const { accountId } = getStoredAuth()
    if (!accountId) {
      setError('No connected account.')
      return
    }

    setStatus('scanning')
    setError(null)
    setProgress(0)
    setChecks([])
    setScanResult(null)

    try {
      const { scan_id } = await apiStartProviderScan(accountId, credentialId, provider)
      pollScan(scan_id)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to start scan')
    }
  }, [pollScan])

  // Demo mock scan (no backend needed)
  const startDemoScan = useCallback(() => {
    setStatus('scanning')
    setError(null)
    setScanResult(null)
    setChecks(mockScanChecks.map(c => ({ ...c, status: 'pending' as const })))
    setCurrentCheckIndex(0)
    setProgress(0)

    let index = 0
    const total = mockScanChecks.length

    const runNextCheck = () => {
      if (index >= total) {
        setStatus('complete')
        setProgress(100)
        setCurrentCheckIndex(-1)
        return
      }

      const checkId = mockScanChecks[index].id
      setCurrentCheckIndex(index)
      setChecks(prev =>
        prev.map((c, i) => (i === index ? { ...c, status: 'scanning' as const } : c))
      )

      const duration = 600 + Math.random() * 1200
      timeoutRef.current = setTimeout(() => {
        const result = checkResults[checkId]
        setChecks(prev =>
          prev.map((c, i) =>
            i === index
              ? { ...c, status: result.status, severity: result.severity, duration: Math.round(duration) }
              : c
          )
        )
        setProgress(Math.round(((index + 1) / total) * 100))
        index++
        runNextCheck()
      }, duration)
    }
    runNextCheck()
  }, [])

  const startScan = useCallback(
    (mode: 'api' | 'demo' = 'api', awsAccountId?: string) => {
      if (mode === 'demo') {
        startDemoScan()
      } else {
        startApiScan(awsAccountId)
      }
    },
    [startApiScan, startDemoScan]
  )

  const resetScan = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (pollingRef.current) clearInterval(pollingRef.current)
    setStatus('idle')
    setChecks([])
    setCurrentCheckIndex(-1)
    setProgress(0)
    setScanResult(null)
    setError(null)
  }, [])

  return {
    status,
    checks,
    currentCheckIndex,
    progress,
    scanResult,
    error,
    resuming,
    startScan,
    startProviderScan: startProviderScanFn,
    resetScan,
  }
}
