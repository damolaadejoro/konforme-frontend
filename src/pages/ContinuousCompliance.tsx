import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield, AlertTriangle, CheckCircle, Clock, RefreshCw, Plus, Filter, Loader2, X,
  FileText, Siren, Link, Lock, Server, ClipboardCheck, RotateCcw,
} from 'lucide-react'
import { Card, StatCard, ProgressBar, Button, SectionHeader } from '../components/ui'
import BaselineSetupWizard from '../components/BaselineSetupWizard'
import { fetchPeopleTasks, fetchISMSCoverage, instantiateBaseline } from '../services/api'
import type { PeopleTaskItem, ISMSCoverage, PDCAPhase, IsmsDomain } from '../types/peopleTasks'

const PDCA_META: Record<PDCAPhase, { label: string; color: string; bg: string; border: string }> = {
  plan: { label: 'Plan', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  do: { label: 'Do', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  check: { label: 'Check', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  act: { label: 'Act', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
}

const PROGRESS_COLORS: Record<PDCAPhase, string> = {
  plan: 'bg-blue-500', do: 'bg-emerald-500', check: 'bg-amber-500', act: 'bg-purple-500',
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-500',
  partial: 'bg-amber-500',
  at_risk: 'bg-red-500',
  not_started: 'bg-navy-600',
}

const ISMS_DOMAIN_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  policy_governance: { label: 'Policy & Governance', icon: <FileText size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  risk_management: { label: 'Risk Management', icon: <AlertTriangle size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  incident_management: { label: 'Incident Management', icon: <Siren size={16} />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  business_continuity: { label: 'Business Continuity', icon: <RotateCcw size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  supply_chain: { label: 'Supply Chain Security', icon: <Link size={16} />, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  access_control: { label: 'Access Control & HR', icon: <Lock size={16} />, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  asset_management: { label: 'Asset & Change Mgmt', icon: <Server size={16} />, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  audit_training: { label: 'Audit & Training', icon: <ClipboardCheck size={16} />, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
}

export default function ContinuousCompliance() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accountId } = useAuth()
  const [tasks, setTasks] = useState<PeopleTaskItem[]>([])
  const [coverage, setCoverage] = useState<ISMSCoverage | null>(null)
  const [loading, setLoading] = useState(true)
  const [setting, setSetting] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [filterPhase, setFilterPhase] = useState('')
  const [filterSub, setFilterSub] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [showWizard, setShowWizard] = useState(false)

  const load = async () => {
    if (!accountId) return
    setLoading(true)
    try {
      const [taskData, coverageData] = await Promise.all([
        fetchPeopleTasks(accountId, {
          ...(filterPhase && { pdca_phase: filterPhase }),
          ...(filterSub && { subsection: filterSub }),
          ...(filterType && { task_type: filterType }),
          ...(filterDomain && { isms_domain: filterDomain }),
        }),
        fetchISMSCoverage(accountId),
      ])
      setTasks(taskData)
      setCoverage(coverageData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [accountId, filterPhase, filterSub, filterType, filterDomain])

  const handleSetupBaseline = async () => {
    if (!accountId) return
    setSetting(true)
    try {
      const result = await instantiateBaseline(accountId)
      await load()
      setToast({ text: `Created ${result.created} baseline tasks (${result.skipped} already existed)`, type: 'success' })
      setTimeout(() => setToast(null), 5000)
    } catch (e) {
      setToast({ text: 'Failed to set up baseline', type: 'error' })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setSetting(false)
    }
  }

  const clearFilters = () => { setFilterPhase(''); setFilterSub(''); setFilterType(''); setFilterDomain('') }
  const hasFilters = filterPhase || filterSub || filterType || filterDomain

  if (loading && !coverage) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-cyan-400" />
      </div>
    )
  }

  const isEmpty = !coverage || coverage.totalActive === 0

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm border transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      )}

      {/* PDCA Header */}
      {coverage && !isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['plan', 'do', 'check', 'act'] as PDCAPhase[]).map(phase => {
            const data = coverage.pdcaSummary[phase]
            const meta = PDCA_META[phase]
            const pct = data.total > 0 ? Math.round(data.rate * 100) : 0
            return (
              <button
                key={phase}
                onClick={() => setFilterPhase(filterPhase === phase ? '' : phase)}
                className={`text-left rounded-xl border p-4 transition-all duration-150 ${meta.bg} ${
                  filterPhase === phase ? `${meta.border} ring-1 ring-${meta.color.replace('text-', '')}/20` : 'border-transparent'
                } hover:${meta.border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  <span className={`text-xs font-semibold ${meta.color}`}>{pct}%</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-2xl font-bold text-white">{data.completed}</span>
                  <span className="text-sm text-slate-500">/ {data.total}</span>
                </div>
                <ProgressBar value={pct} color={PROGRESS_COLORS[phase]} height="h-1" />
              </button>
            )
          })}
        </div>
      )}

      {/* Stats row */}
      {coverage && !isEmpty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('peopleTasks.continuous.healthScore', 'Health Score')}
            value={`${Math.round(coverage.overallHealthScore * 100)}%`}
            icon={<Shield size={18} />}
            accent="cyan"
          />
          <StatCard
            label={t('peopleTasks.continuous.overdue', 'Overdue')}
            value={coverage.overdueCount}
            icon={<AlertTriangle size={18} />}
            accent={coverage.overdueCount > 0 ? 'red' : 'emerald'}
          />
          <StatCard
            label={t('peopleTasks.continuous.totalActive', 'Active Tasks')}
            value={coverage.totalActive}
            icon={<Clock size={18} />}
            accent="blue"
          />
          <StatCard
            label={t('peopleTasks.continuous.completedPeriod', 'Completed This Period')}
            value={coverage.completedThisPeriod}
            icon={<CheckCircle size={18} />}
            accent="emerald"
          />
        </div>
      )}

      {/* ISMS Domain Coverage Grid */}
      {coverage && !isEmpty && coverage.ismsDomainCoverage && coverage.ismsDomainCoverage.length > 0 && (
        <div>
          <SectionHeader
            title={t('peopleTasks.continuous.ismsDomains', 'ISMS Domains')}
            subtitle={t('peopleTasks.continuous.ismsDomainsSubtitle', 'Compliance coverage across information security management domains')}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {coverage.ismsDomainCoverage.map(item => {
              const meta = ISMS_DOMAIN_META[item.domain]
              if (!meta) return null
              const isSelected = filterDomain === item.domain
              const pct = Math.round(item.completionRate * 100)
              return (
                <button
                  key={item.domain}
                  onClick={() => setFilterDomain(isSelected ? '' : item.domain)}
                  className={`text-left rounded-xl border p-3.5 transition-all duration-150 ${
                    isSelected
                      ? `${meta.bg} ${meta.border} ring-1 ring-${meta.color.replace('text-', '')}/10`
                      : 'bg-navy-800/30 border-navy-700/30 hover:border-navy-600/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={meta.color}>{meta.icon}</span>
                    <span className={`w-2 h-2 rounded-full ml-auto ${STATUS_COLORS[item.status]}`} />
                  </div>
                  <div className="text-xs font-medium text-white mb-1 leading-snug">{meta.label}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-lg font-bold text-white">{item.taskCount}</span>
                    <span className="text-[10px] text-slate-500">{t('peopleTasks.continuous.tasks', 'tasks')}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={meta.color.replace('text-', 'bg-')} height="h-1" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Article 21 Coverage Grid */}
      {coverage && !isEmpty && (
        <div>
          <SectionHeader
            title={t('peopleTasks.continuous.article21Coverage', 'Article 21(2) Coverage')}
            subtitle={t('peopleTasks.continuous.article21Subtitle', 'Compliance across all 10 NIS2 subsections')}
          />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {coverage.article21Coverage.map(item => {
              const isSelected = filterSub === item.subsection
              const pct = Math.round(item.completionRate * 100)
              return (
                <button
                  key={item.subsection}
                  onClick={() => setFilterSub(isSelected ? '' : item.subsection)}
                  className={`text-left rounded-xl border p-3 transition-all duration-150 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/10'
                      : 'bg-navy-800/30 border-navy-700/30 hover:border-navy-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-400">({item.subsection})</span>
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[item.status]}`} />
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2 line-clamp-2 leading-relaxed min-h-[2.5em]">{item.label}</div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-base font-bold text-white">{item.taskCount}</span>
                    <span className="text-[10px] text-slate-500">{t('peopleTasks.continuous.tasks', 'tasks')}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color="bg-cyan-500" height="h-1" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state / Wizard */}
      {isEmpty && !showWizard && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-5">
            <Shield size={36} className="text-cyan-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('peopleTasks.continuous.emptyTitle', 'No continuous compliance tasks yet')}
          </h3>
          <p className="text-sm text-slate-400 mb-8 max-w-md text-center leading-relaxed">
            {t('peopleTasks.continuous.emptyDescription', 'Set up your baseline to create recurring compliance tasks covering all NIS2 Article 21(2) subsections. You can review, customise, and assign tasks before creating them.')}
          </p>
          <Button variant="primary" onClick={() => setShowWizard(true)}>
            <Plus size={16} /> {t('peopleTasks.continuous.setupBaseline', 'Set Up Baseline')}
          </Button>
        </div>
      )}

      {isEmpty && showWizard && accountId && (
        <BaselineSetupWizard
          accountId={accountId}
          onComplete={() => { setShowWizard(false); load() }}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* Filters + Task list */}
      {!isEmpty && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h3 className="text-base font-semibold text-white">{t('peopleTasks.continuous.taskList', 'Tasks')}</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Clear filters
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <Filter size={14} className="text-slate-500" />
              <select
                value={filterDomain}
                onChange={e => setFilterDomain(e.target.value)}
                className="bg-navy-800/60 border border-navy-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">All Domains</option>
                {Object.entries(ISMS_DOMAIN_META).map(([key, meta]) => (
                  <option key={key} value={key}>{meta.label}</option>
                ))}
              </select>
              <select
                value={filterPhase}
                onChange={e => setFilterPhase(e.target.value)}
                className="bg-navy-800/60 border border-navy-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">{t('peopleTasks.continuous.allPhases', 'All Phases')}</option>
                <option value="plan">Plan</option>
                <option value="do">Do</option>
                <option value="check">Check</option>
                <option value="act">Act</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-navy-800/60 border border-navy-700/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="">{t('peopleTasks.continuous.allTypes', 'All Types')}</option>
                <option value="attestation">{t('peopleTasks.taskTypes.attestation', 'Attestation')}</option>
                <option value="process_check">{t('peopleTasks.taskTypes.process_check', 'Process Check')}</option>
                <option value="evidence_submission">{t('peopleTasks.taskTypes.evidence_submission', 'Evidence')}</option>
                <option value="policy_ack">{t('peopleTasks.taskTypes.policy_ack', 'Policy Ack')}</option>
                <option value="training">{t('peopleTasks.taskTypes.training', 'Training')}</option>
              </select>
              <Button variant="secondary" size="sm" onClick={handleSetupBaseline} loading={setting} title={t('peopleTasks.continuous.refreshTooltip', 'Check for new baseline templates')}>
                <RefreshCw size={13} /> {t('peopleTasks.continuous.checkNewTemplates', 'Check for New')}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            {tasks.map(task => {
              const isDone = task.currentPeriodStatus === 'completed'
              const isOverdue = task.currentPeriodStatus === 'overdue'
              const phase = PDCA_META[task.pdcaPhase as PDCAPhase]
              const domainMeta = task.ismsDomain ? ISMS_DOMAIN_META[task.ismsDomain] : null
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-150 ${
                    isDone ? 'bg-emerald-500/5 border-emerald-500/10' :
                    isOverdue ? 'bg-red-500/5 border-red-500/10' :
                    'bg-navy-800/20 border-navy-700/20 hover:border-navy-600/40'
                  }`}
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isDone ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-amber-500'
                  }`} />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white truncate">{task.title}</span>
                      {task.baselineTemplateId && (
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-navy-700/60 text-slate-400 uppercase tracking-wider flex-shrink-0">
                          Baseline
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${phase?.bg || ''} ${phase?.color || 'text-slate-400'}`}>
                        {task.pdcaPhase}
                      </span>
                      {domainMeta && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${domainMeta.bg} ${domainMeta.color}`}>
                          {domainMeta.label}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">({task.article21Subsection})</span>
                      <span className="text-[11px] text-slate-500 capitalize">{task.frequency.replace('_', ' ')}</span>
                      {task.relatedControlId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/controls?open=${task.relatedControlId}`) }}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] hover:bg-cyan-500/20 transition-colors"
                          title={t('peopleTasks.goToControl', 'View Control')}
                        >
                          <Shield size={9} /> {task.relatedControlId}
                        </button>
                      )}
                      {task.nextDueDate && (
                        <span className={`text-[11px] ${isOverdue ? 'text-red-400' : 'text-slate-500'}`}>
                          Due {task.nextDueDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium ${
                      isDone ? 'text-emerald-400' : isOverdue ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {isDone ? t('peopleTasks.status.completed', 'Completed') :
                       isOverdue ? t('peopleTasks.status.overdue', 'Overdue') :
                       t('peopleTasks.status.pending', 'Pending')}
                    </span>
                    {task.completionCount > 0 && (
                      <div className="text-[11px] text-slate-500">{task.completionCount} completions</div>
                    )}
                  </div>
                </div>
              )
            })}
            {tasks.length === 0 && (
              <div className="flex flex-col items-center py-12 text-slate-400 text-sm">
                <Filter size={20} className="mb-2 text-slate-500" />
                {t('peopleTasks.continuous.noMatchingTasks', 'No tasks match the current filters')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
