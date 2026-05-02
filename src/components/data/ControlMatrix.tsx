import React from 'react'
import { useNavigate } from 'react-router-dom'

type ControlMatrixRow = {
  code: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
  label: string
  score: number
  pass: number
  total: number
  flagged?: boolean
}

type ControlMatrixProps = {
  rows: ControlMatrixRow[]
  caption?: string
}

function statusColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500'
  if (score >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function statusBadge(score: number): { bg: string; text: string; label: string } {
  if (score >= 85) return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Healthy' }
  if (score >= 70) return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'At risk' }
  return { bg: 'bg-red-50', text: 'text-red-700', label: 'Critical' }
}

export default function ControlMatrix({ rows, caption }: ControlMatrixProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-left px-4 py-3 w-[3em]">#</th>
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-left px-4 py-3">Area</th>
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right px-4 py-3 w-[5em]">Pass</th>
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-left px-4 py-3 w-[180px]">Progress</th>
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right px-4 py-3 w-[5em]">Score</th>
            <th className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-right px-4 py-3 w-[6em]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => {
            const badge = statusBadge(row.score)
            return (
              <tr
                key={row.code}
                className="hover:bg-muted transition-colors cursor-pointer"
                onClick={() => navigate(`/controls?code=${row.code}`)}
              >
                <td className="px-4 py-3 text-sm text-muted-foreground font-medium">
                  ({row.code})
                </td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {row.label}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground text-right font-mono">
                  {row.pass}/{row.total}
                </td>
                <td className="px-4 py-3">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColor(row.score)}`}
                      style={{ width: `${Math.min(row.score, 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">
                  {row.score}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {caption && (
        <div className="px-4 py-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      )}
    </div>
  )
}
