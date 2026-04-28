import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useControlsContext } from '../context/ControlsContext'
import { useScore } from '../context/ScoreContext'
import { useDashboardScan } from '../hooks/useDashboardScan'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/ui/DataTable'
import { generateComplianceReport } from '../utils/generatePDF'
import { FileText, Download } from 'lucide-react'

const ARCHIVE = [
  { id: 'KNF-2026-Q2-014', date: '2026-04-28', period: 'Q2 2026', score: 82, size: '1.2 MB' },
  { id: 'KNF-2026-Q1-011', date: '2026-01-31', period: 'Q1 2026', score: 76, size: '1.1 MB' },
  { id: 'KNF-2025-Q4-008', date: '2025-10-30', period: 'Q4 2025', score: 71, size: '0.9 MB' },
]

export default function Reports() {
  const { accountName } = useAuth()
  const { controls, complianceScore, articleAreas, criticalGaps, allCriticalGaps } = useControlsContext()
  const { overallScore } = useScore()
  const { scanData } = useDashboardScan()
  const [generating, setGenerating] = useState(false)

  const handleExport = async () => {
    setGenerating(true)
    try {
      const totalControls = controls.length
      const implemented = controls.filter(c => c.status === 'Implemented').length
      const partial = controls.filter(c => c.status === 'Partial').length
      const planned = controls.filter(c => c.status === 'Planned').length
      const notStarted = totalControls - implemented - partial - planned

      await generateComplianceReport({
        accountName: accountName || 'Organisation',
        overallScore: complianceScore?.overall ?? overallScore ?? 0,
        technicalScore: complianceScore?.technical ?? 0,
        organizationalScore: complianceScore?.organizational ?? 0,
        peopleScore: complianceScore?.people ?? 0,
        totalControls,
        implemented,
        partial,
        planned,
        notStarted,
        totalFindings: scanData?.findings?.length ?? 0,
        critical: scanData?.criticalCount ?? 0,
        high: scanData?.highCount ?? 0,
        medium: scanData?.findings?.filter(f => f.severity === 'medium').length ?? 0,
        low: scanData?.findings?.filter(f => f.severity === 'low').length ?? 0,
        domainScores: scanData?.domainScores ?? [],
        articleBreakdown: articleAreas.map(a => ({
          name: a.name || a.id,
          article: a.article || '',
          totalControls: a.controlCount,
          implemented: a.implementedCount,
          score: a.controlCount > 0 ? Math.round((a.implementedCount / a.controlCount) * 100) : 0,
        })),
        criticalGaps: (allCriticalGaps || criticalGaps || []).map(g => ({
          title: g.title,
          severity: g.severity,
          article: g.article,
        })),
      })
    } catch (e) {
      console.error('PDF generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Audit-ready PDF exports, latest first."
        actions={
          <Button icon={<FileText size={16} />} onClick={handleExport} loading={generating}>
            Export PDF
          </Button>
        }
      />
      <PageContent className="space-y-6">
        {/* Archive table */}
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Date</TableHeaderCell>
              <TableHeaderCell>Document ID</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell align="right">Score</TableHeaderCell>
              <TableHeaderCell align="right">Size</TableHeaderCell>
              <TableHeaderCell align="right" className="w-[7em]">{''}</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {ARCHIVE.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="text-muted-foreground">
                  {new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="font-mono">{report.id}</TableCell>
                <TableCell>{report.period}</TableCell>
                <TableCell numeric className="font-semibold">{report.score}</TableCell>
                <TableCell align="right" className="text-muted-foreground">{report.size}</TableCell>
                <TableCell align="right">
                  <Button variant="ghost" size="sm" icon={<Download size={14} />}>Download</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PageContent>
    </PageContainer>
  )
}
