import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getMe, resendVerification, updateEmail } from '../services/api'
import { Card, Button, Input } from '../components/ui'
import Logo from '../components/layout/Logo'

const POLL_INTERVAL = 4000
const RESEND_COOLDOWN = 60

export default function VerifyPending() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { email, setEmail, setEmailVerified, emailVerified } = useAuth()

  const [cooldown, setCooldown] = useState(0)
  const [showEmailEdit, setShowEmailEdit] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [resending, setResending] = useState(false)
  const [verified, setVerified] = useState(false)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // If already verified, redirect immediately
  useEffect(() => {
    if (emailVerified) {
      navigate('/get-started', { replace: true })
    }
  }, [emailVerified, navigate])

  // Poll /auth/me every 4 seconds to detect verification
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const me = await getMe()
        if (me.email_verified) {
          setVerified(true)
          setEmailVerified(true)
          // Brief pause to show success state
          setTimeout(() => {
            navigate('/get-started', { replace: true })
          }, 1500)
        }
      } catch {
        // ignore polling errors
      }
    }, POLL_INTERVAL)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [navigate, setEmailVerified])

  // Cooldown timer
  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const handleResend = async () => {
    setResending(true)
    try {
      await resendVerification()
      startCooldown()
    } catch {
      // ignore
    } finally {
      setResending(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError(null)

    const trimmed = newEmail.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setUpdatingEmail(true)
    try {
      await updateEmail(trimmed)
      setEmail(trimmed)
      setNewEmail('')
      setShowEmailEdit(false)
      startCooldown()
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setUpdatingEmail(false)
    }
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center mb-6">
            <Logo size="lg" showText={false} />
          </div>
          <Card>
            <div className="p-2 text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold font-syne text-white mb-2">
                {t('auth.verifyPendingVerified')}
              </h1>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
        </div>

        <Card>
          <div className="p-2 text-center">
            {/* Animated mail icon */}
            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse-subtle">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>

            <h1 className="text-2xl font-bold font-syne text-white mb-2">
              {t('auth.verifyPendingTitle')}
            </h1>

            <p className="text-sm text-navy-400 mb-4">
              {t('auth.verifyPendingSent')}
            </p>

            {/* Email pill */}
            <div className="bg-navy-800/50 rounded-lg px-4 py-2 inline-block mb-6">
              <span className="text-white font-medium text-sm">{email}</span>
            </div>

            {/* Resend button */}
            <div className="mb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                loading={resending}
              >
                {cooldown > 0
                  ? t('auth.verifyPendingResendIn', { seconds: cooldown })
                  : t('auth.verifyPendingResend')
                }
              </Button>
            </div>

            {/* Wrong email link */}
            {!showEmailEdit ? (
              <button
                onClick={() => { setShowEmailEdit(true); setNewEmail(email || '') }}
                className="text-cyan-400 hover:text-cyan-300 text-xs underline transition-colors"
              >
                {t('auth.verifyPendingWrongEmail')}
              </button>
            ) : (
              <form onSubmit={handleUpdateEmail} className="mt-4 space-y-3 text-left">
                <Input
                  label=""
                  type="email"
                  placeholder="new@company.com"
                  value={newEmail}
                  onChange={e => { setNewEmail(e.target.value); setEmailError(null) }}
                  error={emailError || undefined}
                />
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1"
                    loading={updatingEmail}
                  >
                    {t('auth.verifyPendingUpdateEmail')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setShowEmailEdit(false); setEmailError(null) }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            )}

            {/* Spam hint */}
            <p className="text-navy-500 text-xs mt-6">
              {t('auth.verifyPendingSpamHint')}
            </p>
          </div>
        </Card>
      </div>

      {/* Subtle pulse animation */}
      <style>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2.5s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
      `}</style>
    </div>
  )
}
