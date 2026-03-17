import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="text-2xl font-bold text-indigo-600 mb-6">Konforme</div>

        {status === 'loading' && (
          <p className="text-gray-600">{t('auth.verifyingEmail', 'Verifying your email...')}</p>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.emailVerified', 'Email verified!')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('auth.emailVerifiedDesc', 'Your email has been successfully verified. You can now use all features.')}
            </p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('common.goToDashboard', 'Dashboard')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {t('auth.verificationFailed', 'Verification failed')}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('auth.verificationFailedDesc', 'The verification link is invalid or has expired. Please request a new one.')}
            </p>
            <Link
              to="/"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('common.goToDashboard', 'Dashboard')}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
