import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Radar,
  FileText,
  Settings,
  ChevronRight,
  Shield,
  Users,
  UsersRound,
  ClipboardCheck,
  ListTodo,
  Target,
  Archive,
  History,
} from 'lucide-react'
import Logo from './Logo'
import { Tooltip } from '../ui'

const navGroups = [
  {
    sectionKey: 'nav.sectionOverview',
    items: [
      { path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, tooltip: 'Your compliance dashboard — overall scores, gaps, and coverage' },
    ],
  },
  {
    sectionKey: 'nav.sectionAssess',
    items: [
      { path: '/scope', labelKey: 'nav.scope', icon: Target, tooltip: 'Define critical business processes and map controls for your Statement of Applicability' },
      { path: '/controls', labelKey: 'nav.controls', icon: Shield, tooltip: 'Manage all NIS2 controls — assign owners, track status, upload evidence' },
      { path: '/assessment', labelKey: 'nav.assessment', icon: ClipboardCheck, tooltip: 'Self-assessment questionnaire to evaluate your NIS2 maturity' },
      { path: '/scan', labelKey: 'nav.scan', icon: Radar, tooltip: 'Run automated cloud infrastructure scans (AWS & Azure) against NIS2 requirements' },
    ],
  },
  {
    sectionKey: 'nav.sectionRemediate',
    items: [
      { path: '/remediation', labelKey: 'nav.remediation', icon: ListTodo, tooltip: 'Action items to close compliance gaps from your assessment' },
      { path: '/people-tasks', labelKey: 'nav.peopleTasks', icon: Users, tooltip: 'Employee training campaigns and policy acknowledgments' },
    ],
  },
  {
    sectionKey: 'nav.sectionReport',
    items: [
      { path: '/reports', labelKey: 'nav.reports', icon: FileText, tooltip: 'Generate compliance audit reports' },
      { path: '/evidence', labelKey: 'nav.evidence', icon: Archive, tooltip: 'Organisation-wide evidence library for all compliance artifacts' },
      { path: '/activity', labelKey: 'nav.activity', icon: History, tooltip: 'Tamper-evident audit trail of all compliance actions' },
    ],
  },
]

const settingsItem = { path: '/settings', labelKey: 'nav.settings', icon: Settings, tooltip: 'Account and cloud provider settings' }
const teamItem = { path: '/team', labelKey: 'nav.team', icon: UsersRound, tooltip: 'Manage team members and roles' }

function NavItem({ path, labelKey, icon: Icon, tooltip }: { path: string; labelKey: string; icon: typeof LayoutDashboard; tooltip: string }) {
  const { t } = useTranslation()

  return (
    <Tooltip content={tooltip} side="right">
      <NavLink
        to={path}
        end={path === '/'}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[15px] font-medium transition-all duration-200 ${
            isActive
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-[#CBD8E8] hover:bg-navy-800 hover:text-white border border-transparent'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              size={18}
              className={isActive ? 'text-cyan-400' : 'text-[#94b4d1] group-hover:text-white'}
            />
            <span className="flex-1">{t(labelKey)}</span>
            {isActive && (
              <ChevronRight size={14} className="text-cyan-400" />
            )}
          </>
        )}
      </NavLink>
    </Tooltip>
  )
}

export default function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-navy-900 border-r border-navy-700/50 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-700/50">
        <Logo size="md" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navGroups.map(({ sectionKey, items }) => (
          <div key={sectionKey}>
            <div className="text-[10px] uppercase tracking-wider text-navy-500 font-semibold px-3 pt-4 pb-1">
              {t(sectionKey)}
            </div>
            {items.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </div>
        ))}

        {/* Settings & Team — separate from groups */}
        <div className="pt-2">
          <NavItem {...teamItem} />
          <NavItem {...settingsItem} />
        </div>
      </nav>

      {/* NIS2 Badge */}
      <div className="mx-3 mb-4 p-3 rounded-lg bg-navy-800/60 border border-navy-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-400 font-syne">NIS2 FRAMEWORK</span>
        </div>
        <p className="text-xs text-[#CBD8E8] leading-relaxed">
          EU Directive 2022/2555<br />
          Article 21 — Security measures
        </p>
      </div>

      {/* Version */}
      <div className="px-5 py-3 border-t border-navy-700/50">
        <p className="text-xs text-[#94b4d1]">v1.0.0 — Beta</p>
      </div>
    </aside>
  )
}
