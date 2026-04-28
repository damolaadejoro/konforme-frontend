import React, { type ReactNode, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconRight?: ReactNode
  loading?: boolean
}

const base =
  'rounded-md font-medium inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-card border border-border text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

const iconSizes = { sm: 14, md: 16, lg: 18 }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconRight,
      loading,
      children,
      className = '',
      disabled,
      ...props
    },
    ref,
  ) => {
    const iconSize = iconSizes[size]

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : icon ? (
          <span className="shrink-0" style={{ width: iconSize, height: iconSize }}>
            {icon}
          </span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0" style={{ width: iconSize, height: iconSize }}>
            {iconRight}
          </span>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
