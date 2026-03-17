import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import VerificationBanner from '../VerificationBanner'
import { ControlsProvider } from '../../context/ControlsContext'
import { ScoreProvider } from '../../context/ScoreContext'

export default function Layout() {
  return (
    <ControlsProvider>
      <ScoreProvider>
        <div className="min-h-screen bg-navy-950">
          <Sidebar />
          <TopNav />
          <main className="ml-60 pt-14 min-h-screen">
            <VerificationBanner />
            <div className="p-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </ScoreProvider>
    </ControlsProvider>
  )
}
