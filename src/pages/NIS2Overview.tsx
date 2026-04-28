import React, { useMemo } from 'react'
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
import { RefreshCw, Download } from 'lucide-react'

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
  const { accountName } = useAuth()
  const { articleAreas } = useControlsContext()
  const { overallScore, technicalScore, assessmentScore, backendScore } = useScore()
  const { answeredCount, totalQuestions } = useAssessment()
  const { scanData } = useDashboardScan()
  const { tasks: remediationTasks } = useRemediation()

  const grade = (backendScore?.grade as any) || 'B'
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

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Overview of your NIS2 compliance posture."
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => {}}>Re-scan</Button>
            <Button icon={<Download size={16} />} onClick={() => {}}>Export PDF</Button>
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
