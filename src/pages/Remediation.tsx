import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ListTodo,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  X,
  Calendar,
  Shield,
  FileText,
  Bot,
  Loader2,
} from 'lucide-react'
import { Card, Button, InfoTooltip, Tooltip } from '../components/ui'
import { useRemediation } from '../hooks/useRemediation'
import { QUESTION_MAP, ASSESSMENT_QUESTIONS, ARTICLES } from '../data/assessmentQuestions'
import {
  isConnected,
  closeTask as apiCloseTask,
  dismissTask as apiDismissTask,
  rescheduleTask as apiRescheduleTask,
  getRemediationPlans,
  createRemediationPlan,
  approvePlan,
  rejectPlan,
  getStoredAuth,
  type RemediationPlanSummary,
} from '../services/api'
import { useAuth } from '../context/AuthContext'
import type { RemediationTask } from '../types/assessment'

type StatusFilter = 'all' | 'open' | 'in_progress' | 'completed' | 'dismissed'

// --- Modals ---

function CloseTaskModal({ task, onClose, onConfirm }: {
  task: RemediationTask
  onClose: () => void
  onConfirm: (data: { closure_note?: string; closure_evidence_id?: string }) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('remediation.closeTitle', 'Close Task')}</h3>
        <p className="text-sm text-slate-400 mb-4">{t('remediation.closeDescription', 'Provide a closure note or evidence to close this task.')}</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('remediation.closureNotePlaceholder', 'Describe how this was resolved...')}
          className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none mb-4"
          rows={4}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => onConfirm({ closure_note: note || undefined })} disabled={!note.trim()}>
            {t('remediation.closeConfirm', 'Close Task')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DismissTaskModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('remediation.dismissTitle', 'Dismiss Task')}</h3>
        <p className="text-sm text-slate-400 mb-4">{t('remediation.dismissDescription', 'Please provide a reason for dismissing this task.')}</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('remediation.dismissReasonPlaceholder', 'Reason for dismissal...')}
          className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none mb-4"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            {t('remediation.dismissConfirm', 'Dismiss')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RescheduleTaskModal({ task, onClose, onConfirm }: {
  task: RemediationTask
  onClose: () => void
  onConfirm: (data: { new_due_date: string; reason: string; category: string }) => void
}) {
  const { t } = useTranslation()
  const [newDate, setNewDate] = useState('')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('other')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('remediation.rescheduleTitle', 'Reschedule Task')}</h3>
        {(task.rescheduleCount ?? 0) >= 2 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 mb-4">
            {t('remediation.rescheduleWarning', 'This task has been rescheduled {{count}} times already.', { count: task.rescheduleCount })}
          </div>
        )}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.newDueDate', 'New Due Date')}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.rescheduleCategory', 'Category')}
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="resource_constraint">{t('remediation.categoryResource', 'Resource Constraint')}</option>
              <option value="dependency">{t('remediation.categoryDependency', 'Dependency')}</option>
              <option value="scope_change">{t('remediation.categoryScopeChange', 'Scope Change')}</option>
              <option value="other">{t('remediation.categoryOther', 'Other')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.rescheduleReason', 'Reason')}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder={t('remediation.rescheduleReasonPlaceholder', 'Why is this being rescheduled?')}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              rows={3}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => onConfirm({ new_due_date: newDate, reason, category })} disabled={!newDate || !reason.trim()}>
            {t('remediation.rescheduleConfirm', 'Reschedule')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreatePlanModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: (data: { title: string; description: string; treatment_type: string; target_date?: string }) => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [treatmentType, setTreatmentType] = useState('mitigate')
  const [targetDate, setTargetDate] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('remediation.createPlanTitle', 'Create Remediation Plan')}</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.planTitleLabel', 'Plan Title')}
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              placeholder={t('remediation.planTitlePlaceholder', 'e.g. Network Security Improvement Plan')}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.treatmentTypeLabel', 'Treatment Type')}
            </label>
            <select
              value={treatmentType}
              onChange={e => setTreatmentType(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="mitigate">{t('remediation.treatmentMitigate', 'Mitigate')}</option>
              <option value="transfer">{t('remediation.treatmentTransfer', 'Transfer')}</option>
              <option value="avoid">{t('remediation.treatmentAvoid', 'Avoid')}</option>
              <option value="accept">{t('remediation.treatmentAccept', 'Accept')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.targetDateLabel', 'Target Date')}
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
              {t('remediation.descriptionLabel', 'Description')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
              rows={3}
              placeholder={t('remediation.planDescriptionPlaceholder', 'Describe the plan...')}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
          <Button onClick={() => onConfirm({ title, description, treatment_type: treatmentType, target_date: targetDate || undefined })} disabled={!title.trim()}>
            {t('remediation.createPlanConfirm', 'Create Plan')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Main Component ---

export default function Remediation() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const { tasks, loading, addTask, updateTask, fetchTasks } = useRemediation()
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ question_id: '', title: '', description: '', priority: 'medium' })

  // Plans state
  const [plans, setPlans] = useState<RemediationPlanSummary[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [showCreatePlan, setShowCreatePlan] = useState(false)

  // Modal state
  const [closingTask, setClosingTask] = useState<RemediationTask | null>(null)
  const [dismissingTask, setDismissingTask] = useState<RemediationTask | null>(null)
  const [reschedulingTask, setReschedulingTask] = useState<RemediationTask | null>(null)

  // Load plans
  React.useEffect(() => {
    if (!accountId) return
    setPlansLoading(true)
    getRemediationPlans(accountId).then(setPlans).catch(() => {}).finally(() => setPlansLoading(false))
  }, [accountId])

  const TREATMENT_COLORS: Record<string, string> = {
    mitigate: 'bg-blue-500/20 text-blue-400',
    transfer: 'bg-purple-500/20 text-purple-400',
    avoid: 'bg-amber-500/20 text-amber-400',
    accept: 'bg-emerald-500/20 text-emerald-400',
  }

  const PLAN_STATUS_COLORS: Record<string, string> = {
    draft: 'bg-navy-700/50 text-slate-400',
    pending_approval: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-red-500/20 text-red-400',
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    open: { label: t('remediation.statusOpen'), color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: <AlertTriangle size={14} /> },
    in_progress: { label: t('remediation.statusInProgress'), color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/20', icon: <Clock size={14} /> },
    completed: { label: t('remediation.statusCompleted'), color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={14} /> },
    dismissed: { label: t('remediation.statusDismissed'), color: 'text-navy-400', bgColor: 'bg-navy-700/50 border-navy-600', icon: <X size={14} /> },
  }

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const connected = isConnected()

  const statusCounts = {
    all: tasks.length,
    open: tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    dismissed: tasks.filter(t => t.status === 'dismissed').length,
  }

  const handleCreateTask = async () => {
    if (!newTask.question_id || !newTask.title) return
    await addTask(newTask)
    setNewTask({ question_id: '', title: '', description: '', priority: 'medium' })
    setShowCreate(false)
  }

  const handleCloseTask = async (data: { closure_note?: string; closure_evidence_id?: string }) => {
    if (!accountId || !closingTask) return
    try {
      await apiCloseTask(accountId, closingTask.id, data)
      await fetchTasks()
    } catch (err) {
      console.error('Close task failed:', err)
    }
    setClosingTask(null)
  }

  const handleDismissTask = async (reason: string) => {
    if (!accountId || !dismissingTask) return
    try {
      await apiDismissTask(accountId, dismissingTask.id, reason)
      await fetchTasks()
    } catch (err) {
      console.error('Dismiss task failed:', err)
    }
    setDismissingTask(null)
  }

  const handleRescheduleTask = async (data: { new_due_date: string; reason: string; category: string }) => {
    if (!accountId || !reschedulingTask) return
    try {
      await apiRescheduleTask(accountId, reschedulingTask.id, data)
      await fetchTasks()
    } catch (err) {
      console.error('Reschedule task failed:', err)
    }
    setReschedulingTask(null)
  }

  const handleCreatePlan = async (data: { title: string; description: string; treatment_type: string; target_date?: string }) => {
    if (!accountId) return
    try {
      await createRemediationPlan(accountId, data)
      const updated = await getRemediationPlans(accountId)
      setPlans(updated)
    } catch (err) {
      console.error('Create plan failed:', err)
    }
    setShowCreatePlan(false)
  }

  const filterLabels: Record<StatusFilter, string> = {
    all: t('remediation.filterAll'),
    open: t('remediation.statusOpen'),
    in_progress: t('remediation.filterInProgress'),
    completed: t('remediation.statusCompleted'),
    dismissed: t('remediation.statusDismissed'),
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white">{t('remediation.pageTitle')}</h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">{t('remediation.pageSubtitle')}</p>
        </div>
        <Card>
          <div className="text-center py-16">
            <ListTodo size={48} className="text-navy-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-syne text-white mb-2">{t('remediation.connectTitle')}</h3>
            <p className="text-[14px] text-[#CBD8E8] max-w-md mx-auto mb-6">
              {t('remediation.connectDescription')}
            </p>
            <Button onClick={() => navigate('/settings')}>{t('remediation.goToSettingsButton')} <ChevronRight size={14} /></Button>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white flex items-center gap-2">
            {t('remediation.pageTitle')}
            <InfoTooltip content={t('remediation.pageTitleTooltip')} />
          </h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">
            {t('remediation.pageSubtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/assessment')}>
            <ArrowLeft size={14} /> {t('remediation.assessmentButton')}
          </Button>
          <Button variant="secondary" onClick={() => setShowCreatePlan(true)}>
            <Shield size={14} /> {t('remediation.createPlanButton', 'New Plan')}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> {t('remediation.createTaskButton')}
          </Button>
        </div>
      </div>

      {/* Plans section */}
      {plans.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            {t('remediation.plansHeading', 'Treatment Plans')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map(plan => {
              const progress = plan.taskCount > 0 ? Math.round(plan.completedTaskCount / plan.taskCount * 100) : 0
              return (
                <div
                  key={plan.id}
                  className="p-4 rounded-xl border border-navy-700/50 bg-navy-800/30 hover:bg-navy-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TREATMENT_COLORS[plan.treatmentType] || 'bg-navy-700 text-slate-400'}`}>
                      {plan.treatmentType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLAN_STATUS_COLORS[plan.status] || 'bg-navy-700 text-slate-400'}`}>
                      {plan.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1 truncate">{plan.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    {plan.targetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(plan.targetDate).toLocaleDateString('en-GB')}
                      </span>
                    )}
                    <span>{plan.completedTaskCount}/{plan.taskCount} {t('remediation.tasks', 'tasks')}</span>
                  </div>
                  <div className="w-full bg-navy-700 rounded-full h-1.5">
                    <div
                      className="bg-cyan-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {(['all', 'open', 'in_progress', 'completed', 'dismissed'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-3 rounded-lg border text-left transition-all ${
              filter === s
                ? 'bg-cyan-500/10 border-cyan-500/30'
                : 'bg-navy-900/40 border-navy-800 hover:border-navy-600'
            }`}
          >
            <div className="text-xs text-[#94b4d1] uppercase mb-1">
              {filterLabels[s]}
            </div>
            <div className={`text-xl font-bold font-syne ${filter === s ? 'text-cyan-400' : 'text-white'}`}>
              {statusCounts[s]}
            </div>
          </button>
        ))}
      </div>

      {/* Create task form */}
      {showCreate && (
        <Card>
          <h3 className="text-[16px] font-bold font-syne text-white mb-4">{t('remediation.createFormTitle')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
                {t('remediation.relatedQuestionLabel')}
              </label>
              <select
                value={newTask.question_id}
                onChange={(e) => {
                  const qid = e.target.value
                  const q = QUESTION_MAP[qid]
                  setNewTask(prev => ({
                    ...prev,
                    question_id: qid,
                    title: q ? `Remediate: ${q.question}` : prev.title,
                  }))
                }}
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('remediation.relatedQuestionPlaceholder')}</option>
                {ARTICLES.map(art => (
                  <optgroup key={art.id} label={`${art.article} — ${art.title}`}>
                    {ASSESSMENT_QUESTIONS.filter(q => q.article === art.article).map(q => (
                      <option key={q.id} value={q.id}>
                        [{q.severity}] {q.question}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
                {t('remediation.titleLabel')}
              </label>
              <input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                placeholder={t('remediation.titlePlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
                {t('remediation.descriptionLabel')}
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                rows={3}
                placeholder={t('remediation.descriptionPlaceholder')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-navy-200 uppercase tracking-wider block mb-1.5">
                {t('remediation.priorityLabel')}
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="critical">{t('remediation.priorityCritical')}</option>
                <option value="high">{t('remediation.priorityHigh')}</option>
                <option value="medium">{t('remediation.priorityMedium')}</option>
                <option value="low">{t('remediation.priorityLow')}</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>{t('remediation.cancelButton')}</Button>
              <Button onClick={handleCreateTask} disabled={!newTask.question_id || !newTask.title}>
                {t('remediation.createTaskButton')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ListTodo size={48} className="text-navy-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-syne text-white mb-2">
              {tasks.length === 0 ? t('remediation.noTasksYetTitle') : t('remediation.noMatchingTasksTitle')}
            </h3>
            <p className="text-[14px] text-[#CBD8E8] max-w-md mx-auto">
              {tasks.length === 0
                ? t('remediation.noTasksYetDescription')
                : t('remediation.noMatchingTasksDescription')}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-3">
            {filteredTasks.map(task => {
              const config = STATUS_CONFIG[task.status]
              const q = QUESTION_MAP[task.questionId]
              const priorityColors: Record<string, string> = {
                critical: 'text-red-400',
                high: 'text-orange-400',
                medium: 'text-yellow-400',
                low: 'text-blue-400',
              }

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-lg border transition-all ${config.bgColor}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-semibold ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                        <span className={`text-xs font-semibold ${priorityColors[task.priority] || 'text-navy-400'}`}>
                          {task.priority}
                        </span>
                        {q && <span className="text-xs text-navy-400 font-mono">{q.article}</span>}
                        {task.autoGenerated && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs">
                            <Bot size={10} /> {t('remediation.autoGenerated', 'Auto')}
                          </span>
                        )}
                        {task.chronicSlip && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs">
                            <AlertTriangle size={10} /> {t('remediation.chronicSlip', 'Chronic slip')}
                          </span>
                        )}
                        {(task.rescheduleCount ?? 0) > 0 && (
                          <span className="text-xs text-slate-500">
                            {t('remediation.rescheduled', '{{count}}x rescheduled', { count: task.rescheduleCount })}
                          </span>
                        )}
                      </div>
                      <h4 className="text-[15px] font-semibold text-white mb-1">{task.title}</h4>
                      {task.description && (
                        <p className="text-[13px] text-[#94b4d1] line-clamp-2">{task.description}</p>
                      )}
                      {task.dismissedReason && (
                        <p className="text-[12px] text-slate-500 mt-1 italic">
                          {t('remediation.dismissedReasonLabel', 'Dismissed')}: {task.dismissedReason}
                        </p>
                      )}
                      {task.closureNote && (
                        <p className="text-[12px] text-emerald-500/80 mt-1 italic">
                          {t('remediation.closureNoteLabel', 'Closure')}: {task.closureNote}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[12px] text-[#94b4d1]">
                        <span>{t('remediation.createdLabel')} {new Date(task.createdAt).toLocaleDateString('en-GB')}</span>
                        {task.assignedTo && <span>{t('remediation.assignedLabel')} {task.assignedTo}</span>}
                        {task.dueDate && <span>{t('remediation.dueLabel')} {new Date(task.dueDate).toLocaleDateString('en-GB')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {task.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateTask(task.id, { status: 'in_progress' })}
                        >
                          {t('remediation.startButton')}
                        </Button>
                      )}
                      {(task.status === 'open' || task.status === 'in_progress') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClosingTask(task)}
                          >
                            <CheckCircle size={12} /> {t('remediation.closeButton', 'Close')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReschedulingTask(task)}
                          >
                            <Calendar size={12} /> {t('remediation.rescheduleButton', 'Reschedule')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-navy-400"
                            onClick={() => setDismissingTask(task)}
                          >
                            {t('remediation.dismissButton')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Modals */}
      {closingTask && (
        <CloseTaskModal task={closingTask} onClose={() => setClosingTask(null)} onConfirm={handleCloseTask} />
      )}
      {dismissingTask && (
        <DismissTaskModal onClose={() => setDismissingTask(null)} onConfirm={handleDismissTask} />
      )}
      {reschedulingTask && (
        <RescheduleTaskModal task={reschedulingTask} onClose={() => setReschedulingTask(null)} onConfirm={handleRescheduleTask} />
      )}
      {showCreatePlan && (
        <CreatePlanModal onClose={() => setShowCreatePlan(false)} onConfirm={handleCreatePlan} />
      )}
    </div>
  )
}
