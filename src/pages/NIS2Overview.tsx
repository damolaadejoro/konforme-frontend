import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useControlsContext } from '../context/ControlsContext'
import { useScore } from '../context/ScoreContext'
import { useAssessment } from '../hooks/useAssessment'
import { useDashboardScan } from '../hooks/useDashboardScan'
import { useRemediation } from '../hooks/useRemediation'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import ScoreReadout from '../components/data/ScoreReadout'
import ControlMatrix from '../components/data/ControlMatrix'
import FindingsList from '../components/data/FindingsList'
import RemediationLedger from '../components/data/RemediationLedger'
import { RefreshCw, Download, Loader2 } from 'lucide-react'
import { generateReportRecord, downloadReportPdf } from '../services/api'

const ARTICLE_LABELS: Record<string, string> = {
  a: 'Risk analysis & ISMS policies',
  b: 'Incident handling',
  c: 'Business continuity & crisis management',
  d: 'Supply chain security',
  e: 'Network & information systems security',
  f: 'Vulnerability handling & disclosure',
  g: 'Effectiveness assessment',
  h: 'Cyber hygiene & training',
  i: 'Cryptography & encryption',
  j: 'HR security & access control',
}

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

export default function NIS2Overview() {
  const navigate = useNavigate()
  const { accountId, accountName } = useAuth()
  const { articleAreas } = useControlsContext()
  const { overallScore, technicalScore, assessmentScore, backendScore } = useScore()
  const { answeredCount, totalQuestions } = useAssessment()
  const { scanData } = useDashboardScan()
  const { tasks: remediationTasks } = useRemediation()

  const grade = (backendScore?.grade as any) || 'F'
  // TODO: Wire to real delta when backend tracks score history (no endpoint yet)
  const delta = 0
  const maturityLevel = Math.min(5, Math.max(1, Math.round(overallScore / 20))) as 1 | 2 | 3 | 4 | 5

  const openFindings = useMemo(() => {
    if (!scanData?.findings) return []
    return scanData.findings
      .filter(f => f.status === 'fail')
      .map((f, i) => ({
        id: `F-${String(i + 1).padStart(4, '0')}`,
        severity: (f.severity === 'critical' || f.severity === 'high' ? 'High' : f.severity === 'medium' ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
        articleCode: f.article || '21(2)',
        detectedAt: new Date().toISOString(),
        title: f.checkName,
        body: f.description || '',
        href: '/scan/findings',
      }))
  }, [scanData])

  const matrixRows = useMemo(() => {
    const codes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] as const
    return codes.map(code => {
      const area = articleAreas.find(a =>
        a.article?.toLowerCase().includes(`(${code})`) || a.id?.toLowerCase() === code
      )
      const pass = area?.implementedCount || 0
      const total = area?.controlCount || 0
      const score = total > 0 ? Math.round((pass / total) * 100) : 0
      return { code, label: ARTICLE_LABELS[code], score, pass, total, flagged: score < 70 }
    })
  }, [articleAreas])

  const remediationItems = useMemo(() => {
    return remediationTasks
      .filter(t => t.status === 'open' || t.status === 'in_progress')
      .slice(0, 10)
      .map(t => ({
        priority: priorityToP(t.priority),
        text: t.title,
        due: formatDue(t.dueDate),
        href: '/remediation',
      }))
  }, [remediationTasks])

  const technicalChecks = scanData?.totalChecks || 0
  const technicalFailures = scanData?.failed || 0

  const [exporting, setExporting] = useState(false)

  const handleExportPdf = async () => {
    if (!accountId) return
    setExporting(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const quarter = Math.floor(now.getMonth() / 3) + 1
      const qStart = new Date(year, (quarter - 1) * 3, 1)
      const qEnd = new Date(year, quarter * 3, 0)
      const period = `Q${quarter} ${year}`
      const periodStart = qStart.toISOString().split('T')[0]
      const periodEnd = qEnd.toISOString().split('T')[0]
      const report = await generateReportRecord(accountId, {
        period,
        period_start: periodStart,
        period_end: periodEnd,
      })
      await downloadReportPdf(accountId, report.id, report.documentId)
    } catch (e: any) {
      console.error('Export PDF failed:', e)
      alert(e.message || 'Failed to generate report')
    } finally {
      setExporting(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of your NIS2 compliance posture."
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => navigate('/scan')}>Re-scan</Button>
            <Button icon={<Download size={16} />} onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Generating...' : 'Export PDF'}
            </Button>
          </>
        }
      />
      <PageContent className="space-y-8">
        {/* Score cards */}
        <ScoreReadout
          aggregate={overallScore}
          technical={technicalScore}
          technicalChecks={technicalChecks}
          technicalFailures={technicalFailures}
          human={assessmentScore}
          humanQuestions={totalQuestions}
          humanCompletedBy={answeredCount}
          humanTotalStaff={totalQuestions > 0 ? answeredCount : 0}
          delta={delta}
          grade={grade as any}
          maturityLevel={maturityLevel}
        />

        {/* Control matrix */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Article 21(2) Coverage</h2>
          <ControlMatrix rows={matrixRows} />
        </div>

        {/* Open findings */}
        {openFindings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Open Findings
              <span className="ml-2 text-sm font-normal text-muted-foreground">{openFindings.length} total</span>
            </h2>
            <FindingsList
              findings={openFindings.slice(0, 4)}
              totalOpen={openFindings.length}
            />
          </div>
        )}

        {/* Remediation */}
        {remediationItems.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Remediation Queue</h2>
            {/* TODO: Compute MTTR from real task close timestamps when backend supports it */}
            <RemediationLedger
              items={remediationItems}
              meanTimeToResolutionDays={3.2}
            />
          </div>
        )}
      </PageContent>
    </PageContainer>
  )
}
