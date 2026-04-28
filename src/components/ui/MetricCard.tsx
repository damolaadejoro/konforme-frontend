import React, { type ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: number | string
  unit?: string
  semantic?: 'success' | 'warning' | 'danger' | 'info'
  trend?: { direction: 'up' | 'down'; value: string }
  helperText?: string
  icon?: ReactNode
}

function valueColorClass(value: number | string, semantic?: string): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (!num || num === 0) return 'text-foreground'
  switch (semantic) {
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'danger':
      return 'text-destructive'
    case 'info':
      return 'text-cyan'
    default:
      return 'text-foreground'
  }
}

export function MetricCard({
  label,
  value,
  unit,
  semantic,
  trend,
  helperText,
  icon,
}: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-3xl font-semibold tabular-nums ${valueColorClass(value, semantic)}`}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        {trend && (
          <span
            className={`ml-auto text-xs font-medium flex items-center gap-0.5 ${
              trend.direction === 'up' ? 'text-success' : 'text-destructive'
            }`}
          >
            {trend.direction === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {trend.value}
          </span>
        )}
      </div>
      {helperText && <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  )
}
