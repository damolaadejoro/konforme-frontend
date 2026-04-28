import React, { type ReactNode } from 'react'

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-col min-h-full bg-background">{children}</div>
}

export function PageContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex-1 px-8 py-6 max-w-[1400px] w-full ${className}`}>{children}</div>
  )
}
