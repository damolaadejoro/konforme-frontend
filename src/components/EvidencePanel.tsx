import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileText, Download, Loader2, AlertCircle } from 'lucide-react'
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
  const [dragOver, setDragOver] = useState(false)

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
    setLibraryLoading(true)
    try {
      const result = await searchEvidenceLibrary(accountId, { perPage: 50 })
      setLibraryItems(result.items)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLibraryLoading(false)
    }
  }

  const linkFromLibrary = async (evidenceId: string) => {
    if (!accountId) return
    try {
      await linkEvidence(accountId, evidenceId, entityType, entityId)
      setShowLibrary(false)
      await loadFiles()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">
          {t('evidence.title', 'Evidence')} ({files.length})
        </h4>
        {!readOnly && (
          <button
            onClick={openLibrary}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {t('evidence.linkFromLibrary', 'Link from library')}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Drop zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-navy-600 hover:border-navy-500'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              {t('evidence.uploading', 'Uploading...')}
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-1">
              <Upload size={20} className="text-slate-500" />
              <span className="text-xs text-slate-400">
                {t('evidence.dropOrClick', 'Drop files here or click to upload')}
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
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-slate-500" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-2">
          {t('evidence.noFiles', 'No evidence files attached')}
        </p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800/50 border border-navy-700/50 text-sm"
            >
              <FileText size={14} className="text-cyan-400 shrink-0" />
              <span className="flex-1 text-slate-200 truncate">{f.filename}</span>
              <span className="text-xs text-slate-500">{formatFileSize(f.fileSize)}</span>
              <button
                onClick={() => handleDownload(f.id)}
                className="text-slate-400 hover:text-cyan-400 transition-colors"
                title={t('evidence.download', 'Download')}
              >
                <Download size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Library modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-navy-900 border border-navy-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {t('evidence.libraryTitle', 'Evidence Library')}
              </h3>
              <button
                onClick={() => setShowLibrary(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
            {libraryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-slate-500" />
              </div>
            ) : libraryItems.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                {t('evidence.libraryEmpty', 'No files in your evidence library yet')}
              </p>
            ) : (
              <ul className="space-y-2">
                {libraryItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy-800/50 border border-navy-700/50 hover:border-cyan-500/30 transition-colors cursor-pointer"
                    onClick={() => linkFromLibrary(item.id)}
                  >
                    <FileText size={16} className="text-cyan-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{item.filename}</p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(item.fileSize)} · {item.uploadedBy}
                        {item.tags.length > 0 && ` · ${item.tags.join(', ')}`}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{item.linkCount} links</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
