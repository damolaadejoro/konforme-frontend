import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, AlertTriangle, Clock, FileText, Shield, Loader2, X } from 'lucide-react'
import { Card, Button, ProgressBar } from '../components/ui'
import { fetchMyPeopleTasks, completePeopleTask } from '../services/api'
import type { MyPeopleTask } from '../types/peopleTasks'

const PDCA_COLORS: Record<string, string> = {
  plan: 'text-blue-400 bg-blue-500/10',
  do: 'text-emerald-400 bg-emerald-500/10',
  check: 'text-amber-400 bg-amber-500/10',
  act: 'text-purple-400 bg-purple-500/10',
}

const FREQ_LABELS: Record<string, string> = {
  one_off: 'One-off',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
}

export default function MyTasks() {
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const [tasks, setTasks] = useState<MyPeopleTask[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [confirmTask, setConfirmTask] = useState<MyPeopleTask | null>(null)
  const [attestResponse, setAttestResponse] = useState('')
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setTasks(await fetchMyPeopleTasks())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const overdue = tasks.filter(t => t.currentPeriodStatus === 'overdue')
  const pending = tasks.filter(t => t.currentPeriodStatus === 'pending')
  const completed = tasks.filter(t => t.currentPeriodStatus === 'completed')

  const handleComplete = async () => {
    if (!confirmTask || !accountId) return
    setCompleting(confirmTask.id)
    setError('')
    try {
      await completePeopleTask(accountId, confirmTask.id, {
        attestation_response: attestResponse || undefined,
      })
      setConfirmTask(null)
      setAttestResponse('')
      setConfirmed(false)
      await load()
    } catch (e: any) {
      if (e?.status === 409) {
        setError(t('peopleTasks.myTasks.alreadyCompleted', 'Already completed for this period'))
      } else {
        setError(e?.message || 'Failed to complete task')
      }
    } finally {
      setCompleting(null)
    }
  }

  const TaskRow = ({ task }: { task: MyPeopleTask }) => {
    const isOverdue = task.currentPeriodStatus === 'overdue'
    const isDone = task.currentPeriodStatus === 'completed'
    return (
      <div className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-150 ${
        isDone
          ? 'bg-emerald-500/5 border-emerald-500/15'
          : isOverdue
          ? 'bg-red-500/5 border-red-500/15 hover:border-red-500/30'
          : 'bg-navy-800/30 border-navy-700/30 hover:border-navy-600/50'
      }`}>
        {/* Status icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isDone ? 'bg-emerald-500/15' : isOverdue ? 'bg-red-500/15' : 'bg-amber-500/10'
        }`}>
          {isDone ? <CheckCircle size={17} className="text-emerald-400" /> :
           isOverdue ? <AlertTriangle size={17} className="text-red-400" /> :
           <Clock size={17} className="text-amber-400" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{task.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PDCA_COLORS[task.pdcaPhase] || 'text-slate-400 bg-navy-700'}`}>
              {task.pdcaPhase}
            </span>
            <span className="text-[11px] text-slate-500">({task.article21Subsection})</span>
            <span className="text-[11px] text-slate-500">{FREQ_LABELS[task.frequency] || task.frequency}</span>
            {task.nextDueDate && (
              <span className={`text-[11px] ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                Due {task.nextDueDate}
              </span>
            )}
          </div>
        </div>

        {/* Period badge + action */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-slate-500 bg-navy-800 px-2 py-0.5 rounded">
            {task.currentPeriodKey}
          </span>
          {!isDone && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => { setConfirmTask(task); setAttestResponse(''); setError(''); setConfirmed(false) }}
            >
              {t('peopleTasks.myTasks.complete', 'Complete')}
            </Button>
          )}
          {isDone && (
            <span className="text-xs font-medium text-emerald-400 px-2 py-1">
              {t('peopleTasks.status.completed', 'Completed')}
            </span>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-cyan-400" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-navy-800 border border-navy-700 flex items-center justify-center mb-4">
          <Shield size={28} className="text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {t('peopleTasks.myTasks.emptyTitle', 'No tasks assigned')}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm text-center">
          {t('peopleTasks.myTasks.emptyDescription', 'Tasks will appear here when baseline is set up or when assigned to you.')}
        </p>
      </div>
    )
  }

  // Summary stats
  const totalTasks = tasks.length
  const doneCount = completed.length
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-6 bg-navy-800/30 border border-navy-700/30 rounded-xl px-5 py-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-white">{completionRate}%</span>
            <span className="text-sm text-slate-400">{t('peopleTasks.myTasks.completionRate', 'completed this period')}</span>
          </div>
          <ProgressBar value={completionRate} color="bg-cyan-500" height="h-1.5" />
        </div>
        <div className="flex items-center gap-5 text-center">
          {overdue.length > 0 && (
            <div>
              <div className="text-xl font-bold text-red-400">{overdue.length}</div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">{t('peopleTasks.myTasks.overdue', 'Overdue')}</div>
            </div>
          )}
          <div>
            <div className="text-xl font-bold text-amber-400">{pending.length}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">{t('peopleTasks.myTasks.pending', 'Pending')}</div>
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400">{doneCount}</div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">{t('peopleTasks.myTasks.completed', 'Done')}</div>
          </div>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide">
              {t('peopleTasks.myTasks.overdue', 'Overdue')} ({overdue.length})
            </h3>
          </div>
          <div className="space-y-2">{overdue.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              {t('peopleTasks.myTasks.pending', 'Pending')} ({pending.length})
            </h3>
          </div>
          <div className="space-y-2">{pending.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={14} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              {t('peopleTasks.myTasks.completed', 'Completed')} ({completed.length})
            </h3>
          </div>
          <div className="space-y-2">{completed.map(task => <TaskRow key={task.id} task={task} />)}</div>
        </div>
      )}

      {/* Attestation Modal */}
      {confirmTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h3 className="text-lg font-semibold text-white">
                {t('peopleTasks.myTasks.confirmCompletion', 'Confirm Completion')}
              </h3>
              <button
                onClick={() => setConfirmTask(null)}
                className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-navy-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-navy-800/50 border border-navy-700/50 rounded-xl px-4 py-3">
                <div className="text-sm font-medium text-white mb-1">{confirmTask.title}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={`font-semibold uppercase px-1 py-0.5 rounded ${PDCA_COLORS[confirmTask.pdcaPhase]}`}>
                    {confirmTask.pdcaPhase}
                  </span>
                  <span>({confirmTask.article21Subsection})</span>
                  <span>{FREQ_LABELS[confirmTask.frequency] || confirmTask.frequency}</span>
                  <span className="ml-auto">{confirmTask.currentPeriodKey}</span>
                </div>
              </div>

              {confirmTask.attestationStatement && (
                <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-cyan-400 uppercase tracking-wide mb-1">Attestation Statement</div>
                      <p className="text-sm text-slate-300 leading-relaxed">{confirmTask.attestationStatement}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 ml-7 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={e => setConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded border-navy-600 bg-navy-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-white">I confirm this statement is accurate</span>
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">
                  {t('peopleTasks.myTasks.attestationResponse', 'Notes (optional)')}
                </label>
                <textarea
                  value={attestResponse}
                  onChange={e => setAttestResponse(e.target.value)}
                  rows={3}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
                  placeholder={t('peopleTasks.myTasks.responsePlaceholder', 'Add notes or comments...')}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="secondary" onClick={() => setConfirmTask(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                loading={completing === confirmTask.id}
                onClick={handleComplete}
                disabled={confirmTask.attestationStatement ? !confirmed : false}
              >
                <CheckCircle size={14} />
                {t('peopleTasks.myTasks.confirmButton', 'I Confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
