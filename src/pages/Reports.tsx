import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  Building,
  Globe,
  ChevronRight,
  Printer,
  Eye,
  BarChart2,
  Radar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, Button, SeverityBadge, ProgressBar, InfoTooltip } from '../components/ui'
import { format } from 'date-fns'
import { useControlsContext } from '../context/ControlsContext'
import { useAuth } from '../context/AuthContext'
import { generateComplianceReport } from '../utils/generatePDF'
import { useDashboardScan } from '../hooks/useDashboardScan'
import type { ScanResponse } from '../services/api'
import type { Severity } from '../types'

function ReportPreview({ scanData }: { scanData: ScanResponse }) {
  const { t } = useTranslation()
  const date = scanData.completedAt ? format(new Date(scanData.completedAt), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy')
  const score = scanData.overallScore ?? 0
  const priorityFindings = scanData.findings.filter(f => f.status === 'fail').slice(0, 6)

  const roadmap = [
    {
      priority: 1,
      label: t('reports.roadmapWeek1_2Label'),
      title: t('reports.roadmapWeek1_2Title'),
      items: [t('reports.roadmapWeek1_2Item1'), t('reports.roadmapWeek1_2Item2'), t('reports.roadmapWeek1_2Item3')],
      severity: 'critical' as const,
    },
    {
      priority: 2,
      label: t('reports.roadmapWeek3_4Label'),
      title: t('reports.roadmapWeek3_4Title'),
      items: [t('reports.roadmapWeek3_4Item1'), t('reports.roadmapWeek3_4Item2'), t('reports.roadmapWeek3_4Item3'), t('reports.roadmapWeek3_4Item4')],
      severity: 'high' as const,
    },
    {
      priority: 3,
      label: t('reports.roadmapMonth2Label'),
      title: t('reports.roadmapMonth2Title'),
      items: [t('reports.roadmapMonth2Item1'), t('reports.roadmapMonth2Item2'), t('reports.roadmapMonth2Item3'), t('reports.roadmapMonth2Item4')],
      severity: 'medium' as const,
    },
    {
      priority: 4,
      label: t('reports.roadmapOngoingLabel'),
      title: t('reports.roadmapOngoingTitle'),
      items: [t('reports.roadmapOngoingItem1'), t('reports.roadmapOngoingItem2'), t('reports.roadmapOngoingItem3'), t('reports.roadmapOngoingItem4')],
      severity: 'pass' as const,
    },
  ]

  return (
    <div className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Report header */}
      <div className="bg-[#0B1F3A] px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="100" fill="#0B1F3A" />
                <path d="M100 30L40 58V100C40 137 64 170 100 182C136 170 160 137 160 100V58L100 30Z" fill="#0B1F3A" stroke="#00C2D4" strokeWidth="6" />
                <path d="M72 72V128M72 100L104 72M72 100L108 128" stroke="#00C2D4" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-white font-bold text-lg font-syne">{t('reports.konforme')}</span>
            </div>
            <h1 className="text-2xl font-bold text-white font-syne mt-2">{t('reports.reportHeaderTitle')}</h1>
            <p className="text-[#7a9cc4] text-sm mt-1">{t('reports.reportHeaderSubtitle')}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-red-400 font-syne">{score}%</div>
            <div className="text-red-400 text-sm font-semibold">{t('reports.nonCompliant')}</div>
            <div className="text-[#7a9cc4] text-xs mt-1">{date}</div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Executive Summary */}
        <section>
          <h2 className="text-lg font-bold font-syne text-gray-800 border-b border-gray-200 pb-2 mb-4">
            {t('reports.executiveSummaryTitle')}
          </h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-700 text-sm">{t('reports.criticalComplianceGap')}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {t('reports.executiveSummaryBody', {
                    accountName: scanData.accountName,
                    score,
                    criticalCount: scanData.criticalCount,
                    highCount: scanData.highCount,
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: t('reports.totalChecksLabel'), value: scanData.totalChecks, color: 'text-gray-700' },
              { label: t('reports.passedLabel'), value: scanData.passed, color: 'text-emerald-600' },
              { label: t('reports.failedLabel'), value: scanData.failed, color: 'text-red-600' },
              { label: t('reports.criticalLabel'), value: scanData.criticalCount, color: 'text-red-700' },
            ].map(stat => (
              <div key={stat.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold font-syne ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Score by domain */}
        <section>
          <h2 className="text-lg font-bold font-syne text-gray-800 border-b border-gray-200 pb-2 mb-4">
            {t('reports.complianceByDomainTitle')}
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={scanData.domainScores} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="domain" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={50}>
                {scanData.domainScores.map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 75 ? '#10b981' : entry.score >= 50 ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Critical findings */}
        <section>
          <h2 className="text-lg font-bold font-syne text-gray-800 border-b border-gray-200 pb-2 mb-4">
            {t('reports.priorityFindingsTitle')}
          </h2>
          <div className="space-y-2">
            {priorityFindings.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                <span className="w-6 h-6 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.checkName}</p>
                  <p className="text-xs text-gray-500 truncate">{f.resource}</p>
                </div>
                <span className="text-xs font-mono text-blue-600 hidden sm:block">{f.article}</span>
                <div className="flex-shrink-0">
                  <SeverityBadge severity={f.severity as Severity} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Remediation roadmap */}
        <section>
          <h2 className="text-lg font-bold font-syne text-gray-800 border-b border-gray-200 pb-2 mb-4">
            {t('reports.remediationRoadmapTitle')}
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {roadmap.map((phase) => (
                <div key={phase.priority} className="relative flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0B1F3A] flex items-center justify-center text-white text-xs font-bold z-10">
                    {phase.priority}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{phase.label}</span>
                      <span className="font-semibold text-gray-800 text-sm">{phase.title}</span>
                    </div>
                    <ul className="space-y-1">
                      {phase.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <ChevronRight size={11} className="text-gray-400 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
          <span>{t('reports.footerGenerated')} · {date}</span>
          <span>{t('reports.footerConfidential')}</span>
          <span>{t('reports.footerDirective')}</span>
        </div>
      </div>
    </div>
  )
}

export default function Reports() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const { controls, complianceScore, articleAreas, criticalGaps, allCriticalGaps } = useControlsContext()
  const { accountName } = useAuth()
  const { scanData, loading } = useDashboardScan()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generateComplianceReport({
        companyName: accountName || t('reports.defaultCompanyName'),
        complianceScore,
        controls,
        articleAreas,
        criticalGaps,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    )
  }

  // Compute control status counts
  const totalControls = controls.length || 1
  const implemented = controls.filter(c => c.status === 'Implemented').length
  const partial = controls.filter(c => c.status === 'Partial').length
  const planned = controls.filter(c => c.status === 'Planned').length
  const notStarted = controls.filter(c => c.status === 'Not Started').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-syne text-white flex items-center gap-2">
            {t('reports.pageTitle')}
            <InfoTooltip content={t('reports.pageTitleTooltip')} />
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {t('reports.pageSubtitle')}{scanData ? ` · ${scanData.accountName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {scanData && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye size={15} />
              {showPreview ? t('reports.hidePreviewButton') : t('reports.showPreviewButton')}
            </Button>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={handlePrint}
          >
            <Printer size={15} />
            {t('reports.printButton')}
          </Button>
          <Button
            size="md"
            loading={generating}
            onClick={handleGenerate}
          >
            {!generating && <Download size={15} />}
            {generating ? t('reports.generatingPdfButton') : t('reports.downloadPdfButton')}
          </Button>
        </div>
      </div>

      {/* Report metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Shield size={15} className="text-cyan-400" />, label: t('reports.frameworkLabel'), value: t('reports.frameworkValue') },
          { icon: <Calendar size={15} className="text-cyan-400" />, label: 'Report Date', value: format(new Date(), 'MMM d, yyyy') },
          { icon: <Building size={15} className="text-cyan-400" />, label: 'Organisation', value: accountName || '—' },
          { icon: <Globe size={15} className="text-cyan-400" />, label: 'Overall Score', value: `${complianceScore.overall}%` },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-navy-800/60">{item.icon}</div>
            <div>
              <p className="text-xs text-[#94b4d1]">{item.label}</p>
              <p className="text-sm font-semibold text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Organisational Controls Section ─── */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">Organisational Controls Status</h2>
          <InfoTooltip content="Implementation status of NIS2 Article 21 organisational and technical controls" size={12} />
        </div>

        {/* Control status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Implemented', count: implemented, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Partial', count: partial, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
            { label: 'Planned', count: planned, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
            { label: 'Not Started', count: notStarted, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border p-3 text-center ${s.bg}`}>
              <div className={`text-2xl font-bold font-syne ${s.color}`}>{s.count}</div>
              <div className="text-xs text-[#94b4d1] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Article area breakdown */}
        <div className="space-y-3">
          {articleAreas.map(area => {
            const pct = area.controlCount > 0 ? Math.round((area.implementedCount / area.controlCount) * 100) : 0
            return (
              <div key={area.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#94b4d1]">{area.article}</span>
                    <span className="text-sm font-medium text-white">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#94b4d1]">{area.implementedCount}/{area.controlCount}</span>
                    <span className={`text-sm font-bold ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={pct} />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Technical Controls', score: complianceScore.technical, icon: <Radar size={14} className="text-cyan-400" /> },
          { label: 'Organisational Controls', score: complianceScore.organizational, icon: <Shield size={14} className="text-cyan-400" /> },
          { label: 'People & Culture', score: complianceScore.people, icon: <Building size={14} className="text-cyan-400" /> },
        ].map(cat => (
          <Card key={cat.label}>
            <div className="flex items-center gap-2 mb-3">
              {cat.icon}
              <h3 className="text-sm font-bold font-syne text-white">{cat.label}</h3>
            </div>
            <div className={`text-3xl font-bold font-syne mb-2 ${cat.score >= 75 ? 'text-emerald-400' : cat.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {cat.score}%
            </div>
            <ProgressBar value={cat.score} />
            <p className="text-xs text-[#94b4d1] mt-2">
              {cat.score >= 75 ? 'Good — on track for compliance' : cat.score >= 50 ? 'At risk — action needed' : 'Critical — immediate action required'}
            </p>
          </Card>
        ))}
      </div>

      {/* Critical Gaps */}
      {criticalGaps.length > 0 && (
        <Card>
          <h3 className="text-sm font-bold font-syne text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            Top Critical Gaps ({allCriticalGaps.length} total)
            <InfoTooltip content="High and critical severity controls that are Not Started or Partial" size={12} />
          </h3>
          <div className="space-y-2">
            {criticalGaps.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-navy-800/60 last:border-0">
                <SeverityBadge severity={c.severity as Severity} />
                <span className="text-xs text-[#CBD8E8] flex-1 truncate">{c.title}</span>
                <span className="text-xs font-mono text-[#94b4d1]">{c.article}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  c.status === 'Not Started' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                }`}>{c.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Technical Scan Section ─── */}
      {scanData ? (
        <>
          <div className="flex items-center gap-3 pt-2">
            <Radar size={16} className="text-cyan-400" />
            <h2 className="text-base font-bold font-syne text-white">Technical Scan Results</h2>
            <span className="text-xs text-[#94b4d1] px-2 py-0.5 rounded-full bg-navy-800 border border-navy-700">
              {scanData.accountName} · {scanData.completedAt ? format(new Date(scanData.completedAt), 'MMM d, yyyy') : '—'}
            </span>
          </div>

          {/* Scan quick stats */}
          <Card>
            <div className="flex items-center gap-3 mb-5">
              <BarChart2 size={16} className="text-cyan-400" />
              <h2 className="text-base font-bold font-syne text-white">{t('reports.reportSummaryTitle')}</h2>
              <InfoTooltip content={t('reports.reportSummaryTooltip')} size={12} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {scanData.domainScores.map(d => (
                <div key={d.domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{d.domain}</span>
                    <span className={`text-sm font-bold ${d.score >= 75 ? 'text-emerald-400' : d.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {d.score}%
                    </span>
                  </div>
                  <ProgressBar value={d.score} />
                  <div className="flex justify-between text-xs">
                    <span className="text-[#94b4d1] font-mono">{d.article}</span>
                    <span className="text-[#94b4d1]">{d.passed}/{d.total} {t('reports.passLabel')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Findings breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm font-bold font-syne text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400" />
                {t('reports.findingsToRemediateTitle')}
                <InfoTooltip content={t('reports.findingsToRemediateTooltip')} size={12} />
              </h3>
              <div className="space-y-2">
                {scanData.findings.filter(f => f.status === 'fail').map(f => (
                  <div key={f.id} className="flex items-center gap-3 py-1.5 border-b border-navy-800/60 last:border-0">
                    <SeverityBadge severity={f.severity as Severity} />
                    <span className="text-xs text-[#CBD8E8] flex-1 truncate">{f.checkName}</span>
                    <span className="text-xs font-mono text-[#94b4d1]">{f.article}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-bold font-syne text-white mb-4 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                {t('reports.passingControlsTitle')}
                <InfoTooltip content={t('reports.passingControlsTooltip')} size={12} />
              </h3>
              <div className="space-y-2">
                {scanData.findings.filter(f => f.status === 'pass').map(f => (
                  <div key={f.id} className="flex items-center gap-3 py-1.5 border-b border-navy-800/60 last:border-0">
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                    <span className="text-xs text-[#CBD8E8] flex-1 truncate">{f.checkName}</span>
                    <span className="text-xs font-mono text-[#94b4d1]">{f.article}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <p className="text-xs text-emerald-300 font-medium">
                    {t('reports.passingControlsSummary', { passed: scanData.passed, total: scanData.totalChecks })}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* No scan data — show prompt to run scan */
        <Card>
          <div className="flex items-center gap-4 py-4">
            <div className="p-3 rounded-full bg-navy-800/60">
              <Radar size={24} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold font-syne text-white">Technical Scan</h3>
              <p className="text-xs text-[#94b4d1] mt-0.5">
                Run an AWS compliance scan to add technical findings to this report.
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/scan')}>
              <Radar size={14} />
              Run a Scan
            </Button>
          </div>
        </Card>
      )}

      {/* Report preview (only when scan data is available) */}
      {scanData && showPreview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <FileText size={15} className="text-cyan-400" />
            <h2 className="text-base font-bold font-syne text-white">{t('reports.reportPreviewTitle')}</h2>
            <span className="text-xs text-[#94b4d1] px-2 py-0.5 rounded-full bg-navy-800 border border-navy-700">{t('reports.pdfFormatBadge')}</span>
          </div>
          <div className="rounded-xl overflow-hidden shadow-2xl shadow-navy-950/50 ring-1 ring-navy-700">
            <ReportPreview scanData={scanData} />
          </div>
        </div>
      )}
    </div>
  )
}
