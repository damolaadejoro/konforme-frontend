import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { Clock, FileText, ChevronDown, CheckCircle, User, Calendar, Paperclip, Search, Loader2 } from 'lucide-react'
import { Card, Button, ProgressBar } from '../components/ui'
import { fetchPeopleTasks, fetchTaskCompletions } from '../services/api'
import type { PeopleTaskItem, PeopleTaskCompletion } from '../types/peopleTasks'

const PDCA_COLORS: Record<string, string> = {
  plan: 'text-blue-400 bg-blue-500/10',
  do: 'text-emerald-400 bg-emerald-500/10',
  check: 'text-amber-400 bg-amber-500/10',
  act: 'text-purple-400 bg-purple-500/10',
}

export default function TaskHistory() {
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const [tasks, setTasks] = useState<PeopleTaskItem[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [completions, setCompletions] = useState<PeopleTaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    fetchPeopleTasks(accountId, { active_only: false })
      .then(data => {
        setTasks(data)
        // Auto-select first task with completions, or first task
        const withCompletions = data.find(t => t.completionCount > 0)
        if (withCompletions) setSelectedTaskId(withCompletions.id)
        else if (data.length > 0) setSelectedTaskId(data[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accountId])

  useEffect(() => {
    if (!accountId || !selectedTaskId) {
      setCompletions([])
      return
    }
    setLoadingHistory(true)
    fetchTaskCompletions(accountId, selectedTaskId)
      .then(setCompletions)
      .catch(console.error)
      .finally(() => setLoadingHistory(false))
  }, [accountId, selectedTaskId])

  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const filteredTasks = searchQuery
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks

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
          <Clock size={28} className="text-navy-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {t('peopleTasks.history.emptyTitle', 'No tasks yet')}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm text-center">
          {t('peopleTasks.history.emptyDescription', 'Completion history will appear here once tasks are set up and completed.')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Left panel: task selector */}
      <div className="w-80 flex-shrink-0 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('peopleTasks.history.searchTasks', 'Search tasks...')}
            className="w-full bg-navy-800/60 border border-navy-700/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredTasks.map(task => {
            const isSelected = task.id === selectedTaskId
            return (
              <button
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 border ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-sm shadow-cyan-500/5'
                    : 'bg-transparent border-transparent hover:bg-navy-800/40 hover:border-navy-700/30'
                }`}
              >
                <div className="text-sm font-medium text-white truncate mb-1">{task.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PDCA_COLORS[task.pdcaPhase] || 'text-slate-400 bg-navy-700'}`}>
                    {task.pdcaPhase}
                  </span>
                  <span className="text-[11px] text-slate-500">({task.article21Subsection})</span>
                  <span className="text-[11px] text-slate-500 ml-auto">
                    {task.completionCount} {task.completionCount === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel: completion timeline */}
      <div className="flex-1 min-w-0">
        {selectedTask && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-white mb-1">{selectedTask.title}</h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className={`font-semibold uppercase px-1.5 py-0.5 rounded ${PDCA_COLORS[selectedTask.pdcaPhase] || ''}`}>
                {selectedTask.pdcaPhase}
              </span>
              <span>Art. 21(2)({selectedTask.article21Subsection})</span>
              <span className="capitalize">{selectedTask.frequency.replace('_', ' ')}</span>
              <span>{selectedTask.completionCount} total completions</span>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-cyan-400" />
          </div>
        ) : completions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-navy-700/50 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-navy-800 border border-navy-700 flex items-center justify-center mb-3">
              <FileText size={20} className="text-navy-500" />
            </div>
            <p className="text-sm text-slate-400">
              {t('peopleTasks.history.noCompletions', 'No completions recorded for this task yet.')}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-3 bottom-3 w-px bg-navy-700/50" />

            <div className="space-y-4">
              {completions.map((c, i) => (
                <div key={c.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mt-1">
                    <CheckCircle size={13} className="text-emerald-400" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-navy-800/40 border border-navy-700/40 rounded-xl p-4 hover:border-navy-600/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-white">{c.periodKey}</span>
                        <span className="text-xs text-slate-500 ml-3">
                          {c.attestedAt ? new Date(c.attestedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }) : ''}
                        </span>
                      </div>
                      {c.evidenceId && (
                        <span className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                          <Paperclip size={10} /> Evidence
                        </span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center text-[10px] font-bold text-cyan-400 uppercase">
                        {(c.userName || c.userEmail || '?')[0]}
                      </div>
                      <span className="text-sm text-slate-300">{c.userName || c.userEmail || 'Unknown'}</span>
                    </div>

                    {/* Attestation response */}
                    {c.attestationResponse && (
                      <div className="bg-navy-900/50 border border-navy-700/30 rounded-lg px-3 py-2 mt-2">
                        <p className="text-sm text-slate-300 italic leading-relaxed">"{c.attestationResponse}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
