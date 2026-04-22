import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Shield, ChevronRight, ChevronLeft, Check, Loader2, X,
  Users, ListChecks, ChevronDown, ChevronUp,
  FileText, AlertTriangle, Siren, RotateCcw, Link, Lock, Server, ClipboardCheck,
} from 'lucide-react'
import { Button } from './ui'
import {
  fetchBaselineTemplates,
  instantiateBaseline,
  getTeamMembers,
  type BaselineTemplate,
  type TeamMember,
} from '../services/api'

const SUBSECTION_LABELS: Record<string, string> = {
  a: 'Risk analysis & IS policies',
  b: 'Incident handling',
  c: 'Business continuity & crisis mgmt',
  d: 'Supply chain security',
  e: 'Network & IS acquisition/development',
  f: 'Effectiveness assessment',
  g: 'Cybersecurity hygiene & training',
  h: 'Cryptography & encryption',
  i: 'HR security & access control',
  j: 'MFA, secured comms & emergency comms',
}

const ISMS_DOMAIN_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  policy_governance: { label: 'Policy & Governance', icon: <FileText size={14} /> },
  risk_management: { label: 'Risk Management', icon: <AlertTriangle size={14} /> },
  incident_management: { label: 'Incident Management', icon: <Siren size={14} /> },
  business_continuity: { label: 'Business Continuity', icon: <RotateCcw size={14} /> },
  supply_chain: { label: 'Supply Chain Security', icon: <Link size={14} /> },
  access_control: { label: 'Access Control & HR', icon: <Lock size={14} /> },
  asset_management: { label: 'Asset & Change Mgmt', icon: <Server size={14} /> },
  audit_training: { label: 'Audit & Training', icon: <ClipboardCheck size={14} /> },
}

const PDCA_COLORS: Record<string, string> = {
  plan: 'bg-blue-500/15 text-blue-400',
  do: 'bg-emerald-500/15 text-emerald-400',
  check: 'bg-amber-500/15 text-amber-400',
  act: 'bg-purple-500/15 text-purple-400',
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  one_off: 'One-off',
}

const TYPE_LABELS: Record<string, string> = {
  attestation: 'Attestation',
  process_check: 'Process Check',
  evidence_submission: 'Evidence',
  policy_ack: 'Policy Ack',
  training: 'Training',
}

type GroupBy = 'domain' | 'article'

interface Props {
  accountId: string
  onComplete: () => void
  onCancel: () => void
}

