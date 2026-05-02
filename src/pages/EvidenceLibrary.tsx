import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Archive, Search, Upload, Download, Trash2, Loader2, Tag, Link2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import PageHeader from '../components/layout/PageHeader'
import {
  searchEvidenceLibrary,
  uploadEvidenceV2,
  deleteEvidenceV2,
  getEvidenceDownloadUrlV2,
  getEvidenceTags,
  linkEvidence,
  unlinkEvidence,
  getBaseControls,
  getRemediationTasks,
  fetchPeopleTasks,
  type EvidenceLibraryItem,
  type EvidenceLinkedEntity,
  type BaseControlDef,
} from '../services/api'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ENTITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  control:           { bg: 'bg-primary/15',   text: 'text-primary',   label: 'Control' },
  assessment_answer: { bg: 'bg-amber-100',  text: 'text-amber-600',  label: 'Assessment' },
  remediation_task:  { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Remediation' },
  people_task:       { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'People Task' },
  process:           { bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'Process' },
}

const ENTITY_TYPES = [
  { value: 'control', label: 'Control' },
  { value: 'remediation_task', label: 'Remediation Task' },
  { value: 'people_task', label: 'People Task' },
] as const

function getEntityRoute(entity: EvidenceLinkedEntity): string {
  switch (entity.entityType) {
    case 'control': return `/controls?open=${entity.entityId}`
    case 'assessment_answer': return '/assessment'
    case 'remediation_task': return '/remediation'
    case 'people_task': return '/people-tasks/continuous'
    case 'process': return '/scope'
    default: return ''
  }
}

