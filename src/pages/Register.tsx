import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UserPlus, Eye, EyeOff, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Input } from '../components/ui'
import Logo from '../components/layout/Logo'
import CountrySelector from '../components/CountrySelector'
import { getEUCountries } from '../services/api'
import type { EUCountryInfo } from '../types/country'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'pt', label: 'Português', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', label: 'Français', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', label: 'Español', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'it', label: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', label: 'Nederlands', flag: '\u{1F1F3}\u{1F1F1}' },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export default function Register() {
  const { t, i18n } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [language, setLanguage] = useState(i18n.language || 'en')
  const [country, setCountry] = useState<string | null>(null)
  const [countries, setCountries] = useState<EUCountryInfo[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getEUCountries().then(setCountries).catch(() => {})
  }, [])

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Name is required'
        if (value.trim().length < 2) return 'Name must be at least 2 characters'
        return undefined
      case 'email':
        if (!value.trim()) return 'Email is required'
        if (!EMAIL_REGEX.test(value)) return 'Please enter a valid email address'
        return undefined
      case 'password':
        if (!value) return 'Password is required'
        if (value.length < 8) return 'Password must be at least 8 characters'
        if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter'
        if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter'
        if (!/[0-9]/.test(value)) return 'Password must include a number'
        return undefined
      case 'confirmPassword':
        if (!value) return 'Please confirm your password'
        if (value !== password) return 'Passwords do not match'
        return undefined
      default:
        return undefined
    }
  }

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
  }

  const handleChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value)
    setServerError(null)
    if (touched[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }))
    }
    if (field === 'password' && touched.confirmPassword && confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: value !== confirmPassword ? 'Passwords do not match' : undefined,
      }))
    }
  }

  const validate = (): boolean => {
    const errors: FieldErrors = {
      name: validateField('name', name),
      email: validateField('email', email),
      password: validateField('password', password),
      confirmPassword: validateField('confirmPassword', confirmPassword),
    }
    setFieldErrors(errors)
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    return !errors.name && !errors.email && !errors.password && !errors.confirmPassword
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validate()) return

    setLoading(true)
    try {
      await register(name, email, password, country, language)
      navigate('/verify-pending')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    if (!password) return null
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
    if (score === 3) return { label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' }
    if (score === 4) return { label: 'Good', color: 'bg-cyan-500', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
  })()

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" showText={false} inverted />
          </div>
          <h1 className="text-2xl font-bold font-syne text-white">{t('auth.createAccount')}</h1>
          <p className="text-sm text-navy-400 mt-1">{t('auth.createAccountSubtitle')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label={t('auth.name')}
              placeholder={t('auth.namePlaceholder')}
              value={name}
              onChange={e => handleChange('name', e.target.value, setName)}
              onBlur={() => handleBlur('name', name)}
              error={touched.name ? fieldErrors.name : undefined}
            />

            {countries.length > 0 && (
              <CountrySelector
                countries={countries}
                value={country}
                onChange={setCountry}
                label={t('auth.country')}
                placeholder={t('auth.countryPlaceholder')}
              />
            )}

            <div>
              <label className="block text-sm font-medium text-[#94b4d1] mb-1.5">
                <Globe size={14} className="inline mr-1.5 -mt-0.5" />
                {t('auth.language', 'Language')}
              </label>
              <select
                value={language}
                onChange={e => {
                  const code = e.target.value
                  setLanguage(code)
                  i18n.changeLanguage(code)
                }}
                className="w-full px-3 py-2 rounded-lg bg-navy-900/60 border border-navy-700 text-sm text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => handleChange('email', e.target.value, setEmail)}
              onBlur={() => handleBlur('email', email)}
              error={touched.email ? fieldErrors.email : undefined}
            />
            <div>
              <div className="relative">
                <Input
                  label={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordCreatePlaceholder')}
                  value={password}
                  onChange={e => handleChange('password', e.target.value, setPassword)}
                  onBlur={() => handleBlur('password', password)}
                  error={touched.password ? fieldErrors.password : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-navy-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && !fieldErrors.password && passwordStrength && (
                <div className="mt-2 space-y-1">
                  <div className="h-1 rounded-full bg-navy-800 overflow-hidden">
                    <div className={`h-full rounded-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`} />
                  </div>
                  <p className={`text-[10px] ${
                    passwordStrength.label === 'Weak' ? 'text-red-400' :
                    passwordStrength.label === 'Fair' ? 'text-yellow-400' :
                    passwordStrength.label === 'Good' ? 'text-cyan-400' : 'text-emerald-400'
                  }`}>
                    {passwordStrength.label} password
                  </p>
                </div>
              )}
            </div>
            <div className="relative">
              <Input
                label={t('auth.confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                value={confirmPassword}
                onChange={e => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
                onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-8 text-navy-400 hover:text-white transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {serverError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{serverError}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              <UserPlus size={16} />
              {t('auth.createAccountButton')}
            </Button>
          </form>

          <p className="text-center text-sm text-navy-400 mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
              {t('auth.signInLink')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
