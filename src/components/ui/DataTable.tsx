import React, { type ReactNode } from 'react'

/* ── Sub-components ── */

export function Table({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className={`w-full ${className}`}>{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-muted/50 border-b border-border">{children}</thead>
  )
}

export function TableHeaderCell({
  children,
  className = '',
  align,
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground ${alignClass} ${className}`}
    >
      {children}
    </th>
  )
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TableRow({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr
      className={`border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  className = '',
  numeric,
  align,
}: {
  children: ReactNode
  className?: string
  numeric?: boolean
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass =
    align === 'right' || numeric ? 'text-right' : align === 'center' ? 'text-center' : ''
  return (
    <td
      className={`px-4 py-3 text-sm text-foreground ${numeric ? 'tabular-nums' : ''} ${alignClass} ${className}`}
    >
      {children}
    </td>
  )
}

/* ── Convenience wrapper ── */

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  emptyState?: ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  data,
  keyField,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHead>
        <tr>
          {columns.map((col) => (
            <TableHeaderCell key={col.key} align={col.align}>
              {col.header}
            </TableHeaderCell>
          ))}
        </tr>
      </TableHead>
      <TableBody>
        {data.length === 0 && emptyState ? (
          <tr>
            <td colSpan={columns.length}>{emptyState}</td>
          </tr>
        ) : (
          data.map((row) => (
            <TableRow
              key={String(row[keyField])}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.key} numeric={col.numeric} align={col.align}>
                  {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
