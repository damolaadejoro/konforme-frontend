import React, { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getInviteInfo, acceptInvite } from '../services/api'

export default function AcceptInvite() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading')
  const [info, setInfo] = useState<{ email: string; org_name: string }>({ email: '', org_name: '' })
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }
    getInviteInfo(token)
      .then(data => {
        setInfo(data)
        setStatus('form')
      })
      .catch(() => setStatus('error'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError(t('auth.validationPasswordsMismatch', 'Passwords do not match'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await acceptInvite(token, name, password)
      setStatus('success')
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8">
        <div className="text-2xl font-bold text-indigo-600 mb-6 text-center">Konforme</div>

        {status === 'loading' && (
          <p className="text-center text-gray-600">{t('common.loading')}</p>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-red-600 mb-4">{t('team.inviteExpired', 'This invitation link is invalid or has expired.')}</p>
            <Link to="/login" className="text-indigo-600 hover:underline">{t('auth.signInLink', 'Sign in')}</Link>
          </div>
        )}

        {status === 'form' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              {t('team.joinOrg', `Join ${info.org_name}`)}
            </h1>
            <p className="text-gray-600 text-sm text-center mb-6">
              {t('team.invitedAs', `You've been invited to join as ${info.email}`)}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.name', 'Name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t('auth.namePlaceholder', 'Your name')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.password', 'Password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t('auth.passwordCreatePlaceholder', 'At least 8 characters')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.confirmPassword', 'Confirm Password')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t('auth.confirmPasswordPlaceholder', 'Repeat your password')}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? t('common.loading') : t('team.acceptInvite', 'Accept & Join')}
              </button>
            </form>
          </>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{t('team.welcomeToTeam', 'Welcome to the team!')}</h1>
            <p className="text-gray-600 mb-6">{t('team.canNowLogin', 'You can now sign in with your email and password.')}</p>
            <Link
              to="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('auth.signInButton', 'Sign In')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
