import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronRight, Search, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { LogoMark } from './Logo'

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/scan': 'Cloud Scans',
  '/scan/findings': 'Findings',
  '/assessment': 'Assessment',
  '/assessment/organizational': 'Organizational',
  '/assessment/human-factor': 'Human Factor',
  '/assessment/history': 'History',
  '/remediation': 'Remediation',
  '/people-tasks': 'Training',
  '/people-tasks/continuous': 'Continuous',
  '/people-tasks/my-tasks': 'My Tasks',
  '/people-tasks/history': 'History',
  '/reports': 'Reports',
  '/controls': 'Controls',
  '/scope': 'Jurisdiction',
  '/settings': 'Settings',
  '/team': 'Team',
  '/evidence': 'Evidence',
  '/activity': 'Activity',
}

function useBreadcrumbs() {
  const location = useLocation()
  const { accountName } = useAuth()
  const path = location.pathname

  const crumbs: { label: string; isCurrent: boolean }[] = [
    { label: accountName || 'Workspace', isCurrent: false },
  ]

  const label = ROUTE_LABELS[path]
  if (label) {
    crumbs.push({ label, isCurrent: true })
  } else {
    const parent = path.split('/').slice(0, -1).join('/') || '/'
    const parentLabel = ROUTE_LABELS[parent]
    if (parentLabel) {
      crumbs.push({ label: parentLabel, isCurrent: false })
      const childSegment = path.split('/').pop() || ''
      crumbs.push({ label: childSegment.replace(/-/g, ' '), isCurrent: true })
    } else {
      crumbs.push({ label: path.slice(1).replace(/-/g, ' ') || 'Dashboard', isCurrent: true })
    }
  }

  return crumbs
}

interface TopbarProps {
  onMenuToggle?: () => void
  isMobile?: boolean
}

export default function Topbar({ onMenuToggle, isMobile }: TopbarProps) {
  const { t } = useTranslation()
  const { accountName, email, role, logout } = useAuth()
  const navigate = useNavigate()
  const crumbs = useBreadcrumbs()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const initials = accountName ? accountName.slice(0, 2).toUpperCase() : 'NA'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 flex items-center px-6 gap-4 bg-card border-b border-border">
      {/* Mobile hamburger */}
      {isMobile && (
        <button onClick={onMenuToggle} className="mr-2 p-1">
          <div className="space-y-1">
            <div className="w-4 h-0.5 bg-foreground" />
            <div className="w-4 h-0.5 bg-foreground" />
            <div className="w-4 h-0.5 bg-foreground" />
          </div>
        </button>
      )}

      {isMobile && <LogoMark size="sm" />}

      {/* Breadcrumbs */}
      {!isMobile && (
        <div className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
              <span className={crumb.isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex-1 max-w-md ml-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-muted">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-xs text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {/* Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            <Bell size={16} className="text-muted-foreground" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50 py-3">
              <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
                <Bell size={20} className="text-muted-foreground" />
                <p className="text-sm text-foreground">{t('common.noNotifications')}</p>
                <p className="text-xs text-muted-foreground">{t('common.notificationHint')}</p>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-navy rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-white">{initials}</span>
            </div>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{accountName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              <button
                onClick={() => { setShowUserMenu(false); navigate('/settings') }}
                className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-muted transition-colors"
              >
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted transition-colors"
              >
                <LogOut size={14} />
                {t('common.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
