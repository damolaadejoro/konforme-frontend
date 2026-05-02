import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Cloud,
  ClipboardCheck,
  ListTodo,
  Users,
  FileText,
  Library,
  Archive,
  Globe,
  Settings,
  UserCog,
} from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../../context/AuthContext'

const complianceItems = [
  { icon: LayoutDashboard, path: '/',             labelKey: 'nav.dashboard' },
  { icon: Cloud,           path: '/scan',         labelKey: 'nav.scan' },
  { icon: ClipboardCheck,  path: '/assessment',   labelKey: 'nav.assessment' },
  { icon: Library,         path: '/controls',     labelKey: 'nav.controls' },
  { icon: ListTodo,        path: '/remediation',  labelKey: 'nav.remediation', hasBadge: true },
  { icon: Users,           path: '/people-tasks', labelKey: 'nav.peopleTasks' },
  { icon: Archive,         path: '/evidence',     labelKey: 'nav.evidence' },
  { icon: FileText,        path: '/reports',      labelKey: 'nav.reports' },
  { icon: Globe,           path: '/scope',        labelKey: 'nav.scope' },
]

const systemItems = [
  { icon: Settings, path: '/settings', labelKey: 'nav.settings' },
  { icon: UserCog,  path: '/team',     labelKey: 'nav.team' },
]

interface NavItemProps {
  icon: React.ElementType
  path: string
  labelKey: string
  badge?: number
}

function NavItem({ icon: Icon, path, labelKey, badge }: NavItemProps) {
  const { t } = useTranslation()

  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-muted text-foreground font-medium'
            : 'text-foreground/70 hover:bg-muted hover:text-foreground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? 'text-foreground' : 'text-muted-foreground'} />
          <span className="flex-1">{t(labelKey)}</span>
          {badge != null && badge > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/5 text-primary text-xs font-medium">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

interface SidebarProps {
  milestone?: { date: string; label: string }
  remediationCount?: number
}

export default function Sidebar({ milestone, remediationCount }: SidebarProps) {
  const { accountName } = useAuth()

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-card border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-4 py-4">
        <Logo size="md" />
      </div>

      {/* Workspace */}
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
          <div className="w-6 h-6 bg-navy rounded-md flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{(accountName || 'K')[0].toUpperCase()}</span>
          </div>
          <span className="text-sm font-medium text-foreground truncate">{accountName || 'Workspace'}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-2 mt-4">
          Compliance
        </p>
        <div className="space-y-0.5">
          {complianceItems.map((item) => (
            <NavItem
              key={item.path}
              icon={item.icon}
              path={item.path}
              labelKey={item.labelKey}
              badge={item.hasBadge ? remediationCount : undefined}
            />
          ))}
        </div>

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-2 mt-6">
          System
        </p>
        <div className="space-y-0.5">
          {systemItems.map((item) => (
            <NavItem key={item.path} icon={item.icon} path={item.path} labelKey={item.labelKey} />
          ))}
        </div>
      </nav>

      {/* Bottom milestone */}
      {milestone && (
        <div className="px-3 py-3 border-t border-border">
          <div className="bg-muted rounded-md px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Next Milestone</p>
            <p className="text-sm font-medium text-foreground">{milestone.date}</p>
            {milestone.label && (
              <p className="text-xs text-green mt-0.5">{milestone.label}</p>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
