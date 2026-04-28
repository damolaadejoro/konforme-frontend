import React, { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useControlsContext } from '../context/ControlsContext'
import { useDashboardScan } from '../hooks/useDashboardScan'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '../components/ui/DataTable'
import FindingsList from '../components/data/FindingsList'
import { ChevronRight } from 'lucide-react'
import type { Control, ControlStatus } from '../types/controls'

const ARTICLES: Array<{
  code: string
  letter: string
  title: string
  description: string
}> = [
  { code: 'a', letter: '(a)', title: 'Risk analysis & ISMS policies', description: 'Policies on risk analysis and information system security, including governance frameworks and regular review cycles.' },
  { code: 'b', letter: '(b)', title: 'Incident handling', description: 'Procedures for the prevention, detection, and response to incidents, including escalation and notification.' },
  { code: 'c', letter: '(c)', title: 'Business continuity & crisis management', description: 'Business continuity management including backup management, disaster recovery, and crisis management.' },
  { code: 'd', letter: '(d)', title: 'Supply chain security', description: 'Supply chain security including security-related aspects concerning the relationships between each entity and its direct suppliers or service providers.' },
  { code: 'e', letter: '(e)', title: 'Network & information systems security', description: 'Security in network and information systems acquisition, development, and maintenance, including vulnerability handling and disclosure.' },
  { code: 'f', letter: '(f)', title: 'Vulnerability handling & disclosure', description: 'Policies and procedures to assess the effectiveness of cybersecurity risk-management measures.' },
  { code: 'g', letter: '(g)', title: 'Effectiveness assessment', description: 'Basic cyber hygiene practices and cybersecurity training for staff.' },
  { code: 'h', letter: '(h)', title: 'Cyber hygiene & training', description: 'Policies and procedures regarding the use of cryptography and, where appropriate, encryption.' },
  { code: 'i', letter: '(i)', title: 'Cryptography & encryption', description: 'Human resources security, access control policies, and asset management.' },
  { code: 'j', letter: '(j)', title: 'HR security & access control', description: 'The use of multi-factor authentication or continuous authentication solutions, secured voice, video and text communications, and secured emergency communication systems.' },
]

const CROSSWALK: Record<string, Array<{ iso: string; nist: string }>> = {
  a: [{ iso: 'A.5.1, A.5.2', nist: 'GV.RM, GV.PO' }],
  b: [{ iso: 'A.5.24, A.5.25, A.5.26', nist: 'RS.MA, RS.AN, RS.CO' }],
  c: [{ iso: 'A.5.29, A.5.30', nist: 'RC.RP, PR.IP' }],
  d: [{ iso: 'A.5.19, A.5.20, A.5.21', nist: 'GV.SC, ID.SC' }],
  e: [{ iso: 'A.8.8, A.8.9', nist: 'PR.DS, PR.IP, PR.PT' }],
  f: [{ iso: 'A.8.8, A.5.7', nist: 'ID.RA, RS.MI' }],
  g: [{ iso: 'A.5.35, A.5.36', nist: 'ID.IM, PR.IP' }],
  h: [{ iso: 'A.6.3, A.5.10', nist: 'PR.AT, PR.AC' }],
  i: [{ iso: 'A.8.24', nist: 'PR.DS' }],
  j: [{ iso: 'A.5.15, A.5.16, A.6.1, A.6.2', nist: 'PR.AC, PR.AA' }],
}

function statusBadgeVariant(s: ControlStatus): 'success' | 'warning' | 'info' | 'muted' {
  switch (s) {
    case 'Implemented': return 'success'
    case 'Partial': return 'warning'
    case 'Planned': return 'info'
    default: return 'muted'
  }
}

function statusLabel(s: ControlStatus): string {
  switch (s) {
    case 'Implemented': return 'Done'
    case 'Partial': return 'Partial'
    case 'Planned': return 'Planned'
    default: return 'Not started'
  }
}

// ─── Index View ────────────────────────────────

