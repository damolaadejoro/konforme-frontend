import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { HelpCircle } from 'lucide-react'
import { Severity } from '../types'

// Tooltip
interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}

export function Tooltip({ content, children, side = 'top', delayDuration }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-[100] max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-[13px] text-slate-100 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

// InfoTooltip — small ? icon that shows a tooltip on hover
interface InfoTooltipProps {
  content: string
  size?: number
  className?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function InfoTooltip({ content, size = 14, className = '', side = 'top' }: InfoTooltipProps) {
  return (
    <Tooltip content={content} side={side}>
      <button type="button" className={`inline-flex items-center text-muted-foreground hover:text-foreground/70 transition-colors ${className}`}>
        <HelpCircle size={size} />
      </button>
    </Tooltip>
  )
}

export { TooltipPrimitive }

// Severity Badge
export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    critical: 'bg-red-50 text-red-700',
    high: 'bg-orange-50 text-orange-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-muted text-muted-foreground',
    pass: 'bg-emerald-50 text-emerald-700',
  }
  const label: Record<Severity, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    pass: 'Pass',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[severity]}`}
    >
      {label[severity]}
    </span>
  )
}

// Status Dot
export function StatusDot({ status }: { status: 'pass' | 'fail' | 'review' | 'scanning' | 'pending' }) {
  const colors = {
    pass: 'bg-emerald-500',
    fail: 'bg-red-500',
    review: 'bg-amber-500',
    scanning: 'bg-blue-500 animate-pulse',
    pending: 'bg-border',
  }

  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />
  )
}

// Card
interface CardProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', glow = false, onClick }: CardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-lg p-5 ${glow ? 'ring-1 ring-primary/20' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

// Stat Card
interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  accent?: string
  trend?: string
  trendUp?: boolean
  tooltip?: string
  onClick?: () => void
}

export function StatCard({ label, value, icon, accent, trend, tooltip, onClick }: StatCardProps) {
  // Only apply semantic color when value is non-zero
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  const effectiveAccent = (!num || num === 0) ? 'text-foreground' : (accent || 'text-foreground')

  return (
    <div
      className={`bg-card border border-border rounded-lg p-5 flex items-start justify-between ${onClick ? 'cursor-pointer hover:border-border/80 hover:shadow-sm transition-all' : ''}`}
      onClick={onClick}
    >
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
          {label}
          {tooltip && <InfoTooltip content={tooltip} size={12} />}
        </p>
        <p className={`text-2xl font-semibold ${effectiveAccent}`}>{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      {icon && (
        <div className="p-2.5 rounded-lg bg-muted">
          {icon}
        </div>
      )}
    </div>
  )
}

// Progress Bar
interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  height?: string
  animated?: boolean
}

export function ProgressBar({ value, max = 100, color, height = 'h-2', animated = false }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100)
  const barColor = color || (pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')

  return (
    <div className={`w-full ${height} bg-muted rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor} ${animated ? 'animate-pulse' : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Section header
interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-navy text-white hover:bg-navy/90',
    secondary: 'bg-card border border-border text-foreground/80 hover:bg-muted',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
    ghost: 'text-foreground/70 hover:bg-muted hover:text-foreground',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {loading && (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export function Input({ label, error, icon, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-card border border-border rounded-md px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground
            focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string; disabled?: boolean }[]
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-foreground/80 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm text-foreground
          focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 transition-all
          appearance-none ${className}`}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// Empty State
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-card border border-border rounded-lg py-16 px-6 text-center">
      <div className="text-muted-foreground/60 mx-auto mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
