import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  register as apiRegister,
  login as apiLogin,
  logout as apiLogout,
  getMe,
  addAwsAccount as apiAddAwsAccount,
  removeAwsAccount as apiRemoveAwsAccount,
  getAccountInfo,
  getStoredAuth,
  clearAuth,
  isAuthenticated as checkAuth,
  type AwsAccountInfo,
} from '../services/api'

interface AuthState {
  accountId: string | null
  accountName: string | null
  email: string | null
  emailVerified: boolean
  userId: string | null
  role: string | null
  country: string | null
  language: string | null
  isAuthenticated: boolean
  loading: boolean
  awsAccounts: AwsAccountInfo[]
  selectedAwsAccountId: string | null
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, country?: string | null, language?: string | null) => Promise<void>
  logout: () => void
  addAwsAccount: (alias: string, accessKeyId: string, secretAccessKey: string, sessionToken: string | null, region: string) => Promise<AwsAccountInfo>
  removeAwsAccount: (awsAccountId: string) => Promise<void>
  selectAwsAccount: (awsAccountId: string) => void
  setAccountName: (name: string) => void
  setEmail: (email: string) => void
  setEmailVerified: (verified: boolean) => void
  setCountry: (country: string) => void
  setLanguage: (language: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = getStoredAuth()
    return {
      accountId: stored.accountId,
      accountName: stored.accountName,
      email: stored.email,
      emailVerified: false,
      userId: null,
      role: null,
      country: null,
      language: localStorage.getItem('konforme_language') || 'en',
      isAuthenticated: checkAuth(),
      loading: true,
      awsAccounts: stored.awsAccounts,
      selectedAwsAccountId: stored.selectedAwsAccountId,
    }
  })

  // Ref to avoid recreating login/register callbacks when accountId changes
  const accountIdRef = useRef(auth.accountId)
  useEffect(() => { accountIdRef.current = auth.accountId }, [auth.accountId])

  // On init, verify session by calling /auth/me (uses httpOnly cookie)
  useEffect(() => {
    getMe()
      .then(info => {
        localStorage.setItem('konforme_account_id', info.account_id)
        localStorage.setItem('konforme_account_name', info.account_name)
        localStorage.setItem('konforme_email', info.email)
        if (info.language) localStorage.setItem('konforme_language', info.language)
        setAuth(prev => ({
          ...prev,
          accountId: info.account_id,
          accountName: info.account_name,
          email: info.email,
          emailVerified: info.email_verified ?? false,
          userId: (info as any).user_id || prev.userId,
          role: (info as any).role || prev.role,
          country: info.country || prev.country,
          language: info.language || prev.language,
          isAuthenticated: true,
          loading: false,
        }))
        // Hydrate AWS accounts
        getAccountInfo()
          .then(acctInfo => {
            const awsAccounts: AwsAccountInfo[] = acctInfo.aws_accounts.map(a => ({
              id: a.id,
              alias: a.alias,
              awsAccountId: a.aws_account_id,
              awsRegion: a.aws_region,
              isActive: a.is_active,
              addedAt: a.added_at,
            }))
            localStorage.setItem('konforme_aws_accounts', JSON.stringify(awsAccounts))
            setAuth(prev => ({
              ...prev,
              awsAccounts,
              selectedAwsAccountId: prev.selectedAwsAccountId && awsAccounts.some(a => a.id === prev.selectedAwsAccountId)
                ? prev.selectedAwsAccountId
                : awsAccounts.length > 0 ? awsAccounts[0].id : null,
            }))
          })
          .catch(() => { /* ignore */ })
      })
      .catch(() => {
        // No valid session — clear local state
        clearAuth()
        setAuth({
          accountId: null, accountName: null, email: null, emailVerified: false,
          userId: null, role: null, country: null, language: 'en',
          isAuthenticated: false, loading: false, awsAccounts: [], selectedAwsAccountId: null,
        })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loginFn = useCallback(async (email: string, password: string) => {
    const previousAccountId = accountIdRef.current
    const data = await apiLogin(email, password)

    if (previousAccountId && previousAccountId !== data.account_id) {
      window.location.href = '/'
      return
    }

    setAuth({
      accountId: data.account_id,
      accountName: data.account_name,
      email: data.email,
      emailVerified: data.email_verified ?? false,
      userId: (data as any).user_id || null,
      role: (data as any).role || null,
      country: data.country,
      language: data.language || 'en',
      isAuthenticated: true,
      loading: false,
      awsAccounts: [],
      selectedAwsAccountId: null,
    })
    // Hydrate AWS accounts
    try {
      const info = await getAccountInfo()
      const awsAccounts: AwsAccountInfo[] = info.aws_accounts.map(a => ({
        id: a.id, alias: a.alias, awsAccountId: a.aws_account_id,
        awsRegion: a.aws_region, isActive: a.is_active, addedAt: a.added_at,
      }))
      localStorage.setItem('konforme_aws_accounts', JSON.stringify(awsAccounts))
      setAuth(prev => ({
        ...prev,
        awsAccounts,
        selectedAwsAccountId: awsAccounts.length > 0 ? awsAccounts[0].id : null,
      }))
    } catch { /* ignore */ }
  }, [])

  const registerFn = useCallback(async (name: string, email: string, password: string, country?: string | null, language?: string | null) => {
    const previousAccountId = accountIdRef.current
    const data = await apiRegister(name, email, password, country, language)

    if (previousAccountId && previousAccountId !== data.account_id) {
      window.location.href = '/get-started'
      return
    }

    setAuth({
      accountId: data.account_id,
      accountName: data.account_name,
      email: data.email,
      emailVerified: data.email_verified ?? false,
      userId: (data as any).user_id || null,
      role: (data as any).role || null,
      country: data.country,
      language: data.language || 'en',
      isAuthenticated: true,
      loading: false,
      awsAccounts: [],
      selectedAwsAccountId: null,
    })
  }, [])

  const logoutFn = useCallback(async () => {
    await apiLogout()
    window.location.href = '/login'
  }, [])

  const addAwsAccount = useCallback(async (alias: string, accessKeyId: string, secretAccessKey: string, sessionToken: string | null, region: string) => {
    const newAcc = await apiAddAwsAccount(alias, accessKeyId, secretAccessKey, sessionToken, region)
    setAuth(prev => ({
      ...prev,
      awsAccounts: [...prev.awsAccounts, newAcc],
      selectedAwsAccountId: prev.selectedAwsAccountId || newAcc.id,
    }))
    return newAcc
  }, [])

  const removeAwsAccount = useCallback(async (awsAccountId: string) => {
    await apiRemoveAwsAccount(awsAccountId)
    setAuth(prev => {
      const updated = prev.awsAccounts.filter(a => a.id !== awsAccountId)
      return {
        ...prev,
        awsAccounts: updated,
        selectedAwsAccountId: prev.selectedAwsAccountId === awsAccountId
          ? (updated.length > 0 ? updated[0].id : null)
          : prev.selectedAwsAccountId,
      }
    })
  }, [])

  const selectAwsAccount = useCallback((awsAccountId: string) => {
    localStorage.setItem('konforme_selected_aws_account_id', awsAccountId)
    setAuth(prev => ({ ...prev, selectedAwsAccountId: awsAccountId }))
  }, [])

  const setAccountNameFn = useCallback((name: string) => {
    setAuth(prev => ({ ...prev, accountName: name }))
  }, [])

  const setEmailFn = useCallback((email: string) => {
    setAuth(prev => ({ ...prev, email }))
  }, [])

  const setCountryFn = useCallback((country: string) => {
    localStorage.setItem('konforme_country', country)
    setAuth(prev => ({ ...prev, country }))
  }, [])

  const setLanguageFn = useCallback((language: string) => {
    localStorage.setItem('konforme_language', language)
    setAuth(prev => ({ ...prev, language }))
  }, [])

  const setEmailVerifiedFn = useCallback((verified: boolean) => {
    setAuth(prev => ({ ...prev, emailVerified: verified }))
  }, [])

  const contextValue = useMemo<AuthContextValue>(() => ({
    ...auth,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    addAwsAccount,
    removeAwsAccount,
    selectAwsAccount,
    setAccountName: setAccountNameFn,
    setEmail: setEmailFn,
    setEmailVerified: setEmailVerifiedFn,
    setCountry: setCountryFn,
    setLanguage: setLanguageFn,
  }), [auth, loginFn, registerFn, logoutFn, addAwsAccount, removeAwsAccount, selectAwsAccount, setAccountNameFn, setEmailFn, setEmailVerifiedFn, setCountryFn, setLanguageFn])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
