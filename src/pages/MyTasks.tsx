import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  CheckCircle, AlertTriangle, Clock, FileText, Shield, Loader2, X,
  ChevronDown, ChevronRight, Upload, Paperclip, CalendarClock,
  History, ExternalLink, MoreHorizontal, UserPlus, Ban,
} from 'lucide-react'
import { Button, ProgressBar } from '../components/ui'
import {
  fetchMyPeopleTasks, completePeopleTask, reschedulePeopleTask,
  fetchTaskCompletions, uploadEvidenceV2, updatePeopleTask,
  getTeamMembers,
} from '../services/api'
import type { MyPeopleTask, PeopleTaskCompletion } from '../types/peopleTasks'
import type { TeamMember } from '../services/api'

/* ── Constants ─────────────────────────────────────────────────── */

const PDCA_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  plan:  { text: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  do:    { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  check: { text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  act:   { text: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
}

const FREQ_LABELS: Record<string, string> = {
  one_off: 'One-off', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
}

const TASK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  attestation:         { label: 'Attestation',   color: 'text-blue-600 bg-blue-50' },
  process_check:       { label: 'Process Check', color: 'text-emerald-600 bg-emerald-50' },
  evidence_submission: { label: 'Evidence',      color: 'text-amber-600 bg-amber-50' },
  policy_ack:          { label: 'Policy Ack',    color: 'text-violet-600 bg-violet-50' },
  training:            { label: 'Training',      color: 'text-teal-600 bg-teal-50' },
}

const ISMS_DOMAIN_LABELS: Record<string, string> = {
  policy_governance:   'Policy & Governance',
  risk_management:     'Risk Management',
  incident_management: 'Incident Mgmt',
  business_continuity: 'Business Continuity',
  supply_chain:        'Supply Chain',
  access_control:      'Access Control & HR',
  asset_management:    'Asset & Change Mgmt',
  audit_training:      'Audit & Training',
}

const ARTICLE_21_LABELS: Record<string, string> = {
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

/* ── Date helpers ──────────────────────────────────────────────── */

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T23:59:59')
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyLabel(days: number | null, status: string): { text: string; color: string } {
  if (status === 'completed') return { text: 'Completed', color: 'text-emerald-600' }
  if (days === null) return { text: '', color: 'text-muted-foreground' }
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: 'text-red-600' }
  if (days === 0) return { text: 'Due today', color: 'text-red-600' }
  if (days <= 3) return { text: `${days}d left`, color: 'text-amber-600' }
  if (days <= 7) return { text: `${days}d left`, color: 'text-amber-500' }
  return { text: `${days}d left`, color: 'text-muted-foreground' }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── Action Menu ───────────────────────────────────────────────── */

function ActionMenu({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg shadow-black/10 py-1.5 z-50 min-w-[180px]">
      {children}
    </div>
  )
}

function ActionMenuItem({ icon: Icon, label, onClick, danger }: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full px-3.5 py-2 text-sm transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-foreground hover:bg-muted'
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

/* ── Main Component ────────────────────────────────────────────── */

export default function MyTasks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accountId } = useAuth()

  const [tasks, setTasks] = useState<MyPeopleTask[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completionHistories, setCompletionHistories] = useState<Record<string, PeopleTaskCompletion[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Completion modal state
  const [confirmTask, setConfirmTask] = useState<MyPeopleTask | null>(null)
  const [attestResponse, setAttestResponse] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reschedule modal state
  const [rescheduleTask, setRescheduleTask] = useState<MyPeopleTask | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleCategory, setRescheduleCategory] = useState('other')
  const [rescheduling, setRescheduling] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')

  // Delegate modal state
  const [delegateTask, setDelegateTask] = useState<MyPeopleTask | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [delegating, setDelegating] = useState(false)
  const [delegateError, setDelegateError] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  // Mark N/A modal state
  const [naTask, setNaTask] = useState<MyPeopleTask | null>(null)
  const [naReason, setNaReason] = useState('')
  const [markingNa, setMarkingNa] = useState(false)
  const [naError, setNaError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await fetchMyPeopleTasks())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const overdue = tasks.filter(t => t.currentPeriodStatus === 'overdue')
  const pending = tasks.filter(t => t.currentPeriodStatus === 'pending')
  const completed = tasks.filter(t => t.currentPeriodStatus === 'completed')

  /* ── Expand / collapse with history fetch ──────────────────── */

  const toggleExpand = async (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null)
      return
    }
    setExpandedId(taskId)
    if (!completionHistories[taskId] && accountId) {
      setLoadingHistory(taskId)
      try {
        const history = await fetchTaskCompletions(accountId, taskId)
        setCompletionHistories(prev => ({ ...prev, [taskId]: history }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingHistory(null)
      }
    }
  }

  /* ── Complete task ─────────────────────────────────────────── */

  const handleComplete = async () => {
    if (!confirmTask || !accountId) return
    setCompleting(confirmTask.id)
    setError('')

    try {
      let evidenceId: string | undefined
      if (evidenceFile) {
        setUploading(true)
        try {
          const result = await uploadEvidenceV2(accountId, evidenceFile, `Evidence for: ${confirmTask.title}`)
          evidenceId = result.id
        } catch (e: any) {
          setError(`Evidence upload failed: ${e?.message || 'Unknown error'}`)
          setUploading(false)
          setCompleting(null)
          return
        }
        setUploading(false)
      }

      await completePeopleTask(accountId, confirmTask.id, {
        attestation_response: attestResponse || undefined,
        evidence_id: evidenceId,
      })

      setConfirmTask(null)
      setAttestResponse('')
      setConfirmed(false)
      setEvidenceFile(null)
      setCompletionHistories(prev => {
        const next = { ...prev }
        delete next[confirmTask.id]
        return next
      })
      await load()
    } catch (e: any) {
      if (e?.status === 409) {
        setError('Already completed for this period')
      } else {
        setError(e?.message || 'Failed to complete task')
      }
    } finally {
      setCompleting(null)
    }
  }

  /* ── Reschedule task ───────────────────────────────────────── */

  const handleReschedule = async () => {
    if (!rescheduleTask || !accountId || !rescheduleDate || !rescheduleReason) return
    setRescheduling(true)
    setRescheduleError('')
    try {
      await reschedulePeopleTask(accountId, rescheduleTask.id, {
        new_due_date: rescheduleDate,
        reason: rescheduleReason,
        category: rescheduleCategory,
      })
      setRescheduleTask(null)
      setRescheduleDate('')
      setRescheduleReason('')
      setRescheduleCategory('other')
      await load()
    } catch (e: any) {
      setRescheduleError(e?.message || 'Failed to reschedule')
    } finally {
      setRescheduling(false)
    }
  }

  /* ── Delegate task ─────────────────────────────────────────── */

  const openDelegate = async (task: MyPeopleTask) => {
    setDelegateTask(task)
    setSelectedMemberId('')
    setDelegateError('')
    setOpenMenuId(null)
    if (teamMembers.length === 0) {
      setLoadingMembers(true)
      try {
        const members = await getTeamMembers()
        setTeamMembers(members.filter(m => m.isActive && m.inviteAccepted))
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingMembers(false)
      }
    }
  }

  const handleDelegate = async () => {
    if (!delegateTask || !accountId || !selectedMemberId) return
    setDelegating(true)
    setDelegateError('')
    try {
      await updatePeopleTask(accountId, delegateTask.id, {
        assignee_user_id: selectedMemberId,
        change_reason: 'Delegated to team member',
      })
      setDelegateTask(null)
      setSelectedMemberId('')
      await load()
    } catch (e: any) {
      setDelegateError(e?.message || 'Failed to delegate task')
    } finally {
      setDelegating(false)
    }
  }

  /* ── Mark Not Applicable ───────────────────────────────────── */

  const handleMarkNA = async () => {
    if (!naTask || !accountId || !naReason) return
    setMarkingNa(true)
    setNaError('')
    try {
      await updatePeopleTask(accountId, naTask.id, {
        active: false,
        change_reason: `Marked not applicable: ${naReason}`,
      })
      setNaTask(null)
      setNaReason('')
      await load()
    } catch (e: any) {
      setNaError(e?.message || 'Failed to update task')
    } finally {
      setMarkingNa(false)
    }
  }

  /* ── Task Row ──────────────────────────────────────────────── */

  const TaskRow = ({ task }: { task: MyPeopleTask }) => {
    const isOverdue = task.currentPeriodStatus === 'overdue'
    const isDone = task.currentPeriodStatus === 'completed'
    const isExpanded = expandedId === task.id
    const days = daysUntil(task.nextDueDate)
    const urgency = urgencyLabel(days, task.currentPeriodStatus)
    const pdca = PDCA_COLORS[task.pdcaPhase]
    const taskType = TASK_TYPE_LABELS[task.taskType]
    const history = completionHistories[task.id]
    const menuOpen = openMenuId === task.id

    return (
      <div className={`rounded-xl border transition-all duration-150 ${
        isDone
          ? 'bg-emerald-50/50 border-emerald-200/60'
          : isOverdue
          ? 'bg-red-50/50 border-red-200/60'
          : 'bg-card border-border hover:border-border/80'
      }`}>
        {/* Main row */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
          onClick={() => toggleExpand(task.id)}
        >
          {/* Expand chevron */}
          <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Status icon */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDone ? 'bg-emerald-100' : isOverdue ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {isDone ? <CheckCircle size={15} className="text-emerald-600" /> :
             isOverdue ? <AlertTriangle size={15} className="text-red-600" /> :
             <Clock size={15} className="text-amber-600" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${pdca?.bg || ''} ${pdca?.text || 'text-muted-foreground'}`}>
                {task.pdcaPhase}
              </span>
              {taskType && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${taskType.color}`}>
                  {taskType.label}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">Art.21(2)({task.article21Subsection})</span>
              <span className="text-[10px] text-muted-foreground">{FREQ_LABELS[task.frequency] || task.frequency}</span>
              {task.relatedControlId && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/controls?open=${task.relatedControlId}`) }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/5 text-primary text-[10px] hover:bg-primary/10 transition-colors"
                  title="View related control"
                >
                  <Shield size={9} /> {task.relatedControlId}
                </button>
              )}
              {task.requiresEvidence && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px]">
                  <Paperclip size={9} /> Evidence req.
                </span>
              )}
            </div>
          </div>

          {/* Right side: urgency + date + actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Due date & urgency */}
            <div className="text-right hidden sm:block">
              {task.nextDueDate && (
                <div className="text-[11px] text-muted-foreground">{formatDate(task.nextDueDate)}</div>
              )}
              <div className={`text-[11px] font-medium ${urgency.color}`}>{urgency.text}</div>
            </div>

            {/* Period key */}
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded hidden md:inline">
              {task.currentPeriodKey}
            </span>

            {/* Actions */}
            {!isDone ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    setConfirmTask(task)
                    setAttestResponse('')
                    setError('')
                    setConfirmed(false)
                    setEvidenceFile(null)
                  }}
                >
                  Complete
                </Button>

                {/* More actions menu */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(menuOpen ? null : task.id)
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {menuOpen && (
                    <ActionMenu onClose={() => setOpenMenuId(null)}>
                      <ActionMenuItem
                        icon={CalendarClock}
                        label={isOverdue ? 'Reschedule' : 'Extend Due Date'}
                        onClick={() => {
                          setOpenMenuId(null)
                          setRescheduleTask(task)
                          setRescheduleDate('')
                          setRescheduleReason('')
                          setRescheduleCategory('other')
                          setRescheduleError('')
                        }}
                      />
                      <ActionMenuItem
                        icon={UserPlus}
                        label="Delegate"
                        onClick={() => openDelegate(task)}
                      />
                      <div className="border-t border-border my-1" />
                      <ActionMenuItem
                        icon={Ban}
                        label="Mark Not Applicable"
                        danger
                        onClick={() => {
                          setOpenMenuId(null)
                          setNaTask(task)
                          setNaReason('')
                          setNaError('')
                        }}
                      />
                    </ActionMenu>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-emerald-600 px-2 py-1 flex items-center gap-1">
                <CheckCircle size={12} /> Done
              </span>
            )}
          </div>
        </div>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border/50 mx-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Left: Task details */}
              <div className="space-y-3">
                {task.description && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</div>
                    <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
                  </div>
                )}

                {task.ismsDomain && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">ISMS Domain</div>
                    <span className="text-sm text-foreground/80">{ISMS_DOMAIN_LABELS[task.ismsDomain] || task.ismsDomain}</span>
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">NIS2 Reference</div>
                  <span className="text-sm text-foreground/80">
                    Art. 21(2)({task.article21Subsection}) — {ARTICLE_21_LABELS[task.article21Subsection] || ''}
                  </span>
                </div>

                {/* Due date detail */}
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Schedule</div>
                  <div className="flex items-center gap-3 text-sm text-foreground/80">
                    <span>{FREQ_LABELS[task.frequency] || task.frequency}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>Due {formatDate(task.nextDueDate)}</span>
                    {days !== null && (
                      <>
                        <span className="text-muted-foreground">|</span>
                        <span className={urgencyLabel(days, task.currentPeriodStatus).color}>
                          {urgencyLabel(days, task.currentPeriodStatus).text}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {task.attestationStatement && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Attestation Required</div>
                    <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                      <p className="text-xs text-foreground/70 italic leading-relaxed">"{task.attestationStatement}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Connections & History */}
              <div className="space-y-3">
                {task.relatedControlId && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Related Control</div>
                    <button
                      onClick={() => navigate(`/controls?open=${task.relatedControlId}`)}
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
                    >
                      <Shield size={14} />
                      <span>{task.relatedControlId}</span>
                      <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                )}

                {/* Quick actions in expanded view */}
                {!isDone && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Actions</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setConfirmTask(task)
                          setAttestResponse('')
                          setError('')
                          setConfirmed(false)
                          setEvidenceFile(null)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy text-white text-xs font-medium hover:bg-navy/90 transition-colors"
                      >
                        <CheckCircle size={12} /> Complete
                      </button>
                      <button
                        onClick={() => {
                          setRescheduleTask(task)
                          setRescheduleDate('')
                          setRescheduleReason('')
                          setRescheduleCategory('other')
                          setRescheduleError('')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        <CalendarClock size={12} /> {isOverdue ? 'Reschedule' : 'Extend'}
                      </button>
                      <button
                        onClick={() => openDelegate(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                      >
                        <UserPlus size={12} /> Delegate
                      </button>
                      <button
                        onClick={() => {
                          setNaTask(task)
                          setNaReason('')
                          setNaError('')
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                      >
                        <Ban size={12} /> Not Applicable
                      </button>
                    </div>
                  </div>
                )}

                {/* Completion history */}
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <History size={11} /> Completion History
                  </div>
                  {loadingHistory === task.id ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 size={12} className="animate-spin" /> Loading...
                    </div>
                  ) : history && history.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {history.slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-foreground">{c.periodKey}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              by {c.userName || c.userEmail || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {c.attestedAt ? new Date(c.attestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          {c.evidenceId && <Paperclip size={10} className="text-primary flex-shrink-0" />}
                        </div>
                      ))}
                      {history.length > 5 && (
                        <div className="text-[11px] text-muted-foreground text-center py-1">
                          +{history.length - 5} more in history
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No completions yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── Loading state ─────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  /* ── Empty state ───────────────────────────────────────────── */

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
          <Shield size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('peopleTasks.myTasks.emptyTitle', 'No tasks assigned')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
          {t('peopleTasks.myTasks.emptyDescription', 'Tasks will appear here when baseline is set up or when assigned to you.')}
        </p>
      </div>
    )
  }

  /* ── Summary stats ─────────────────────────────────────────── */

  const totalTasks = tasks.length
  const doneCount = completed.length
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const domainSummary = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    const d = t.ismsDomain || 'unassigned'
    if (!acc[d]) acc[d] = { total: 0, done: 0 }
    acc[d].total++
    if (t.currentPeriodStatus === 'completed') acc[d].done++
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* ── Summary bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 bg-card border border-border rounded-xl px-5 py-4">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
            <span className="text-sm text-muted-foreground">completed this period</span>
          </div>
          <ProgressBar value={completionRate} color="bg-emerald-500" height="h-2" />
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{doneCount} of {totalTasks} tasks done</span>
          </div>
        </div>

        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200/60 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-700">{overdue.length}</div>
            <div className="text-[11px] text-red-500 mt-1">Needs attention</div>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending</span>
          </div>
          <div className="text-2xl font-bold text-amber-700">{pending.length}</div>
          <div className="text-[11px] text-amber-500 mt-1">Awaiting completion</div>
        </div>
        {overdue.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Done</span>
            </div>
            <div className="text-2xl font-bold text-emerald-700">{doneCount}</div>
            <div className="text-[11px] text-emerald-500 mt-1">This period</div>
          </div>
        )}
      </div>

      {/* ── ISMS domain mini-progress ──────────────────────────── */}
      {Object.keys(domainSummary).length > 1 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-3">Domain Progress</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(domainSummary)
              .filter(([k]) => k !== 'unassigned')
              .sort((a, b) => (a[1].done / a[1].total) - (b[1].done / b[1].total))
              .map(([domain, { total, done }]) => {
                const pct = Math.round((done / total) * 100)
                return (
                  <div key={domain} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-foreground/70 truncate">{ISMS_DOMAIN_LABELS[domain] || domain}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">{pct}%</span>
                    </div>
                    <ProgressBar
                      value={pct}
                      color={pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}
                      height="h-1"
                    />
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* ── Overdue section ────────────────────────────────────── */}
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-600" />
            <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide">
              Overdue ({overdue.length})
            </h3>
          </div>
          <div className="space-y-2">{overdue.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* ── Pending section ────────────────────────────────────── */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-600" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pending ({pending.length})
            </h3>
          </div>
          <div className="space-y-2">{pending.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* ── Completed section ──────────────────────────────────── */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Completed ({completed.length})
            </h3>
          </div>
          <div className="space-y-2">{completed.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* ── Completion Modal ───────────────────────────────────── */}
      {confirmTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-lg font-semibold text-foreground">Confirm Completion</h3>
              <button
                onClick={() => setConfirmTask(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Task context card */}
              <div className="bg-muted border border-border rounded-xl px-4 py-3 space-y-2">
                <div className="text-sm font-medium text-foreground">{confirmTask.title}</div>
                {confirmTask.description && (
                  <p className="text-xs text-foreground/60 leading-relaxed">{confirmTask.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className={`font-semibold uppercase px-1 py-0.5 rounded ${PDCA_COLORS[confirmTask.pdcaPhase]?.bg} ${PDCA_COLORS[confirmTask.pdcaPhase]?.text}`}>
                    {confirmTask.pdcaPhase}
                  </span>
                  <span>Art.21(2)({confirmTask.article21Subsection})</span>
                  <span>{FREQ_LABELS[confirmTask.frequency] || confirmTask.frequency}</span>
                  <span className="ml-auto font-medium">{confirmTask.currentPeriodKey}</span>
                </div>
                {confirmTask.relatedControlId && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Shield size={11} className="text-primary" />
                    <span className="text-xs text-primary">{confirmTask.relatedControlId}</span>
                    <span className="text-[10px] text-muted-foreground">— linked control</span>
                  </div>
                )}
              </div>

              {/* Attestation statement */}
              {confirmTask.attestationStatement && (
                <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Attestation Statement</div>
                      <p className="text-sm text-foreground/70 leading-relaxed">{confirmTask.attestationStatement}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 ml-7 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded border-border/80 bg-card text-primary focus:ring-cyan-500"
                    />
                    <span className="text-sm text-foreground">I confirm this statement is accurate</span>
                  </label>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes (optional)</label>
                <textarea
                  value={attestResponse}
                  onChange={e => setAttestResponse(e.target.value)}
                  rows={3}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder="Add notes, observations, or comments..."
                />
              </div>

              {/* Evidence upload */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Evidence {confirmTask.requiresEvidence ? <span className="text-red-500">*</span> : '(optional)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.[0]) setEvidenceFile(e.target.files[0])
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <Upload size={14} className="text-muted-foreground" />
                    {evidenceFile ? 'Change file' : 'Attach evidence'}
                  </button>
                  {evidenceFile && (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip size={12} className="text-primary flex-shrink-0" />
                      <span className="text-xs text-foreground truncate">{evidenceFile.name}</span>
                      <button
                        onClick={() => setEvidenceFile(null)}
                        className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="secondary" onClick={() => setConfirmTask(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={completing === confirmTask.id || uploading}
                onClick={handleComplete}
                disabled={
                  (confirmTask.attestationStatement ? !confirmed : false) ||
                  (confirmTask.requiresEvidence && !evidenceFile)
                }
              >
                <CheckCircle size={14} />
                {uploading ? 'Uploading...' : 'I Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule / Extend Modal ──────────────────────────── */}
      {rescheduleTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-lg font-semibold text-foreground">
                {rescheduleTask.currentPeriodStatus === 'overdue' ? 'Reschedule Task' : 'Extend Due Date'}
              </h3>
              <button
                onClick={() => setRescheduleTask(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className={`rounded-xl px-4 py-3 border ${
                rescheduleTask.currentPeriodStatus === 'overdue'
                  ? 'bg-red-50 border-red-200/60'
                  : 'bg-muted border-border'
              }`}>
                <div className="text-sm font-medium text-foreground mb-1">{rescheduleTask.title}</div>
                <div className="flex items-center gap-2 text-xs">
                  {rescheduleTask.currentPeriodStatus === 'overdue' ? (
                    <span className="text-red-600 font-medium">Overdue: was due {formatDate(rescheduleTask.nextDueDate)}</span>
                  ) : (
                    <span className="text-muted-foreground">Current due date: {formatDate(rescheduleTask.nextDueDate)}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">New Due Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
                <select
                  value={rescheduleCategory}
                  onChange={e => setRescheduleCategory(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  <option value="resource_constraint">Resource Constraint</option>
                  <option value="dependency">Dependency on Other Task</option>
                  <option value="scope_change">Scope Change</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  rows={2}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder={rescheduleTask.currentPeriodStatus === 'overdue'
                    ? 'Why is this task being rescheduled?'
                    : 'Why does this task need more time?'
                  }
                />
              </div>

              {rescheduleError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {rescheduleError}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="secondary" onClick={() => setRescheduleTask(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={rescheduling}
                onClick={handleReschedule}
                disabled={!rescheduleDate || !rescheduleReason}
              >
                <CalendarClock size={14} /> {rescheduleTask.currentPeriodStatus === 'overdue' ? 'Reschedule' : 'Extend'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delegate Modal ─────────────────────────────────────── */}
      {delegateTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-lg font-semibold text-foreground">Delegate Task</h3>
              <button
                onClick={() => setDelegateTask(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <div className="text-sm font-medium text-foreground mb-1">{delegateTask.title}</div>
                <div className="text-xs text-muted-foreground">
                  {FREQ_LABELS[delegateTask.frequency]} | Due {formatDate(delegateTask.nextDueDate)}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Assign to <span className="text-red-500">*</span></label>
                {loadingMembers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 size={14} className="animate-spin" /> Loading team members...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No active team members found. Invite members from the Team page.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {teamMembers.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMemberId(m.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                          selectedMemberId === m.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-card border-border hover:bg-muted'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-primary uppercase flex-shrink-0">
                          {(m.name || m.email)[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{m.name || 'Unnamed'}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded">{m.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {delegateError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {delegateError}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="secondary" onClick={() => setDelegateTask(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={delegating}
                onClick={handleDelegate}
                disabled={!selectedMemberId}
              >
                <UserPlus size={14} /> Delegate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Not Applicable Modal ──────────────────────────── */}
      {naTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-lg font-semibold text-foreground">Mark Not Applicable</h3>
              <button
                onClick={() => setNaTask(null)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-foreground mb-1">This action deactivates the task</div>
                    <p className="text-xs text-foreground/60 leading-relaxed">
                      Marking a task as not applicable removes it from your active task list. This is logged in the audit trail for compliance purposes (ISO 27001 Statement of Applicability).
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted border border-border rounded-xl px-4 py-3">
                <div className="text-sm font-medium text-foreground">{naTask.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Art.21(2)({naTask.article21Subsection}) — {ARTICLE_21_LABELS[naTask.article21Subsection] || ''}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={naReason}
                  onChange={e => setNaReason(e.target.value)}
                  rows={3}
                  className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder="Explain why this task is not applicable to your organisation..."
                />
              </div>

              {naError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {naError}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="secondary" onClick={() => setNaTask(null)}>Cancel</Button>
              <Button
                variant="primary"
                loading={markingNa}
                onClick={handleMarkNA}
                disabled={!naReason}
              >
                <Ban size={14} /> Mark Not Applicable
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
