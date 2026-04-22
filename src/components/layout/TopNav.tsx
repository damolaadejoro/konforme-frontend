import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronDown, RefreshCw, Save, Check, LogOut } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pt, de, fr, es, it, nl, type Locale } from 'date-fns/locale'
import { useControlsContext } from '../../context/ControlsContext'
import { useAuth } from '../../context/AuthContext'
import { useScore } from '../../context/ScoreContext'
import { getStoredAuth, getCloudCredentials, isConnected, type CloudCredential } from '../../services/api'
import LanguageSwitcher from '../LanguageSwitcher'

function countryFlag(code: string): string {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
}

export default function TopNav() {
  const { t, i18n } = useTranslation()
  const { lastSaved } = useControlsContext()
  const { isAuthenticated, accountName, email, country, awsAccounts, selectedAwsAccountId, selectAwsAccount, logout } = useAuth()
  const { overallScore: score } = useScore()
  const navigate = useNavigate()
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [azureCredentials, setAzureCredentials] = useState<CloudCredential[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const dateFnsLocales: Record<string, Locale> = { pt, de, fr, es, it, nl }
  const currentLocale = dateFnsLocales[i18n.language] || undefined
  const lastSavedText = lastSaved
    ? formatDistanceToNow(new Date(lastSaved), { addSuffix: true, locale: currentLocale })
    : t('common.neverSaved')

  // Fetch Azure credentials for account switcher
  useEffect(() => {
    if (isConnected()) {
      const { accountId } = getStoredAuth()
      if (accountId) {
        getCloudCredentials(accountId)
          .then(data => setAzureCredentials(data.credentials.filter(c => c.provider === 'azure')))
          .catch(() => {})
      }
    }
  }, [selectedAwsAccountId])

  const selectedAccount = awsAccounts.find(a => a.id === selectedAwsAccountId)
  const displayName = isAuthenticated ? accountName : 'No Account'
  const displayId = selectedAccount?.awsAccountId ?? '—'
  const initials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : 'NA'

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 fixed top-0 right-0 left-60 z-30 flex items-center justify-between px-6 bg-navy-950/90 backdrop-blur-sm border-b border-navy-700/50">
      {/* Left — breadcrumb/context */}
      <div className="flex items-center gap-2 text-sm text-navy-300">
        <Save size={14} className="text-emerald-400" />
        <span>{t('common.saved')}:</span>
        <span className="text-emerald-400 font-medium">{lastSavedText}</span>
        <span className="mx-2 text-navy-600">|</span>
        <span className="text-cyan-400 font-medium">{displayName}</span>
        {country && (
          <>
            <span className="text-navy-600">·</span>
            <span className="text-xs">{countryFlag(country)}</span>
          </>
        )}
        {selectedAccount && (
          <>
            <span className="text-navy-600">·</span>
            <span className="text-xs text-navy-400">{selectedAccount.alias}</span>
          </>
        )}
        <span className="text-xs text-navy-500 font-mono">({displayId})</span>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-3">
        {/* Cloud Account switcher */}
        {isAuthenticated && (awsAccounts.length > 1 || azureCredentials.length > 0) && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-900/60 border border-navy-700 hover:border-cyan-500/40 transition-all text-xs"
            >
              <span className="text-navy-300">{selectedAccount?.alias || 'Cloud Accounts'}</span>
              <ChevronDown size={12} className="text-navy-400" />
            </button>
            {showAccountDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-navy-900 border border-navy-700 rounded-lg shadow-xl z-50 py-1">
                {awsAccounts.length > 0 && (
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-navy-500 font-semibold">AWS</div>
                )}
                {awsAccounts.map(acc => (
                  <button
                    key={acc.id}
                    onClick={() => { selectAwsAccount(acc.id); setShowAccountDropdown(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-navy-800 transition-colors text-left"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-orange-500/10 border border-orange-500/20 flex-shrink-0">
                      <span className="text-[8px] font-bold text-orange-400">A</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{acc.alias}</p>
                      <p className="text-[10px] text-navy-400 font-mono">{acc.awsAccountId} · {acc.awsRegion}</p>
                    </div>
                    {acc.id === selectedAwsAccountId && (
                      <Check size={12} className="text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {azureCredentials.length > 0 && (
                  <>
                    {awsAccounts.length > 0 && <div className="border-t border-navy-800 my-1" />}
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-navy-500 font-semibold">Azure</div>
                  </>
                )}
                {azureCredentials.map(cred => (
                  <div
                    key={cred.id}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                      <span className="text-[8px] font-bold text-blue-400">Az</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{cred.alias}</p>
                      <p className="text-[10px] text-navy-400 font-mono">{cred.azure_subscription_id || 'Azure'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Score pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          score >= 75
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : score >= 50
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : 'bg-red-500/10 border border-red-500/20'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          <span className={`text-xs font-semibold ${
            score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {t('common.score')}: {score}%
          </span>
        </div>

        {/* Language switcher */}
        <LanguageSwitcher compact />

        {/* Refresh */}
        <button className="p-2 rounded-lg text-navy-300 hover:text-white hover:bg-navy-800 transition-all">
          <RefreshCw size={16} />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-navy-300 hover:text-white hover:bg-navy-800 transition-all"
          >
            <Bell size={16} />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-navy-900 border border-navy-700 rounded-lg shadow-xl z-50 py-4">
              <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
                <Bell size={24} className="text-navy-500" />
                <p className="text-sm font-medium text-white">{t('common.noNotifications')}</p>
                <p className="text-xs text-navy-400">{t('common.notificationHint')}</p>
              </div>
              <div className="border-t border-navy-800 mt-2 pt-2 px-3">
                <button
                  onClick={() => { setShowNotifications(false); navigate('/settings') }}
                  className="w-full text-left text-xs text-cyan-400 hover:text-cyan-300 px-2 py-1.5 rounded hover:bg-navy-800 transition-colors"
                >
                  {t('common.notificationSettings')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-navy-800 transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <span className="text-xs font-bold text-navy-900">{initials}</span>
            </div>
            <span className="text-sm text-white font-medium">{displayName || 'Account'}</span>
            <ChevronDown size={14} className="text-navy-400" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-navy-900 border border-navy-700 rounded-lg shadow-xl z-50 py-1">
              <div className="px-3 py-2 border-b border-navy-800">
                <p className="text-xs font-medium text-white truncate">{displayName}</p>
                <p className="text-[10px] text-navy-400 truncate">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-navy-800 transition-colors text-left text-red-400 text-xs"
              >
                <LogOut size={12} />
                {t('common.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