function LinkedEntityBadge({
  entity,
  onClick,
  onUnlink,
}: {
  entity: EvidenceLinkedEntity
  onClick: () => void
  onUnlink: (e: React.MouseEvent) => void
}) {
  const style = ENTITY_STYLES[entity.entityType] || { bg: 'bg-muted/15', text: 'text-muted-foreground', label: entity.entityType }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${style.bg} ${style.text} max-w-[220px] group`}
      title={`${style.label}: ${entity.entityName}`}
    >
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity truncate"
      >
        <span className="font-medium shrink-0">{style.label}</span>
        <span className="truncate opacity-80">{entity.entityName}</span>
      </button>
      <button
        onClick={onUnlink}
        className="shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-80 transition-opacity ml-0.5"
        title="Unlink"
      >
        <X size={12} />
      </button>
    </span>
  )
}

/* ---------- Link-to-Entity Modal ---------- */
interface EntityOption {
  id: string
  label: string
}

function LinkToEntityModal({
  accountId,
  evidenceId,
  onClose,
  onLinked,
}: {
  accountId: string
  evidenceId: string
  onClose: () => void
  onLinked: () => void
}) {
  const [entityType, setEntityType] = useState<string>('control')
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([])
  const [filteredOptions, setFilteredOptions] = useState<EntityOption[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load entities when type changes
  useEffect(() => {
    let cancelled = false
    setLoadingEntities(true)
    setEntityOptions([])
    setFilteredOptions([])
    setSelectedEntityId(null)
    setSearchTerm('')
    setError(null)

    const load = async () => {
      try {
        let options: EntityOption[] = []
        if (entityType === 'control') {
          const controls = await getBaseControls()
          options = controls.map((c: BaseControlDef) => ({
            id: c.controlId,
            label: `${c.article} — ${c.title}`,
          }))
        } else if (entityType === 'remediation_task') {
          const tasks = await getRemediationTasks(accountId)
          options = tasks.map((t: any) => ({
            id: t.id,
            label: t.title || t.questionId || t.id,
          }))
        } else if (entityType === 'people_task') {
          const tasks = await fetchPeopleTasks(accountId)
          options = tasks.map((t: any) => ({
            id: t.id,
            label: t.title || t.id,
          }))
        }
        if (!cancelled) {
          setEntityOptions(options)
          setFilteredOptions(options)
          setLoadingEntities(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message)
          setLoadingEntities(false)
        }
      }
    }
    load()
    return () => { cancelled = true }
  }, [entityType, accountId])

  // Filter by search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(entityOptions)
    } else {
      const lower = searchTerm.toLowerCase()
      setFilteredOptions(entityOptions.filter(o => o.label.toLowerCase().includes(lower)))
    }
  }, [searchTerm, entityOptions])

  const handleSubmit = async () => {
    if (!selectedEntityId) return
    setSubmitting(true)
    setError(null)
    try {
      await linkEvidence(accountId, evidenceId, entityType, selectedEntityId)
      onLinked()
      onClose()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Link to Entity</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-y-auto">
          {/* Entity type picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Entity Type</label>
            <div className="flex gap-2 flex-wrap">
              {ENTITY_TYPES.map((et) => (
                <button
                  key={et.value}
                  onClick={() => setEntityType(et.value)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    entityType === et.value
                      ? 'bg-primary/15 text-primary border border-primary/30 font-medium'
                      : 'bg-card text-muted-foreground border border-border hover:border-border/80'
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Entity search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Select Entity</label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {loadingEntities ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-primary" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No entities found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedEntityId(opt.id)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-border last:border-b-0 ${
                      selectedEntityId === opt.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEntityId || submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-navy-900 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Link
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- Main Component ---------- */
export default function EvidenceLibrary() {
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<EvidenceLibraryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkModalEvidenceId, setLinkModalEvidenceId] = useState<string | null>(null)

  const loadLibrary = useCallback(async () => {
    if (!accountId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await searchEvidenceLibrary(accountId, {
        q: query || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        page,
        perPage,
      })
      setItems(result.items || [])
      setTotal(result.total || 0)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, query, selectedTags, page, perPage])

  useEffect(() => { loadLibrary() }, [loadLibrary])

  useEffect(() => {
    if (!accountId) return
    getEvidenceTags(accountId).then(setAllTags).catch(() => {})
  }, [accountId])

  const handleUpload = async (fileList: FileList) => {
    if (!accountId) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(fileList)) {
        await uploadEvidenceV2(accountId, file)
      }
      await loadLibrary()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (item: EvidenceLibraryItem) => {
    if (!accountId) return
    try {
      const { url } = await getEvidenceDownloadUrlV2(accountId, item.id)
      window.open(url, '_blank')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!accountId || !confirm(t('evidence.confirmDelete', 'Delete this evidence file?'))) return
    try {
      await deleteEvidenceV2(accountId, id)
      await loadLibrary()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleUnlink = async (linkId: string) => {
    if (!accountId) return
    try {
      await unlinkEvidence(accountId, linkId)
      await loadLibrary()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
    setPage(1)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <PageContainer>
      <PageContent>
        <PageHeader
          title={t('evidence.libraryTitle', 'Evidence Library')}
          subtitle={t('evidence.libraryDesc', 'Manage all evidence files for your organisation')}
          actions={
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-navy hover:bg-navy/90 text-white font-semibold rounded-lg transition-colors text-sm">
              <Upload size={16} />
              {uploading ? t('evidence.uploading', 'Uploading...') : t('evidence.upload', 'Upload')}
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        {/* Search & Tags */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder={t('evidence.searchPlaceholder', 'Search by filename, description, or tag...')}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={14} className="text-muted-foreground" />
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary/5 text-primary border border-primary/15'
                      : 'bg-card text-muted-foreground border border-border hover:border-border/80'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Archive size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('evidence.libraryEmpty', 'No files in your evidence library yet')}</p>
          </div>
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.filename', 'Filename')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.size', 'Size')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.uploadedBy', 'Uploaded By')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.date', 'Date')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.tags', 'Tags')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium">{t('evidence.linkedTo', 'Linked To')}</th>
                    <th className="px-4 py-3 text-muted-foreground font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-muted transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium truncate max-w-[200px]">{item.filename}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatFileSize(item.fileSize)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.uploadedBy}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {item.tags.map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.linkedEntities && item.linkedEntities.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {item.linkedEntities.slice(0, 2).map((le, i) => (
                              <LinkedEntityBadge
                                key={`${le.entityType}-${le.entityId}-${i}`}
                                entity={le}
                                onClick={() => {
                                  const route = getEntityRoute(le)
                                  if (route) navigate(route)
                                }}
                                onUnlink={(e) => {
                                  e.stopPropagation()
                                  handleUnlink(le.linkId)
                                }}
                              />
                            ))}
                            {item.linkedEntities.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{item.linkedEntities.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-foreground/70">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLinkModalEvidenceId(item.id)}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            title="Link to entity"
                          >
                            <Link2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDownload(item)}
                            className="p-1 text-muted-foreground hover:text-primary transition-colors"
                            title={t('evidence.download', 'Download')}
                          >
                            <Download size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                            title={t('evidence.delete', 'Delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm mt-6">
                <span className="text-muted-foreground">
                  {t('evidence.showing', 'Showing')} {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} {t('evidence.of', 'of')} {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded bg-card border border-border text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded bg-card border border-border text-muted-foreground disabled:opacity-50 hover:bg-muted transition-colors"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Link Modal */}
        {linkModalEvidenceId && accountId && (
          <LinkToEntityModal
            accountId={accountId}
            evidenceId={linkModalEvidenceId}
            onClose={() => setLinkModalEvidenceId(null)}
            onLinked={() => loadLibrary()}
          />
        )}
      </PageContent>
    </PageContainer>
  )
}
