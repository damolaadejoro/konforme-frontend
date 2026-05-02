import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Upload, Download, Loader2, AlertCircle, X, Search, Link2, FileText,
  FileSpreadsheet, FileImage, File,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  uploadEvidenceV2,
  linkEvidence,
  getEvidenceForEntity,
  getEvidenceDownloadUrlV2,
  searchEvidenceLibrary,
  type EvidenceUploadResult,
  type EvidenceLibraryItem,
} from '../services/api'

interface EvidencePanelProps {
  entityType: string
  entityId: string
  readOnly?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return <FileText size={14} className="text-red-500 shrink-0" />
  if (['doc', 'docx'].includes(ext)) return <FileText size={14} className="text-blue-500 shrink-0" />
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={14} className="text-emerald-500 shrink-0" />
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <FileImage size={14} className="text-purple-500 shrink-0" />
  return <File size={14} className="text-muted-foreground shrink-0" />
}

function fileExtBadge(filename: string) {
  const ext = filename.split('.').pop()?.toUpperCase() || ''
  return (
    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
      {ext}
    </span>
  )
}

export default function EvidencePanel({ entityType, entityId, readOnly = false }: EvidencePanelProps) {
  const { t } = useTranslation()
  const { accountId } = useAuth()
  const [files, setFiles] = useState<EvidenceUploadResult[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryItems, setLibraryItems] = useState<EvidenceLibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    if (!accountId) return
    try {
      setLoading(true)
      const items = await getEvidenceForEntity(accountId, entityType, entityId)
      setFiles(items)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [accountId, entityType, entityId])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleUpload = async (fileList: FileList) => {
    if (!accountId || readOnly) return
    setError(null)
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        const ev = await uploadEvidenceV2(accountId, file)
        await linkEvidence(accountId, ev.id, entityType, entityId)
      }
      await loadFiles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files)
  }

  const handleDownload = async (evidenceId: string) => {
    if (!accountId) return
    try {
      const { url } = await getEvidenceDownloadUrlV2(accountId, evidenceId)
      window.open(url, '_blank')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openLibrary = async () => {
    if (!accountId) return
    setShowLibrary(true)
    setLibrarySearch('')
    await searchLibrary('')
  }

  const searchLibrary = async (q: string) => {
    if (!accountId) return
    setLibraryLoading(true)
    try {
      const result = await searchEvidenceLibrary(accountId, { q: q || undefined, perPage: 50 })
      // Filter out files already linked to this entity
      const linkedIds = new Set(files.map(f => f.id))
      setLibraryItems(result.items.filter(item => !linkedIds.has(item.id)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLibraryLoading(false)
    }
  }

  const linkFromLibrary = async (evidenceId: string) => {
    if (!accountId) return
    setLinking(evidenceId)
    try {
      await linkEvidence(accountId, evidenceId, entityType, entityId)
      setLibraryItems(prev => prev.filter(i => i.id !== evidenceId))
      await loadFiles()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLinking(null)
    }
  }

  // Debounced search
  useEffect(() => {
    if (!showLibrary) return
    const timer = setTimeout(() => searchLibrary(librarySearch), 300)
    return () => clearTimeout(timer)
  }, [librarySearch, showLibrary])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">
          {t('evidence.title', 'Evidence')} ({files.length})
        </h4>
        {!readOnly && (
          <button
            onClick={openLibrary}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Link2 size={12} />
            {t('evidence.linkFromLibrary', 'Link from library')}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <span className="text-red-600 dark:text-red-400 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border/80'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {t('evidence.uploading', 'Uploading...')}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-1">
              <Upload size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('evidence.dropOrClick', 'Drop files here or click to upload')}
              </span>
              <span className="text-[10px] text-muted-foreground/60">
                PDF, DOCX, XLSX, PNG, JPG, CSV — max 10 MB
              </span>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </label>
          )}
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t('evidence.noFiles', 'No evidence files attached')}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/50 border border-border text-sm group"
            >
              {fileIcon(f.filename)}
              <span className="flex-1 text-foreground truncate text-xs">{f.filename}</span>
              {fileExtBadge(f.filename)}
              <span className="text-[10px] text-muted-foreground">{formatFileSize(f.fileSize)}</span>
              <button
                onClick={() => handleDownload(f.id)}
                className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                title={t('evidence.download', 'Download')}
              >
                <Download size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Library modal */}
      {showLibrary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLibrary(false) }}
        >
          <div className="bg-background border border-border rounded-xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {t('evidence.libraryTitle', 'Evidence Library')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select a file to link to this control
                </p>
              </div>
              <button
                onClick={() => setShowLibrary(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 py-3 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  placeholder="Search by filename or tag..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {libraryLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : libraryItems.length === 0 ? (
                <div className="text-center py-10">
                  <File size={28} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {librarySearch
                      ? `No files matching "${librarySearch}"`
                      : 'No files in your evidence library yet'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Upload files using the drop zone to get started
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {libraryItems.map((item) => {
                    const isLinking = linking === item.id
                    return (
                      <li
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                          isLinking
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5 cursor-pointer'
                        }`}
                        onClick={() => !isLinking && linkFromLibrary(item.id)}
                      >
                        {fileIcon(item.filename)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{item.filename}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{formatFileSize(item.fileSize)}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">{item.uploadedBy}</span>
                            {item.tags.length > 0 && (
                              <>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                {item.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {tag}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {fileExtBadge(item.filename)}
                          {isLinking ? (
                            <Loader2 size={14} className="animate-spin text-primary" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{item.linkCount} {item.linkCount === 1 ? 'link' : 'links'}</span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
