import React, { useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useControlsContext } from '../context/ControlsContext'
import { useRemediation } from '../hooks/useRemediation'
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
import EvidencePanel from '../components/EvidencePanel'
import { ChevronDown, ChevronRight, User, Calendar, FileText, Check, AlertCircle, Paperclip, Wrench } from 'lucide-react'
import type { RemediationTask } from '../types/assessment'
import type { Control, ControlStatus } from '../types/controls'

const ALL_STATUSES: ControlStatus[] = ['Not Started', 'Planned', 'Partial', 'Implemented']

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
            const matchingAreas = articleAreas.filter(a =>
              a.article?.toLowerCase().includes(`(${art.code})`)
            )
            const pass = matchingAreas.reduce((sum, a) => sum + (a.implementedCount || 0), 0)
            const total = matchingAreas.reduce((sum, a) => sum + (a.controlCount || 0), 0)
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

// ─── Inline Control Row ─────────────────────────

function ControlRow({
  ctrl,
  onUpdate,
  remediationTasks,
}: {
  ctrl: Control
  onUpdate: (id: string, updates: Partial<Control>) => Promise<string | null>
  remediationTasks: RemediationTask[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localOwner, setLocalOwner] = useState(ctrl.owner || '')
  const [localNotes, setLocalNotes] = useState(ctrl.notes || '')
  const [localDueDate, setLocalDueDate] = useState(ctrl.dueDate || '')

  const handleStatusChange = useCallback(async (newStatus: ControlStatus) => {
    setSaving(true)
    setError(null)
    const err = await onUpdate(ctrl.id, { status: newStatus })
    if (err) setError(err)
    setSaving(false)
  }, [ctrl.id, onUpdate])

  const handleFieldSave = useCallback(async (field: 'owner' | 'notes' | 'dueDate', value: string) => {
    setSaving(true)
    setError(null)
    const err = await onUpdate(ctrl.id, { [field]: value || (field === 'dueDate' ? null : '') })
    if (err) setError(err)
    setSaving(false)
  }, [ctrl.id, onUpdate])

  return (
    <>
      <tr
        className="group cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-mono text-muted-foreground text-xs">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              size={14}
              className={`text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            {ctrl.id}
          </div>
        </TableCell>
        <TableCell>
          <div>
            <span className="text-sm text-foreground">{ctrl.title}</span>
            {ctrl.owner && (
              <span className="ml-2 text-xs text-muted-foreground">
                — {ctrl.owner}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <select
            value={ctrl.status}
            onClick={e => e.stopPropagation()}
            onChange={e => handleStatusChange(e.target.value as ControlStatus)}
            disabled={saving}
            className={`text-xs font-medium px-2 py-1 rounded-md border cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors ${
              ctrl.status === 'Implemented'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : ctrl.status === 'Partial'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                : ctrl.status === 'Planned'
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </TableCell>
        <TableCell align="right" className="text-muted-foreground text-xs">
          {ctrl.lastUpdated
            ? new Date(ctrl.lastUpdated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </TableCell>
      </tr>

      {/* Expanded detail panel */}
      {expanded && (
        <tr>
          <td colSpan={4} className="px-4 pb-4 pt-0">
            <div className="ml-6 p-4 rounded-lg bg-muted/30 border border-border space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
                </div>
              )}

              {ctrl.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{ctrl.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Owner */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <User size={12} /> Owner
                  </label>
                  <input
                    type="text"
                    value={localOwner}
                    onChange={e => setLocalOwner(e.target.value)}
                    onBlur={() => {
                      if (localOwner !== (ctrl.owner || '')) handleFieldSave('owner', localOwner)
                    }}
                    placeholder="Assign owner..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* Due date */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <Calendar size={12} /> Due date
                  </label>
                  <input
                    type="date"
                    value={localDueDate}
                    onChange={e => {
                      setLocalDueDate(e.target.value)
                      handleFieldSave('dueDate', e.target.value)
                    }}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                {/* Status display */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <Check size={12} /> Status
                  </label>
                  <Badge variant={statusBadgeVariant(ctrl.status)} size="sm">
                    {statusLabel(ctrl.status)}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <FileText size={12} /> Notes
                </label>
                <textarea
                  value={localNotes}
                  onChange={e => setLocalNotes(e.target.value)}
                  onBlur={() => {
                    if (localNotes !== (ctrl.notes || '')) handleFieldSave('notes', localNotes)
                  }}
                  placeholder="Add notes, evidence references, or implementation details..."
                  rows={2}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-y"
                />
              </div>

              {/* Evidence / Documents */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                  <Paperclip size={12} /> Evidence & Documents
                </label>
                <EvidencePanel entityType="control" entityId={ctrl.id} />
              </div>

              {/* Related Remediation Tasks */}
              {remediationTasks.length > 0 && (
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                    <Wrench size={12} /> Remediation Tasks
                  </label>
                  <div className="space-y-1.5">
                    {remediationTasks.map(rt => (
                      <Link
                        key={rt.id}
                        to="/remediation"
                        className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/50 border border-border text-xs group hover:bg-muted transition-colors"
                      >
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                          rt.priority === 'critical' ? 'bg-red-500/10 text-red-600' :
                          rt.priority === 'high' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {rt.priority === 'critical' ? 'P0' : rt.priority === 'high' ? 'P1' : 'P2'}
                        </span>
                        <span className="flex-1 text-foreground truncate">{rt.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          rt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                          rt.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {rt.status === 'completed' ? 'Done' : rt.status === 'in_progress' ? 'In progress' : 'Open'}
                        </span>
                        {rt.dueDate && (
                          <span className="text-muted-foreground">
                            {new Date(rt.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {saving && (
                <p className="text-[10px] text-muted-foreground">Saving...</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Detail View ───────────────────────────────

function ControlsDetail({
  code,
  controls,
  articleAreas,
  scanFindings,
  onUpdateControl,
  remediationTasks,
}: {
  code: string
  controls: Control[]
  articleAreas: any[]
  scanFindings: any[]
  remediationTasks: RemediationTask[]
  onUpdateControl: (id: string, updates: Partial<Control>) => Promise<string | null>
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

  const implemented = areaControls.filter(c => c.status === 'Implemented').length
  const partial = areaControls.filter(c => c.status === 'Partial').length
  const planned = areaControls.filter(c => c.status === 'Planned').length
  const notStarted = areaControls.filter(c => c.status === 'Not Started').length

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
        <div className="space-y-6">
          {/* Summary stats */}
          {areaControls.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Implemented', count: implemented, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Partial', count: partial, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Planned', count: planned, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Not started', count: notStarted, color: 'text-muted-foreground', bg: 'bg-muted' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Controls table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">Controls</h2>
              <p className="text-xs text-muted-foreground">Click a row to expand. Change status inline.</p>
            </div>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell className="w-[8em]">Code</TableHeaderCell>
                  <TableHeaderCell>Title</TableHeaderCell>
                  <TableHeaderCell className="w-[9em]">Status</TableHeaderCell>
                  <TableHeaderCell align="right" className="w-[9em]">Last updated</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {areaControls.map((ctrl) => (
                  <ControlRow
                    key={ctrl.id}
                    ctrl={ctrl}
                    onUpdate={onUpdateControl}
                    remediationTasks={remediationTasks.filter(
                      rt => rt.relatedControlId === ctrl.id
                    )}
                  />
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
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Findings</h2>
            {areaFindings.length > 0 ? (
              <FindingsList findings={areaFindings} totalOpen={areaFindings.length} />
            ) : (
              <p className="text-sm text-muted-foreground">No open findings for this article.</p>
            )}
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
  const { controls, articleAreas, updateControl } = useControlsContext()
  const { tasks: remediationTasks } = useRemediation()
  const { scanData } = useDashboardScan()
  const allFindings = scanData?.findings ?? []

  if (code) {
    return (
      <ControlsDetail
        code={code}
        controls={controls}
        articleAreas={articleAreas}
        scanFindings={allFindings}
        onUpdateControl={updateControl}
        remediationTasks={remediationTasks}
      />
    )
  }

  return <ControlsIndex articleAreas={articleAreas} />
}
