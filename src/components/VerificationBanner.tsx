import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { resendVerification } from '../services/api'

export default function VerificationBanner() {
  const { t } = useTranslation()
  const { emailVerified, isAuthenticated } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const emailEnabled = import.meta.env.VITE_EMAIL_ENABLED === 'true'

  if (!isAuthenticated || emailVerified || !emailEnabled) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await resendVerification()
      setSent(true)
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center justify-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span>{t('auth.verifyEmailBanner', 'Please verify your email. Check your inbox or')}</span>
      {sent ? (
        <span className="font-medium text-amber-900">{t('auth.verificationSent', 'Sent!')}</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="font-medium underline hover:text-amber-900 disabled:opacity-50"
        >
          {sending ? t('common.loading') : t('auth.resendVerification', 'resend')}
        </button>
      )}
    </div>
  )
}
