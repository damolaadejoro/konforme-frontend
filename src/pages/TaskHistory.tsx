import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { Clock, FileText, ChevronDown, CheckCircle, User, Calendar, Paperclip, Search, Loader2 } from 'lucide-react'
import { Card, Button, ProgressBar } from '../components/ui'
import { fetchPeopleTasks, fetchTaskCompletions } from '../services/api'
import type { PeopleTaskItem, PeopleTaskCompletion } from '../types/peopleTasks'

const PDCA_COLORS: Record<string, string> = {
  plan: 'text-blue-600 bg-blue-50',
  do: 'text-emerald-600 bg-emerald-50',
  check: 'text-amber-600 bg-amber-50',
  act: 'text-purple-600 bg-purple-50',
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
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
          <Clock size={28} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('peopleTasks.history.emptyTitle', 'No tasks yet')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm text-center">
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
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('peopleTasks.history.searchTasks', 'Search tasks...')}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
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
                    ? 'bg-primary/10 border-primary/30 shadow-sm shadow-primary/5'
                    : 'bg-transparent border-transparent hover:bg-muted hover:border-border'
                }`}
              >
                <div className="text-sm font-medium text-foreground truncate mb-1">{task.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PDCA_COLORS[task.pdcaPhase] || 'text-muted-foreground bg-muted'}`}>
                    {task.pdcaPhase}
                  </span>
                  <span className="text-[11px] text-muted-foreground">({task.article21Subsection})</span>
                  <span className="text-[11px] text-muted-foreground ml-auto">
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
            <h3 className="text-base font-semibold text-foreground mb-1">{selectedTask.title}</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : completions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-3">
              <FileText size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t('peopleTasks.history.noCompletions', 'No completions recorded for this task yet.')}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />

            <div className="space-y-4">
              {completions.map((c, i) => (
                <div key={c.id} className="relative flex gap-4 pl-2">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mt-1">
                    <CheckCircle size={13} className="text-emerald-600" />
                  </div>

                  {/* Content card */}
                  <div className="flex-1 bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-foreground">{c.periodKey}</span>
                        <span className="text-xs text-muted-foreground ml-3">
                          {c.attestedAt ? new Date(c.attestedAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }) : ''}
                        </span>
                      </div>
                      {c.evidenceId && (
                        <span className="flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Paperclip size={10} /> Evidence
                        </span>
                      )}
                    </div>

                    {/* User info */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                        {(c.userName || c.userEmail || '?')[0]}
                      </div>
                      <span className="text-sm text-foreground/70">{c.userName || c.userEmail || 'Unknown'}</span>
                    </div>

                    {/* Attestation response */}
                    {c.attestationResponse && (
                      <div className="bg-muted border border-border rounded-lg px-3 py-2 mt-2">
                        <p className="text-sm text-foreground/70 italic leading-relaxed">"{c.attestationResponse}"</p>
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