export default function BaselineSetupWizard({ accountId, onComplete, onCancel }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<BaselineTemplate[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Template selection
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<GroupBy>('domain')

  // Step 2: Assignments
  const [assignments, setAssignments] = useState<Record<string, { userId?: string; role?: string }>>({})
  const [bulkAssign, setBulkAssign] = useState<Record<string, string>>({})

  // Step 3: Result
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [tpls, members] = await Promise.all([
          fetchBaselineTemplates(),
          getTeamMembers(),
        ])
        setTemplates(tpls)
        setTeamMembers(members.filter(m => m.isActive && m.inviteAccepted))
        // Expand first domain
        const domains = [...new Set(tpls.map(t => t.ismsDomain).filter(Boolean))]
        if (domains.length > 0) setExpandedSections(new Set([domains[0]!]))
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleTemplate = (id: string) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectAllInGroup = (groupKey: string, select: boolean) => {
    const groupTemplates = groupBy === 'domain'
      ? templates.filter(t => (t.ismsDomain || 'uncategorized') === groupKey)
      : templates.filter(t => t.article21Subsection === groupKey)
    const ids = groupTemplates.map(t => t.templateId)
    setExcluded(prev => {
      const next = new Set(prev)
      ids.forEach(id => select ? next.delete(id) : next.add(id))
      return next
    })
  }

  // Group templates by the active grouping mode
  const groupedTemplates: Record<string, BaselineTemplate[]> = {}
  if (groupBy === 'domain') {
    templates.forEach(t => {
      const key = t.ismsDomain || 'uncategorized'
      if (!groupedTemplates[key]) groupedTemplates[key] = []
      groupedTemplates[key].push(t)
    })
  } else {
    templates.forEach(t => {
      const key = t.article21Subsection
      if (!groupedTemplates[key]) groupedTemplates[key] = []
      groupedTemplates[key].push(t)
    })
  }

  const selectedCount = templates.length - excluded.size

  // Sort group keys: for domain mode use ISMS_DOMAIN_LABELS order, for article mode sort alphabetically
  const domainOrder = Object.keys(ISMS_DOMAIN_LABELS)
  const groupKeys = Object.keys(groupedTemplates).sort((a, b) => {
    if (groupBy === 'domain') {
      const ai = domainOrder.indexOf(a)
      const bi = domainOrder.indexOf(b)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    }
    return a.localeCompare(b)
  })

  // Step 2: Group by frequency for bulk assignment
  const freqGroups = templates
    .filter(t => !excluded.has(t.templateId))
    .reduce<Record<string, BaselineTemplate[]>>((acc, t) => {
      if (!acc[t.frequency]) acc[t.frequency] = []
      acc[t.frequency].push(t)
      return acc
    }, {})

  const handleBulkAssign = (frequency: string, userId: string) => {
    setBulkAssign(prev => ({ ...prev, [frequency]: userId }))
    const freqTemplates = freqGroups[frequency] || []
    setAssignments(prev => {
      const next = { ...prev }
      freqTemplates.forEach(t => {
        next[t.templateId] = { userId: userId || undefined }
      })
      return next
    })
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const assignmentsList = Object.entries(assignments)
        .filter(([id]) => !excluded.has(id))
        .filter(([, a]) => a.userId || a.role)
        .map(([id, a]) => ({
          template_id: id,
          user_id: a.userId || null,
          role: a.role || null,
        }))

      const res = await instantiateBaseline(accountId, {
        excluded_template_ids: [...excluded],
        assignments: assignmentsList,
      })
      setResult(res)
      setStep(3)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleGroupByChange = (mode: GroupBy) => {
    setGroupBy(mode)
    setExpandedSections(new Set()) // collapse all when switching
  }

  const getGroupLabel = (key: string): { label: string; icon?: React.ReactNode; prefix?: string } => {
    if (groupBy === 'domain') {
      const meta = ISMS_DOMAIN_LABELS[key]
      return meta ? { label: meta.label, icon: meta.icon } : { label: key }
    }
    return { label: SUBSECTION_LABELS[key] || key, prefix: `(${key})` }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-cyan-400" />
            {t('baseline.wizardTitle', 'Set Up Compliance Baseline')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1 && t('baseline.step1Desc', 'Review and select the tasks for your organisation')}
            {step === 2 && t('baseline.step2Desc', 'Assign ownership to task groups')}
            {step === 3 && t('baseline.step3Desc', 'Baseline created successfully')}
          </p>
        </div>
        {step < 3 && (
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { num: 1, label: 'Review Tasks', icon: ListChecks },
          { num: 2, label: 'Assign Owners', icon: Users },
          { num: 3, label: 'Confirm', icon: Check },
        ].map(({ num, label, icon: Icon }) => (
          <React.Fragment key={num}>
            {num > 1 && <div className={`flex-1 h-px ${step >= num ? 'bg-cyan-500' : 'bg-navy-700'}`} />}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              step === num ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              step > num ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              'bg-navy-800 text-slate-500 border border-navy-700'
            }`}>
              {step > num ? <Check size={12} /> : <Icon size={12} />}
              {label}
            </div>
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}

      {/* Step 1: Review Tasks */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              {selectedCount} of {templates.length} tasks selected
            </span>

            {/* Group toggle */}
            <div className="flex items-center gap-1 bg-navy-800/60 rounded-lg p-0.5 border border-navy-700/40">
              <button
                onClick={() => handleGroupByChange('domain')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  groupBy === 'domain'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By ISMS Domain
              </button>
              <button
                onClick={() => handleGroupByChange('article')}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  groupBy === 'article'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                By NIS2 Article
              </button>
            </div>
          </div>

          {groupKeys.map(key => {
            const sectionTemplates = groupedTemplates[key]
            const selectedInSection = sectionTemplates.filter(t => !excluded.has(t.templateId)).length
            const isExpanded = expandedSections.has(key)
            const { label, icon, prefix } = getGroupLabel(key)

            return (
              <div key={key} className="border border-navy-700/40 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-navy-800/40 hover:bg-navy-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {icon && <span className="text-cyan-400">{icon}</span>}
                    {prefix && <span className="text-xs font-bold text-cyan-400 w-5">{prefix}</span>}
                    <span className="text-sm font-medium text-white">{label}</span>
                    <span className="text-xs text-slate-500">{selectedInSection}/{sectionTemplates.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); selectAllInGroup(key, selectedInSection < sectionTemplates.length) }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 px-2 py-0.5 rounded bg-cyan-500/10"
                    >
                      {selectedInSection === sectionTemplates.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-navy-700/20">
                    {sectionTemplates.map(tpl => {
                      const isSelected = !excluded.has(tpl.templateId)
                      return (
                        <label
                          key={tpl.templateId}
                          className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            isSelected ? 'hover:bg-navy-800/20' : 'opacity-50 hover:opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTemplate(tpl.templateId)}
                            className="mt-1 rounded border-navy-600 text-cyan-500 focus:ring-cyan-500/30 bg-navy-900"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white leading-snug">{tpl.title}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${PDCA_COLORS[tpl.pdcaPhase] || 'bg-navy-700 text-slate-400'}`}>
                                {tpl.pdcaPhase}
                              </span>
                              <span className="text-[10px] text-slate-500">{FREQ_LABELS[tpl.frequency] || tpl.frequency}</span>
                              <span className="text-[10px] text-slate-500">{TYPE_LABELS[tpl.taskType] || tpl.taskType}</span>
                              {tpl.requiresEvidence && (
                                <span className="text-[10px] text-amber-400">Evidence required</span>
                              )}
                              {tpl.perProcess && (
                                <span className="text-[10px] text-purple-400">Per process</span>
                              )}
                              {/* Show cross-reference badge when in domain view */}
                              {groupBy === 'domain' && (
                                <span className="text-[10px] text-slate-600">Art. 21({tpl.article21Subsection})</span>
                              )}
                              {/* Show domain badge when in article view */}
                              {groupBy === 'article' && tpl.ismsDomain && ISMS_DOMAIN_LABELS[tpl.ismsDomain] && (
                                <span className="text-[10px] text-slate-600">{ISMS_DOMAIN_LABELS[tpl.ismsDomain].label}</span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={() => setStep(2)} disabled={selectedCount === 0}>
              Continue <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Assign Owners */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            {t('baseline.assignDesc', 'Assign team members to task groups by frequency. You can skip this and assign later.')}
          </p>

          {Object.entries(freqGroups).sort(([a], [b]) => {
            const order = ['monthly', 'quarterly', 'annual', 'one_off']
            return order.indexOf(a) - order.indexOf(b)
          }).map(([freq, freqTemplates]) => (
            <div key={freq} className="border border-navy-700/40 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">{FREQ_LABELS[freq] || freq} Tasks</h4>
                  <span className="text-xs text-slate-500">{freqTemplates.length} tasks</span>
                </div>
                <select
                  value={bulkAssign[freq] || ''}
                  onChange={(e) => handleBulkAssign(freq, e.target.value)}
                  className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 min-w-[200px]"
                >
                  <option value="">{t('baseline.unassigned', 'Unassigned')}</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {freqTemplates.slice(0, 3).map(tpl => (
                  <div key={tpl.templateId} className="text-xs text-slate-500 truncate pl-2 border-l border-navy-700">
                    {tpl.title}
                  </div>
                ))}
                {freqTemplates.length > 3 && (
                  <div className="text-xs text-slate-600 pl-2">+{freqTemplates.length - 3} more</div>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-4">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ChevronLeft size={14} /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleCreate} loading={creating}>
                {t('baseline.skipAssign', 'Skip & Create')}
              </Button>
              <Button variant="primary" onClick={handleCreate} loading={creating}>
                {t('baseline.createBaseline', 'Create Baseline')} <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && result && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('baseline.successTitle', 'Baseline Created')}
          </h3>
          <p className="text-sm text-slate-400 mb-2">
            {t('baseline.successDesc', '{{created}} tasks created, {{skipped}} already existed', {
              created: result.created,
              skipped: result.skipped,
            })}
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-8 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{selectedCount}</div>
              <div className="text-xs text-slate-500">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{result.created}</div>
              <div className="text-xs text-slate-500">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">{result.skipped}</div>
              <div className="text-xs text-slate-500">Skipped</div>
            </div>
          </div>
          <Button variant="primary" onClick={onComplete}>
            {t('baseline.viewTasks', 'View Tasks')} <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
