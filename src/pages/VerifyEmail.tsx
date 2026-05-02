import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { Card, Button } from '../components/ui'
import Logo from '../components/layout/Logo'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

export default function VerifyEmail() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const { setEmailVerified } = useAuth()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) {
          setStatus('success')
          setEmailVerified(true)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [token, setEmailVerified])

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" showText={false} inverted />
          </div>
        </div>

        <Card>
          <div className="p-2 text-center">
            {status === 'loading' && (
              <div>
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-navy-400 text-sm">{t('auth.verifyingEmail')}</p>
              </div>
            )}

            {status === 'success' && (
              <>
                <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold font-syne text-white mb-2">
                  {t('auth.emailVerified')}
                </h1>
                <p className="text-navy-400 text-sm mb-6">
                  {t('auth.verifySuccessClose')}
                </p>
                <Link to="/get-started">
                  <Button variant="secondary" size="sm">
                    {t('auth.continueSetup')}
                  </Button>
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-xl font-semibold font-syne text-white mb-2">
                  {t('auth.verificationFailed')}
                </h1>
                <p className="text-navy-400 text-sm mb-6">
                  {t('auth.verificationFailedDesc')}
                </p>
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    {t('auth.backToSignIn')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
