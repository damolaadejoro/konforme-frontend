import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Shield,
  Search,
  Filter,
  X,
  Upload,
  ChevronRight,
  Calendar,
  User,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Users as UsersIcon,
  Mail,
  Clock,
  Download,
  Loader2
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useControls } from '../hooks/useControls'
import { Card, Button, InfoTooltip, Tooltip } from '../components/ui'
import { Control, ControlCategory, ControlSeverity, ControlStatus } from '../types/controls'
import { format } from 'date-fns'
import {
  getStoredAuth,
  uploadEvidence,
  listEvidence,
  deleteEvidence,
  getEvidenceDownloadUrl,
  EvidenceFile
} from '../services/api'

const statusColors: Record<ControlStatus, string> = {
  'Not Started': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Planned': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Partial': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Implemented': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
}

const categoryIcons = {
  Technical: '⚙️',
  Organizational: '📋',
  People: '👥'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ControlDrawer({
  control,
  onClose,
  onUpdate,
  onAddEvidence,
  onRemoveEvidence,
  campaigns
}: {
  control: Control
  onClose: () => void
  onUpdate: (updates: Partial<Control>) => void
  onAddEvidence: (evidence: any) => void
  onRemoveEvidence: (evidenceId: string) => void
  campaigns: any[]
}) {
  const { t } = useTranslation()
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [isEditingOwner, setIsEditingOwner] = useState(false)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)

  const [tempStatus, setTempStatus] = useState(control.status)
  const [tempOwner, setTempOwner] = useState(control.owner)
  const [tempDueDate, setTempDueDate] = useState(control.dueDate || '')
  const [tempNotes, setTempNotes] = useState(control.notes)

  // Employee assignment form
  const [employeeEmails, setEmployeeEmails] = useState('')
  const [taskType, setTaskType] = useState<'acknowledge' | 'quiz'>('acknowledge')
  const [deadline, setDeadline] = useState('')

  // Backend evidence state
  const [backendEvidence, setBackendEvidence] = useState<EvidenceFile[]>([])
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [evidenceError, setEvidenceError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const auth = getStoredAuth()
  const accountId = auth.accountId

  // Load evidence from backend when control opens
  const loadEvidence = useCallback(async () => {
    if (!accountId) return
    setEvidenceLoading(true)
    setEvidenceError(null)
    try {
      const files = await listEvidence(accountId, control.id)
      setBackendEvidence(files)
    } catch (err: any) {
      console.error('Failed to load evidence:', err)
      // Fall back silently to localStorage evidence
      setBackendEvidence([])
    } finally {
      setEvidenceLoading(false)
    }
  }, [accountId, control.id])

  useEffect(() => {
    loadEvidence()
  }, [loadEvidence])

  const handleSaveStatus = () => {
    onUpdate({ status: tempStatus })
    setIsEditingStatus(false)
  }

  const handleSaveOwner = () => {
    onUpdate({ owner: tempOwner })
    setIsEditingOwner(false)
  }

  const handleSaveDueDate = () => {
    onUpdate({ dueDate: tempDueDate || null })
    setIsEditingDueDate(false)
  }

  const handleSaveNotes = () => {
    onUpdate({ notes: tempNotes })
    setIsEditingNotes(false)
  }

  const handleUploadEvidence = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (!accountId) {
      // Fallback to localStorage-only behavior
      Array.from(files).forEach(file => {
        onAddEvidence({
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Current User',
          fileSize: formatFileSize(file.size),
        })
      })
      e.target.value = ''
      return
    }

    setUploading(true)
    setEvidenceError(null)

    for (const file of Array.from(files)) {
      try {
        await uploadEvidence(accountId, control.id, file)
      } catch (err: any) {
        setEvidenceError(err.message || t('controls.uploadFailedError'))
      }
    }

    // Refresh evidence list
    await loadEvidence()
    setUploading(false)

    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!accountId) {
      onRemoveEvidence(evidenceId)
      return
    }

    try {
      await deleteEvidence(accountId, control.id, evidenceId)
      setBackendEvidence(prev => prev.filter(ev => ev.id !== evidenceId))
    } catch (err: any) {
      setEvidenceError(err.message || t('controls.deleteFailedError'))
    }
  }

  const handleDownloadEvidence = (evidenceId: string) => {
    if (!accountId) return
    const url = getEvidenceDownloadUrl(accountId, control.id, evidenceId)
    window.open(url, '_blank')
  }

  const handleAssignEmployees = () => {
    // This would trigger the campaign creation in the parent
    // TODO: trigger campaign creation via API
    setIsAddingEmployee(false)
    setEmployeeEmails('')
    setDeadline('')
  }

  // Use backend evidence when connected (even if empty), fall back to localStorage otherwise
  const hasLoadedBackend = accountId && !evidenceLoading
  const displayEvidence = hasLoadedBackend ? backendEvidence : null

  return (
    <div className="fixed inset-0 bg-navy-950/80 backdrop-blur-sm z-50 flex items-center justify-end">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl h-full bg-navy-900 border-l border-navy-700 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 z-10 bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-cyan-400" />
            <h2 className="text-lg font-bold font-syne text-white">{t('controls.drawerTitle')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X size={18} className="text-navy-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title and Article */}
          <div>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">{categoryIcons[control.category]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-cyan-400">{control.article}</span>
                  <span className="text-xs text-[#4a6580]">•</span>
                  <span className="text-xs text-[#94b4d1]">{control.articleArea}</span>
                  {control.isAutoPopulated && (
                    <>
                      <span className="text-xs text-navy-500">•</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {t('controls.autoPopulatedBadge')}
                      </span>
                    </>
                  )}
                  {control.isPeopleControl && (
                    <>
                      <span className="text-xs text-navy-500">•</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t('controls.peopleBadge')}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-xl font-bold font-syne text-white leading-snug">{control.title}</h3>
              </div>
            </div>
            <p className="text-[14px] text-[#CBD8E8] leading-relaxed">{control.description}</p>
          </div>

          {/* Maturity Status */}
          <div className="p-4 rounded-lg bg-navy-800/60 border border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider">
                {t('controls.maturityStatusLabel')}
              </label>
              {!isEditingStatus && !control.isAutoPopulated && (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {t('controls.editButton')}
                </button>
              )}
            </div>

            {isEditingStatus ? (
              <div className="flex items-center gap-2">
                <select
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value as ControlStatus)}
                  className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                >
                  <option value="Not Started">{t('controls.statusNotStarted')}</option>
                  <option value="Planned">{t('controls.statusPlanned')}</option>
                  <option value="Partial">{t('controls.statusPartial')}</option>
                  <option value="Implemented">{t('controls.statusImplemented')}</option>
                </select>
                <Button size="sm" onClick={handleSaveStatus}>{t('controls.saveButton')}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempStatus(control.status)
                    setIsEditingStatus(false)
                  }}
                >
                  {t('controls.cancelButton')}
                </Button>
              </div>
            ) : (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-semibold ${statusColors[control.status]}`}>
                {control.status}
              </span>
            )}

            {control.isAutoPopulated && (
              <p className="mt-2 text-[13px] text-purple-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {t('controls.autoPopulatedNote')}
              </p>
            )}
          </div>

          {/* Owner */}
          <div className="p-4 rounded-lg bg-navy-800/60 border border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider flex items-center gap-2">
                <User size={14} />
                {t('controls.ownerLabel')}
              </label>
              {!isEditingOwner && (
                <button
                  onClick={() => setIsEditingOwner(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {t('controls.editButton')}
                </button>
              )}
            </div>

            {isEditingOwner ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempOwner}
                  onChange={(e) => setTempOwner(e.target.value)}
                  className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                  placeholder={t('controls.ownerPlaceholder')}
                />
                <Button size="sm" onClick={handleSaveOwner}>{t('controls.saveButton')}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempOwner(control.owner)
                    setIsEditingOwner(false)
                  }}
                >
                  {t('controls.cancelButton')}
                </Button>
              </div>
            ) : (
              <p className="text-[14px] text-white">{control.owner}</p>
            )}
          </div>

          {/* Due Date */}
          <div className="p-4 rounded-lg bg-navy-800/60 border border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} />
                {t('controls.dueDateLabel')}
              </label>
              {!isEditingDueDate && (
                <button
                  onClick={() => setIsEditingDueDate(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {t('controls.editButton')}
                </button>
              )}
            </div>

            {isEditingDueDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={tempDueDate}
                  onChange={(e) => setTempDueDate(e.target.value)}
                  className="flex-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                />
                <Button size="sm" onClick={handleSaveDueDate}>{t('controls.saveButton')}</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setTempDueDate(control.dueDate || '')
                    setIsEditingDueDate(false)
                  }}
                >
                  {t('controls.cancelButton')}
                </Button>
              </div>
            ) : (
              <p className="text-[14px] text-white">
                {control.dueDate ? format(new Date(control.dueDate), 'MMMM d, yyyy') : t('controls.noDueDateSet')}
              </p>
            )}
          </div>

          {/* Evidence */}
          <div className="p-4 rounded-lg bg-navy-800/60 border border-navy-700">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
              onChange={handleFileSelected}
            />
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} />
                {t('controls.evidenceLabel')} ({displayEvidence ? displayEvidence.length : control.evidence.length})
              </label>
              {!control.isAutoPopulated && (
                <Button size="sm" variant="secondary" onClick={handleUploadEvidence} disabled={uploading}>
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? t('controls.uploadingButton') : t('controls.uploadButton')}
                </Button>
              )}
            </div>

            {evidenceError && (
              <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] flex items-center gap-2">
                <AlertCircle size={14} />
                {evidenceError}
              </div>
            )}

            {evidenceLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-[#94b4d1]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-[13px]">{t('controls.loadingEvidence')}</span>
              </div>
            ) : displayEvidence ? (
              displayEvidence.length === 0 ? (
                <p className="text-[13px] text-[#94b4d1] italic">{t('controls.noEvidenceUploaded')}</p>
              ) : (
                <div className="space-y-2">
                  {displayEvidence.map(ev => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-navy-900/60 border border-navy-800 hover:border-navy-700 transition-colors"
                    >
                      <FileText size={16} className="text-cyan-400 flex-shrink-0" />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleDownloadEvidence(ev.id)}
                      >
                        <p className="text-[14px] font-medium text-white truncate hover:text-cyan-400 transition-colors">
                          {ev.filename}
                        </p>
                        <p className="text-[13px] text-[#94b4d1]">
                          {format(new Date(ev.uploadedAt), 'MMM d, yyyy')} • {ev.uploadedBy} • {formatFileSize(ev.fileSize)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadEvidence(ev.id)}
                        className="p-1.5 rounded hover:bg-navy-800 text-navy-400 hover:text-cyan-400 transition-colors"
                        title={t('controls.downloadTooltip')}
                      >
                        <Download size={14} />
                      </button>
                      {!control.isAutoPopulated && (
                        <button
                          onClick={() => handleDeleteEvidence(ev.id)}
                          className="p-1.5 rounded hover:bg-navy-800 text-navy-400 hover:text-red-400 transition-colors"
                          title={t('controls.deleteTooltip')}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Fallback: localStorage evidence when not connected to backend */
              control.evidence.length === 0 ? (
                <p className="text-[13px] text-[#94b4d1] italic">{t('controls.noEvidenceUploaded')}</p>
              ) : (
                <div className="space-y-2">
                  {control.evidence.map(ev => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-navy-900/60 border border-navy-800 hover:border-navy-700 transition-colors"
                    >
                      <FileText size={16} className="text-cyan-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-white truncate">{ev.filename}</p>
                        <p className="text-[13px] text-[#94b4d1]">
                          {format(new Date(ev.uploadedAt), 'MMM d, yyyy')} • {ev.uploadedBy} • {ev.fileSize}
                        </p>
                      </div>
                      {!control.isAutoPopulated && (
                        <button
                          onClick={() => onRemoveEvidence(ev.id)}
                          className="p-1.5 rounded hover:bg-navy-800 text-navy-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Notes */}
          <div className="p-4 rounded-lg bg-navy-800/60 border border-navy-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#94b4d1] uppercase tracking-wider">
                {t('controls.notesLabel')}
              </label>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {t('controls.editButton')}
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder={t('controls.notesPlaceholder')}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleSaveNotes}>{t('controls.saveButton')}</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTempNotes(control.notes)
                      setIsEditingNotes(false)
                    }}
                  >
                    {t('controls.cancelButton')}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#CBD8E8] leading-relaxed whitespace-pre-wrap">
                {control.notes || t('controls.noNotesAdded')}
              </p>
            )}
          </div>

          {/* Employee Assignment (for People controls only) */}
          {control.isPeopleControl && (
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[15px] font-semibold text-emerald-400 flex items-center gap-2">
                  <UsersIcon size={16} />
                  {t('controls.assignToEmployeesLabel')}
                </label>
              </div>

              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map(campaign => {
                    const completionRate = Math.round(
                      (campaign.tasks.filter((t: any) => t.status === 'completed').length / campaign.tasks.length) * 100
                    )
                    const isOverdue = new Date(campaign.deadline) < new Date() && completionRate < 80

                    return (
                      <div key={campaign.id} className="p-3 rounded-lg bg-navy-900/60 border border-navy-800">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-navy-800 text-[#CBD8E8]">
                              {campaign.taskType === 'quiz' ? t('controls.trainingQuizType') : t('controls.policyAcknowledgmentType')}
                            </span>
                            {isOverdue && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                {t('controls.atRiskBadge')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#94b4d1]">
                            Due: {format(new Date(campaign.deadline), 'MMM d, yyyy')}
                          </span>
                        </div>

                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#94b4d1]">
                              {t('controls.completedOfTotal', {
                                completed: campaign.tasks.filter((t: any) => t.status === 'completed').length,
                                total: campaign.tasks.length
                              })}
                            </span>
                            <span className={completionRate >= 80 ? 'text-emerald-400' : 'text-yellow-400'}>
                              {completionRate}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${completionRate >= 80 ? 'bg-emerald-500' : 'bg-yellow-500'}`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300 -ml-2"
                        >
                          {t('controls.viewDetailsButton')} <ChevronRight size={14} />
                        </Button>
                      </div>
                    )
                  })}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingEmployee(true)}
                    className="w-full"
                  >
                    <UsersIcon size={14} />
                    {t('controls.createNewCampaignButton')}
                  </Button>
                </div>
              ) : !isAddingEmployee ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddingEmployee(true)}
                  className="w-full"
                >
                  <UsersIcon size={14} />
                  {t('controls.assignToEmployeesButton')}
                </Button>
              ) : null}

              {isAddingEmployee && (
                <div className="space-y-3 mt-3 pt-3 border-t border-emerald-500/20">
                  <div>
                    <label className="text-xs text-[#94b4d1] mb-1 block">{t('controls.employeeEmailsLabel')}</label>
                    <textarea
                      value={employeeEmails}
                      onChange={(e) => setEmployeeEmails(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
                      placeholder="alice.johnson@company.com&#10;bob.martinez@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#94b4d1] mb-1 block">{t('controls.taskTypeLabel')}</label>
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value as 'acknowledge' | 'quiz')}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      <option value="acknowledge">{t('controls.acknowledgePolicy')}</option>
                      <option value="quiz">{t('controls.completeTrainingQuiz')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-[#94b4d1] mb-1 block">{t('controls.deadlineLabel')}</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleAssignEmployees} disabled={!employeeEmails || !deadline}>
                      <Mail size={14} />
                      {t('controls.sendTasksButton')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingEmployee(false)
                        setEmployeeEmails('')
                        setDeadline('')
                      }}
                    >
                      {t('controls.cancelButton')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-navy-700 text-xs text-[#94b4d1]">
            <div className="flex items-center gap-2">
              <Clock size={12} />
              <span>{t('controls.lastUpdated')} {format(new Date(control.lastUpdated), 'MMM d, yyyy \'at\' h:mm a')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ControlsLibrary() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const {
    controls,
    selectedControl,
    setSelectedControl,
    updateControl,
    addEvidence,
    removeEvidence,
    filterControls,
    getCampaignsForControl
  } = useControls()

  const validStatuses: ControlStatus[] = ['Not Started', 'Planned', 'Partial', 'Implemented']
  const validSeverities: ControlSeverity[] = ['critical', 'high', 'medium']
  const initialStatus = searchParams.get('status')
  const initialSeverity = searchParams.get('severity')
  const initialView = searchParams.get('view')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ControlCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<ControlStatus | ''>(
    validStatuses.includes(initialStatus as ControlStatus) ? (initialStatus as ControlStatus) : ''
  )
  const [articleAreaFilter, setArticleAreaFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<ControlSeverity | ''>(
    validSeverities.includes(initialSeverity as ControlSeverity) ? (initialSeverity as ControlSeverity) : ''
  )
  const [criticalGapsView, setCriticalGapsView] = useState(initialView === 'critical-gaps')

  const filteredControls = useMemo(() => {
    if (criticalGapsView) {
      return controls.filter(c =>
        (c.status === 'Not Started' || c.status === 'Partial') &&
        (c.severity === 'critical' || c.severity === 'high')
      )
    }
    return filterControls(
      categoryFilter || undefined,
      statusFilter || undefined,
      articleAreaFilter || undefined,
      searchQuery || undefined,
      severityFilter || undefined
    )
  }, [controls, searchQuery, categoryFilter, statusFilter, articleAreaFilter, severityFilter, criticalGapsView])

  const articleAreas = useMemo(() => {
    return Array.from(new Set(controls.map(c => c.articleArea)))
  }, [controls])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white flex items-center gap-2">
            {t('controls.pageTitle')}
            <InfoTooltip content={t('controls.pageTitleTooltip')} />
          </h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">
            {t('controls.pageSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[14px] text-[#94b4d1]">
            {t('controls.controlsCount', { filtered: filteredControls.length, total: controls.length })}
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('controls.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm placeholder-navy-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[#94b4d1] mb-1 flex items-center gap-1">
                {t('controls.categoryLabel')}
                <InfoTooltip content={t('controls.categoryTooltip')} size={12} />
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ControlCategory | '')}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('controls.allCategories')}</option>
                <option value="Technical">{t('controls.categoryTechnical')}</option>
                <option value="Organizational">{t('controls.categoryOrganizational')}</option>
                <option value="People">{t('controls.categoryPeople')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#94b4d1] mb-1 flex items-center gap-1">
                {t('controls.statusLabel')}
                <InfoTooltip content={t('controls.statusTooltip')} size={12} />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ControlStatus | '')}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('controls.allStatuses')}</option>
                <option value="Not Started">{t('controls.statusNotStarted')}</option>
                <option value="Planned">{t('controls.statusPlanned')}</option>
                <option value="Partial">{t('controls.statusPartial')}</option>
                <option value="Implemented">{t('controls.statusImplemented')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('controls.severityLabel')}</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as ControlSeverity | '')}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('controls.allSeverities')}</option>
                <option value="critical">{t('common.critical')}</option>
                <option value="high">{t('common.high')}</option>
                <option value="medium">{t('common.medium')}</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('controls.articleAreaLabel')}</label>
              <select
                value={articleAreaFilter}
                onChange={(e) => setArticleAreaFilter(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('controls.allAreas')}</option>
                {articleAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active filters */}
          {(searchQuery || categoryFilter || statusFilter || articleAreaFilter || severityFilter || criticalGapsView) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#94b4d1]">{t('controls.activeFiltersLabel')}</span>
              {criticalGapsView && (
                <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  {t('overview.criticalGaps')}
                  <button onClick={() => setCriticalGapsView(false)} className="text-red-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="text-xs px-2 py-1 rounded bg-navy-800 text-white flex items-center gap-1">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="text-navy-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              {categoryFilter && (
                <span className="text-xs px-2 py-1 rounded bg-navy-800 text-white flex items-center gap-1">
                  {categoryFilter}
                  <button onClick={() => setCategoryFilter('')} className="text-navy-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              {statusFilter && (
                <span className="text-xs px-2 py-1 rounded bg-navy-800 text-white flex items-center gap-1">
                  {statusFilter}
                  <button onClick={() => setStatusFilter('')} className="text-navy-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              {severityFilter && (
                <span className="text-xs px-2 py-1 rounded bg-navy-800 text-white flex items-center gap-1">
                  {severityFilter}
                  <button onClick={() => setSeverityFilter('')} className="text-navy-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              {articleAreaFilter && (
                <span className="text-xs px-2 py-1 rounded bg-navy-800 text-white flex items-center gap-1">
                  {articleAreaFilter}
                  <button onClick={() => setArticleAreaFilter('')} className="text-navy-400 hover:text-white">
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCategoryFilter('')
                  setStatusFilter('')
                  setSeverityFilter('')
                  setArticleAreaFilter('')
                  setCriticalGapsView(false)
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {t('controls.clearAll')}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Controls Table */}
      <Card>
        {filteredControls.length === 0 ? (
          <div className="text-center py-12">
            <Filter size={48} className="text-navy-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold font-syne text-white mb-2">
              {t('controls.noControlsFoundTitle')}
            </h3>
            <p className="text-[14px] text-[#94b4d1]">
              {t('controls.noControlsFoundSubtitle')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredControls.map((control, i) => (
              <div
                key={control.id}
                onClick={() => setSelectedControl(control)}
                className="group flex items-center gap-4 p-4 rounded-lg bg-navy-900/40 hover:bg-navy-800/60 border border-navy-800 hover:border-navy-700 cursor-pointer transition-all"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex-shrink-0 text-2xl">
                  {categoryIcons[control.category]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[15px] font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                      {control.title}
                    </h3>
                    {control.isAutoPopulated && (
                      <Tooltip content={t('controls.autoTooltip')}>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
                          {t('controls.autoPopulatedBadge')}
                        </span>
                      </Tooltip>
                    )}
                    {control.isPeopleControl && (
                      <Tooltip content={t('controls.peopleTooltip')}>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                          {t('controls.peopleBadge')}
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="text-[#94b4d1] font-mono">{control.article}</span>
                    <span className="text-[#4a6580]">•</span>
                    <span className="text-[#94b4d1]">{control.category}</span>
                    {control.evidence.length > 0 && (
                      <>
                        <span className="text-navy-600">•</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          <FileText size={11} />
                          {t('controls.evidenceCount', { count: control.evidence.length })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-[#94b4d1]">{t('controls.ownerColumnLabel')}</p>
                    <p className="text-[13px] text-white">{control.owner}</p>
                  </div>

                  <span className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${statusColors[control.status]}`}>
                    {control.status}
                  </span>

                  <ChevronRight size={16} className="text-[#4a6580] group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Control Drawer */}
      {selectedControl && (
        <ControlDrawer
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
          onUpdate={(updates) => {
            updateControl(selectedControl.id, updates)
            setSelectedControl({ ...selectedControl, ...updates })
          }}
          onAddEvidence={(evidence) => {
            addEvidence(selectedControl.id, evidence)
          }}
          onRemoveEvidence={(evidenceId) => {
            removeEvidence(selectedControl.id, evidenceId)
          }}
          campaigns={getCampaignsForControl(selectedControl.id)}
        />
      )}
    </div>
  )
}
