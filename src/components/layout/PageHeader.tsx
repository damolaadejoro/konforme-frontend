import React, { type ReactNode } from 'react'

/* PageHeader — Standard SaaS page header
   h1 title + optional subtitle + action buttons */

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Legacy compat — ignored in new design */
  meta?: any
  eyebrow?: string
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

/** Primary action button */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-navy/90 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  )
}

/** Secondary action button */
export function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 rounded-md text-sm font-medium text-foreground/80 hover:bg-muted transition-colors"
    >
      {children}
    </button>
  )
}

/** Legacy compat export */
export function HeaderAction({
  children,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}) {
  if (variant === 'secondary') {
    return <SecondaryButton onClick={onClick}>{children}</SecondaryButton>
  }
  return <PrimaryButton onClick={onClick}>{children}</PrimaryButton>
}
