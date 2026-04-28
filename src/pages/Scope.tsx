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
import { Card } from '../components/ui'
import { Button } from '../components/ui/Button'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/ui/DataTable'
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

  const viewToggle = (
    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
      <button
        onClick={() => setViewMode('processes')}
        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
          viewMode === 'processes'
            ? 'bg-cyan-50 text-cyan-600 font-medium'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {t('scope.viewProcesses')}
      </button>
      <button
        onClick={() => setViewMode('soa')}
        className={`px-3 py-1.5 text-sm rounded-md transition-all ${
          viewMode === 'soa'
            ? 'bg-cyan-50 text-cyan-600 font-medium'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {t('scope.viewSoA')}
      </button>
    </div>
  )

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title={t('scope.pageTitle')} description={t('scope.pageSubtitle')} />
        <PageContent>
          <Card>
            <div className="text-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-cyan-600 border-t-transparent rounded-full mx-auto" />
            </div>
          </Card>
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('scope.pageTitle')}
        description={t('scope.pageSubtitle')}
        actions={
          <>
            {viewToggle}
            {viewMode === 'processes' && (
              <Button onClick={openCreateForm} icon={<Plus size={16} />}>
                {t('scope.addProcess')}
              </Button>
            )}
          </>
        }
      />
      <PageContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricCard
            label={t('scope.statProcesses')}
            value={processes.length}
            icon={<Target size={20} />}
          />
          <MetricCard
            label={t('scope.statCritical')}
            value={criticalCount}
            semantic="danger"
          />
          <MetricCard
            label={t('scope.statControls')}
            value={totalControls}
            icon={<Shield size={20} />}
          />
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <Card className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingId ? t('scope.editProcess') : t('scope.createProcess')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-1">{t('scope.fieldName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder={t('scope.fieldNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-500 mb-1">{t('scope.fieldDescription')}</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder={t('scope.fieldDescriptionPlaceholder')}
                />
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">{t('scope.fieldOwner')}</label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={e => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                    placeholder={t('scope.fieldOwnerPlaceholder')}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={formData.is_critical}
                    onChange={e => setFormData(prev => ({ ...prev, is_critical: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-500">{t('scope.fieldCritical')}</span>
                </label>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSubmit}>{editingId ? t('common.save') : t('scope.addProcess')}</Button>
                <button onClick={() => setShowForm(false)} className="text-sm text-slate-500 hover:text-slate-900">
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
              <div className="bg-card border border-border rounded-lg">
                <EmptyState
                  icon={<Target />}
                  title={t('scope.emptyTitle')}
                  description={t('scope.emptyDescription')}
                  action={
                    <Button onClick={openCreateForm} icon={<Plus size={16} />}>
                      {t('scope.addFirstProcess')}
                    </Button>
                  }
                />
              </div>
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
                            <ChevronDown size={18} className="text-cyan-600" />
                          ) : (
                            <ChevronRight size={18} className="text-slate-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">{bp.name}</h3>
                              {bp.isCritical && (
                                <Badge variant="danger" size="sm">
                                  {t('scope.badgeCritical')}
                                </Badge>
                              )}
                            </div>
                            {bp.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{bp.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              {bp.owner && <span>{t('scope.owner')}: {bp.owner}</span>}
                              <span>{linkedCount} {t('scope.controlsLinked')}</span>
                              <span>{applicableCount} {t('scope.applicable')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditForm(bp)}
                            className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(bp.id)}
                            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded: control linking */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-500 mb-3">{t('scope.controlMapping')}</h4>
                          <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {baseControls.map(ctrl => {
                              const linked = bp.controls.find(c => c.controlId === ctrl.controlId)
                              const isLinked = !!linked
                              return (
                                <div
                                  key={ctrl.controlId}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                    isLinked ? 'bg-cyan-50 border border-cyan-100' : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isLinked}
                                      onChange={() => handleToggleControl(bp.id, ctrl.controlId, isLinked)}
                                      className="w-4 h-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <span className="text-sm text-slate-900">{ctrl.controlId}</span>
                                      <span className="text-sm text-slate-400 ml-2 truncate">{ctrl.title}</span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                      ctrl.severity === 'critical' ? 'bg-red-50 text-red-600' :
                                      ctrl.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                                      'bg-amber-50 text-amber-600'
                                    }`}>
                                      {ctrl.severity}
                                    </span>
                                  </div>
                                  {isLinked && (
                                    <button
                                      onClick={() => handleToggleApplicability(bp.id, ctrl.controlId, !linked!.applicable)}
                                      className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ml-2 ${
                                        linked!.applicable
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                          : 'bg-slate-100 text-slate-400 border border-slate-300'
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
              <FileText size={18} className="text-cyan-600" />
              <h3 className="text-lg font-semibold text-slate-900">{t('scope.soaTitle')}</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">{t('scope.soaDescription')}</p>

            {soaEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">{t('scope.soaEmpty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>{t('scope.soaColControl')}</TableHeaderCell>
                      <TableHeaderCell>{t('scope.soaColTitle')}</TableHeaderCell>
                      <TableHeaderCell align="center">{t('scope.soaColApplicable')}</TableHeaderCell>
                      <TableHeaderCell>{t('scope.soaColProcesses')}</TableHeaderCell>
                      <TableHeaderCell>{t('scope.soaColJustification')}</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {soaEntries.map(entry => (
                      <TableRow key={entry.controlId}>
                        <TableCell className="font-mono text-xs">{entry.controlId}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.controlTitle}</TableCell>
                        <TableCell align="center">
                          {entry.applicable ? (
                            <CheckCircle size={16} className="text-emerald-600 mx-auto" />
                          ) : (
                            <XCircle size={16} className="text-red-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.linkedProcesses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {entry.linkedProcesses.map((name, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{entry.justification || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </PageContent>
    </PageContainer>
  )
}
