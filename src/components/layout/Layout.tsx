import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import VerificationBanner from '../VerificationBanner'
import { ControlsProvider } from '../../context/ControlsContext'
import { ScoreProvider } from '../../context/ScoreContext'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export default function Layout() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <ControlsProvider>
      <ScoreProvider>
        <div className="flex min-h-screen bg-slate-50">
          {/* Desktop sidebar */}
          {!isMobile && <Sidebar />}

          {/* Mobile sidebar */}
          {isMobile && (
            <Dialog.Root open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/20 z-40" />
                <Dialog.Content className="fixed left-0 top-0 bottom-0 z-50 w-60 outline-none">
                  <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                  <Sidebar />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}

          <div className={`flex-1 min-w-0 flex flex-col ${!isMobile ? 'ml-60' : ''}`}>
            <Topbar
              isMobile={isMobile}
              onMenuToggle={() => setSidebarOpen(true)}
            />
            <main className="flex-1 flex flex-col min-h-0">
              <VerificationBanner />
              <div className="flex-1 flex flex-col animate-fade-in">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </ScoreProvider>
    </ControlsProvider>
  )
}
