import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Archive, Search, Upload, Download, Trash2, Loader2, Tag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  searchEvidenceLibrary,
  uploadEvidenceV2,
  deleteEvidenceV2,
  getEvidenceDownloadUrlV2,
  getEvidenceTags,
  type EvidenceLibraryItem,
  type EvidenceLinkedEntity,
} from '../services/api'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ENTITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  control:           { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   label: 'Control' },
  assessment_answer: { bg: 'bg-amber-500/15',  text: 'text-amber-400',  label: 'Assessment' },
  remediation_task:  { bg: 'bg-purple-500/15', text: 'text-purple-400', label: 'Remediation' },
  people_task:       { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'People Task' },
  process:           { bg: 'bg-blue-500/15',   text: 'text-blue-400',   label: 'Process' },
}

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

function LinkedEntityBadge({ entity, onClick }: { entity: EvidenceLinkedEntity; onClick: () => void }) {
  const style = ENTITY_STYLES[entity.entityType] || { bg: 'bg-slate-500/15', text: 'text-slate-400', label: entity.entityType, route: '' }
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${style.bg} ${style.text} hover:opacity-80 transition-opacity max-w-[220px] truncate`}
      title={`${style.label}: ${entity.entityName}`}
    >
      <span className="font-medium shrink-0">{style.label}</span>
      <span className="truncate opacity-80">{entity.entityName}</span>
    </button>
  )
}

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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
    setPage(1)
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-syne flex items-center gap-3">
            <Archive className="text-cyan-400" size={24} />
            {t('evidence.libraryTitle', 'Evidence Library')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('evidence.libraryDesc', 'Manage all evidence files for your organisation')}
          </p>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-navy-900 font-semibold rounded-lg transition-colors text-sm">
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
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Search & Tags */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
            placeholder={t('evidence.searchPlaceholder', 'Search by filename, description, or tag...')}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-slate-500" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-navy-800 text-slate-400 border border-navy-700 hover:border-navy-600'
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
          <Loader2 size={24} className="animate-spin text-cyan-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Archive size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('evidence.libraryEmpty', 'No files in your evidence library yet')}</p>
        </div>
      ) : (
        <>
          <div className="border border-navy-700/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-800/60 text-left">
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.filename', 'Filename')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.size', 'Size')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.uploadedBy', 'Uploaded By')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.date', 'Date')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.tags', 'Tags')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium">{t('evidence.linkedTo', 'Linked To')}</th>
                  <th className="px-4 py-3 text-slate-400 font-medium sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/30">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-navy-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium truncate max-w-[200px]">{item.filename}</td>
                    <td className="px-4 py-3 text-slate-400">{formatFileSize(item.fileSize)}</td>
                    <td className="px-4 py-3 text-slate-400">{item.uploadedBy}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {item.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-navy-700 text-xs text-slate-400">{tag}</span>
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
                            />
                          ))}
                          {item.linkedEntities.length > 2 && (
                            <span className="text-xs text-slate-500">+{item.linkedEntities.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(item)}
                          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors"
                          title={t('evidence.download', 'Download')}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition-colors"
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {t('evidence.showing', 'Showing')} {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} {t('evidence.of', 'of')} {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded bg-navy-800 text-slate-400 disabled:opacity-50 hover:bg-navy-700 transition-colors"
                >
                  {t('common.previous', 'Previous')}
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded bg-navy-800 text-slate-400 disabled:opacity-50 hover:bg-navy-700 transition-colors"
                >
                  {t('common.next', 'Next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
