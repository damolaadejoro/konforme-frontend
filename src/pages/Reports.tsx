import React, { useState } from 'react'
import { useReports } from '../hooks/useReports'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { FileText, Download } from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getCurrentPeriod(): { period: string; periodStart: string; periodEnd: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const quarter = Math.floor(month / 3) + 1
  const qStart = new Date(year, (quarter - 1) * 3, 1)
  const qEnd = new Date(year, quarter * 3, 0)
  return {
    period: `Q${quarter} ${year}`,
    periodStart: qStart.toISOString().split('T')[0],
    periodEnd: qEnd.toISOString().split('T')[0],
  }
}

export default function Reports() {
  const { reports, loading, generate, download } = useReports()
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { period, periodStart, periodEnd } = getCurrentPeriod()
      await generate(period, periodStart, periodEnd)
    } catch (e) {
      console.error('Report generation failed:', e)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (reportId: string, documentId: string) => {
    try {
      await download(reportId, documentId)
    } catch (e) {
      console.error('Download failed:', e)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports"
        description="Audit-ready PDF exports, latest first."
        actions={
          <Button icon={<FileText size={16} />} onClick={handleGenerate} loading={generating}>
            Generate Report
          </Button>
        }
      />
      <PageContent className="space-y-6">
        {!loading && reports.length === 0 ? (
          <div className="bg-card border border-border rounded-lg">
            <EmptyState
              icon={<FileText />}
              title="No reports yet"
              description="Generate your first audit-ready PDF report."
            />
          </div>
        ) : (
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
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="font-mono">{report.documentId}</TableCell>
                  <TableCell>{report.period}</TableCell>
                  <TableCell numeric className="font-semibold">{report.aggregateScore}</TableCell>
                  <TableCell align="right" className="text-muted-foreground">{formatFileSize(report.fileSizeBytes)}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download size={14} />}
                      onClick={() => handleDownload(report.id, report.documentId)}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageContent>
    </PageContainer>
  )
}
