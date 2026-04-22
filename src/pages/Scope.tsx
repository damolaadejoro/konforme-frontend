import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { Card, Button } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import {
  getBusinessProcesses,
  createBusinessProcess,
  updateBusinessProcess,
  deleteBusinessProcess,
  linkProcessControls,
  getStatementOfApplicability,
  getBaseControls,
  type BusinessProcess,
  type SoAEntry,
  type BaseControlDef,
} from '../services/api'

type ViewMode = 'processes' | 'soa'

export default function Scope() {
  const { t } = useTranslation()
  const { accountId } = useAuth()

  const [processes, setProcesses] = useState<BusinessProcess[]>([])
  const [baseControls, setBaseControls] = useState<BaseControlDef[]>([])
  const [soaEntries, setSoaEntries] = useState<SoAEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('processes')

  // Create/edit form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', is_critical: true, owner: '' })

  // Expanded process for control linking
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    loadData()
  }, [accountId])

  async function loadData() {
    if (!accountId) return
    setLoading(true)
    try {
      const [procs, controls] = await Promise.all([
        getBusinessProcesses(accountId),
        getBaseControls(),
      ])
      setProcesses(procs)
      setBaseControls(controls)
    } catch (err) {
      console.error('Failed to load scope data', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSoA() {
    if (!accountId) return
    try {
      const entries = await getStatementOfApplicability(accountId)
      setSoaEntries(entries)
    } catch (err) {
      console.error('Failed to load SoA', err)
    }
  }

  useEffect(() => {
    if (viewMode === 'soa') loadSoA()
  }, [viewMode])

  function openCreateForm() {
    setEditingId(null)
    setFormData({ name: '', description: '', is_critical: true, owner: '' })
    setShowForm(true)
  }

  function openEditForm(bp: BusinessProcess) {
    setEditingId(bp.id)
    setFormData({ name: bp.name, description: bp.description, is_critical: bp.isCritical, owner: bp.owner })
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!accountId || !formData.name.trim()) return
    try {
      if (editingId) {
        await updateBusinessProcess(accountId, editingId, formData)
      } else {
        await createBusinessProcess(accountId, formData)
      }
      setShowForm(false)
      await loadData()
    } catch (err) {
      console.error('Failed to save process', err)
    }
  }

  async function handleDelete(processId: string) {
    if (!accountId) return
    try {
      await deleteBusinessProcess(accountId, processId)
      await loadData()
    } catch (err) {
      console.error('Failed to delete process', err)
    }
  }

  async function handleToggleControl(processId: string, controlId: string, currentlyLinked: boolean) {
    if (!accountId) return
    const bp = processes.find(p => p.id === processId)
    if (!bp) return

    let newControls: { control_id: string; applicable: boolean; justification: string }[]
    if (currentlyLinked) {
      newControls = bp.controls.filter(c => c.controlId !== controlId).map(c => ({
        control_id: c.controlId,
        applicable: c.applicable,
        justification: c.justification,
      }))
    } else {
      newControls = [
        ...bp.controls.map(c => ({ control_id: c.controlId, applicable: c.applicable, justification: c.justification })),
        { control_id: controlId, applicable: true, justification: '' },
      ]
    }
    try {
      await linkProcessControls(accountId, processId, newControls)
      await loadData()
    } catch (err) {
      console.error('Failed to update controls', err)
    }
  }

  async function handleToggleApplicability(processId: string, controlId: string, newApplicable: boolean) {
    if (!accountId) return
    const bp = processes.find(p => p.id === processId)
    if (!bp) return

    const newControls = bp.controls.map(c => ({
      control_id: c.controlId,
      applicable: c.controlId === controlId ? newApplicable : c.applicable,
      justification: c.justification,
    }))
    try {
      await linkProcessControls(accountId, processId, newControls)
      await loadData()
    } catch (err) {
      console.error('Failed to update applicability', err)
    }
  }

  const criticalCount = processes.filter(p => p.isCritical).length
  const totalControls = baseControls.length

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white">{t('scope.pageTitle')}</h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">{t('scope.pageSubtitle')}</p>
        </div>
        <Card>
          <div className="text-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white">{t('scope.pageTitle')}</h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">{t('scope.pageSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-navy-800 rounded-lg p-1 border border-navy-700/50">
            <button
              onClick={() => setViewMode('processes')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'processes'
                  ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                  : 'text-[#CBD8E8] hover:text-white'
              }`}
            >
              {t('scope.viewProcesses')}
            </button>
            <button
              onClick={() => setViewMode('soa')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                viewMode === 'soa'
                  ? 'bg-cyan-500/20 text-cyan-400 font-medium'
                  : 'text-[#CBD8E8] hover:text-white'
              }`}
            >
              {t('scope.viewSoA')}
            </button>
          </div>
          {viewMode === 'processes' && (
            <Button onClick={openCreateForm}>
              <Plus size={16} className="mr-1" />
              {t('scope.addProcess')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Target size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{processes.length}</p>
              <p className="text-xs text-[#CBD8E8]">{t('scope.statProcesses')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{criticalCount}</p>
              <p className="text-xs text-[#CBD8E8]">{t('scope.statCritical')}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalControls}</p>
              <p className="text-xs text-[#CBD8E8]">{t('scope.statControls')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <Card>
          <h3 className="text-lg font-bold font-syne text-white mb-4">
            {editingId ? t('scope.editProcess') : t('scope.createProcess')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#CBD8E8] mb-1">{t('scope.fieldName')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder={t('scope.fieldNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm text-[#CBD8E8] mb-1">{t('scope.fieldDescription')}</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                placeholder={t('scope.fieldDescriptionPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-sm text-[#CBD8E8] mb-1">{t('scope.fieldOwner')}</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={e => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                  className="bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder={t('scope.fieldOwnerPlaceholder')}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input
                  type="checkbox"
                  checked={formData.is_critical}
                  onChange={e => setFormData(prev => ({ ...prev, is_critical: e.target.checked }))}
                  className="w-4 h-4 rounded border-navy-600 bg-navy-800 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-sm text-[#CBD8E8]">{t('scope.fieldCritical')}</span>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSubmit}>{editingId ? t('common.save') : t('scope.addProcess')}</Button>
              <button onClick={() => setShowForm(false)} className="text-sm text-[#CBD8E8] hover:text-white">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Processes View */}
      {viewMode === 'processes' && (
        <>
          {processes.length === 0 ? (
            <Card>
              <div className="text-center py-16">
                <Target size={48} className="text-navy-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold font-syne text-white mb-2">{t('scope.emptyTitle')}</h3>
                <p className="text-[14px] text-[#CBD8E8] max-w-md mx-auto mb-6">{t('scope.emptyDescription')}</p>
                <Button onClick={openCreateForm}>
                  <Plus size={16} className="mr-1" />
                  {t('scope.addFirstProcess')}
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {processes.map(bp => {
                const isExpanded = expandedId === bp.id
                const linkedCount = bp.controls.length
                const applicableCount = bp.controls.filter(c => c.applicable).length
                return (
                  <Card key={bp.id}>
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : bp.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown size={18} className="text-cyan-400" />
                        ) : (
                          <ChevronRight size={18} className="text-[#94b4d1]" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-semibold text-white">{bp.name}</h3>
                            {bp.isCritical && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                                {t('scope.badgeCritical')}
                              </span>
                            )}
                          </div>
                          {bp.description && (
                            <p className="text-xs text-[#94b4d1] mt-0.5">{bp.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-[#94b4d1]">
                            {bp.owner && <span>{t('scope.owner')}: {bp.owner}</span>}
                            <span>{linkedCount} {t('scope.controlsLinked')}</span>
                            <span>{applicableCount} {t('scope.applicable')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(bp)}
                          className="p-2 text-[#94b4d1] hover:text-cyan-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(bp.id)}
                          className="p-2 text-[#94b4d1] hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded: control linking */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-navy-700/50">
                        <h4 className="text-sm font-semibold text-[#CBD8E8] mb-3">{t('scope.controlMapping')}</h4>
                        <div className="space-y-1 max-h-[400px] overflow-y-auto">
                          {baseControls.map(ctrl => {
                            const linked = bp.controls.find(c => c.controlId === ctrl.controlId)
                            const isLinked = !!linked
                            return (
                              <div
                                key={ctrl.controlId}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                  isLinked ? 'bg-cyan-500/5 border border-cyan-500/10' : 'hover:bg-navy-800/50'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isLinked}
                                    onChange={() => handleToggleControl(bp.id, ctrl.controlId, isLinked)}
                                    className="w-4 h-4 rounded border-navy-600 bg-navy-800 text-cyan-500 focus:ring-cyan-500 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <span className="text-sm text-white">{ctrl.controlId}</span>
                                    <span className="text-sm text-[#94b4d1] ml-2 truncate">{ctrl.title}</span>
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                    ctrl.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                                    ctrl.severity === 'high' ? 'bg-orange-500/10 text-orange-400' :
                                    'bg-yellow-500/10 text-yellow-400'
                                  }`}>
                                    {ctrl.severity}
                                  </span>
                                </div>
                                {isLinked && (
                                  <button
                                    onClick={() => handleToggleApplicability(bp.id, ctrl.controlId, !linked!.applicable)}
                                    className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ml-2 ${
                                      linked!.applicable
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-navy-700 text-[#94b4d1] border border-navy-600'
                                    }`}
                                  >
                                    {linked!.applicable ? t('scope.applicableYes') : t('scope.applicableNo')}
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Statement of Applicability View */}
      {viewMode === 'soa' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-cyan-400" />
            <h3 className="text-lg font-bold font-syne text-white">{t('scope.soaTitle')}</h3>
          </div>
          <p className="text-sm text-[#CBD8E8] mb-4">{t('scope.soaDescription')}</p>

          {soaEntries.length === 0 ? (
            <div className="text-center py-8 text-[#94b4d1]">{t('scope.soaEmpty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/50">
                    <th className="text-left py-2 px-3 text-[#94b4d1] font-medium">{t('scope.soaColControl')}</th>
                    <th className="text-left py-2 px-3 text-[#94b4d1] font-medium">{t('scope.soaColTitle')}</th>
                    <th className="text-center py-2 px-3 text-[#94b4d1] font-medium">{t('scope.soaColApplicable')}</th>
                    <th className="text-left py-2 px-3 text-[#94b4d1] font-medium">{t('scope.soaColProcesses')}</th>
                    <th className="text-left py-2 px-3 text-[#94b4d1] font-medium">{t('scope.soaColJustification')}</th>
                  </tr>
                </thead>
                <tbody>
                  {soaEntries.map(entry => (
                    <tr key={entry.controlId} className="border-b border-navy-800/50 hover:bg-navy-800/30">
                      <td className="py-2 px-3 text-white font-mono text-xs">{entry.controlId}</td>
                      <td className="py-2 px-3 text-[#CBD8E8]">{entry.controlTitle}</td>
                      <td className="py-2 px-3 text-center">
                        {entry.applicable ? (
                          <CheckCircle size={16} className="text-emerald-400 mx-auto" />
                        ) : (
                          <XCircle size={16} className="text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {entry.linkedProcesses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.linkedProcesses.map((name, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-[#94b4d1]">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#94b4d1] text-xs">{entry.justification || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
