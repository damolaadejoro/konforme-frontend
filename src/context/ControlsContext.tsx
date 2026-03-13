import React, { createContext, useContext } from 'react'
import { useControls } from '../hooks/useControls'

type ControlsContextValue = ReturnType<typeof useControls>

const ControlsContext = createContext<ControlsContextValue | null>(null)

export function ControlsProvider({ children }: { children: React.ReactNode }) {
  const controls = useControls()
  return (
    <ControlsContext.Provider value={controls}>
      {children}
    </ControlsContext.Provider>
  )
}

export function useControlsContext(): ControlsContextValue {
  const ctx = useContext(ControlsContext)
  if (!ctx) {
    throw new Error('useControlsContext must be used within a ControlsProvider')
  }
  return ctx
}