function ControlsIndex({ articleAreas }: { articleAreas: any[] }) {
  return (
    <PageContainer>
      <PageHeader
        title="Controls"
        description="NIS2 Article 21(2) cybersecurity risk-management measures"
      />
      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ARTICLES.map((art) => {
            const area = articleAreas.find(a =>
              a.article?.toLowerCase().includes(`(${art.code})`) || a.id?.toLowerCase() === art.code
            )
            const pass = area?.implementedCount || 0
            const total = area?.controlCount || 0
            const pct = total > 0 ? Math.round((pass / total) * 100) : 0

            return (
              <Link
                key={art.code}
                to={`/controls?code=${art.code}`}
                className="bg-card border border-border rounded-lg p-5 hover:border-border/80 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{art.letter}</span>
                  <span className="text-sm font-mono text-muted-foreground">{pass}/{total}</span>
                </div>
                <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                  {art.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{art.description}</p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </PageContent>
    </PageContainer>
  )
}

// ─── Detail View ───────────────────────────────

function ControlsDetail({
  code,
  controls,
  articleAreas,
  scanFindings,
}: {
  code: string
  controls: Control[]
  articleAreas: any[]
  scanFindings: any[]
}) {
  const art = ARTICLES.find(a => a.code === code)
  if (!art) return <p className="text-sm text-muted-foreground">Article not found.</p>

  const areaControls = controls.filter(c =>
    c.article?.toLowerCase().includes(`(${code})`)
  )

  const areaFindings = scanFindings
    .filter(f => f.status === 'fail' && f.article?.toLowerCase().includes(`(${code})`))
    .map((f, i) => ({
      id: `F-${String(i + 1).padStart(4, '0')}`,
      severity: (f.severity === 'critical' || f.severity === 'high' ? 'High' : f.severity === 'medium' ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
      articleCode: f.article || `21(2)(${code})`,
      detectedAt: new Date().toISOString(),
      title: f.checkName,
      body: f.description || '',
      href: '/scan/findings',
    }))

  const crosswalk = CROSSWALK[code] || []

  return (
    <PageContainer>
      <PageHeader
        title={art.title}
        description={art.description}
        breadcrumbs={[
          { label: 'Controls', href: '/controls' },
          { label: art.title },
        ]}
      />
      <PageContent>
        <div className="space-y-8">
          {/* Controls table */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Controls</h2>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell className="w-[8em]">Code</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell className="w-[7em]">Status</TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[9em]">Last checked</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {areaControls.map((ctrl) => (
                  <TableRow key={ctrl.id}>
                    <TableCell className="font-mono text-muted-foreground">{ctrl.id}</TableCell>
                    <TableCell>{ctrl.title}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(ctrl.status)} size="sm">
                        {statusLabel(ctrl.status)}
                      </Badge>
                    </TableCell>
                    <TableCell align="right" className="text-muted-foreground">
                      {ctrl.lastUpdated
                        ? new Date(ctrl.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {areaControls.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="No controls defined"
                        description="No controls defined for this area yet."
                      />
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Findings */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Findings</h2>
            {areaFindings.length > 0 ? (
              <FindingsList findings={areaFindings} totalOpen={areaFindings.length} />
            ) : (
              <p className="text-sm text-muted-foreground">No open findings for this article.</p>
            )}
          </div>

          {/* Crosswalk */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Framework Crosswalk</h2>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell className="w-[10em]">Directive</TableHeaderCell>
                  <TableHeaderCell>ISO 27001:2022</TableHeaderCell>
                  <TableHeaderCell>NIST CSF 2.0</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {crosswalk.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-muted-foreground">Art. 21(2)({code})</TableCell>
                    <TableCell className="font-mono">{row.iso}</TableCell>
                    <TableCell className="font-mono">{row.nist}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageContent>
    </PageContainer>
  )
}

// ─── Main Component ────────────────────────────

export default function ControlsLibrary() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const { controls, articleAreas } = useControlsContext()
  const { scanData } = useDashboardScan()
  const allFindings = scanData?.findings ?? []

  if (code) {
    return (
      <ControlsDetail
        code={code}
        controls={controls}
        articleAreas={articleAreas}
        scanFindings={allFindings}
      />
    )
  }

  return <ControlsIndex articleAreas={articleAreas} />
}
