import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import { ControlsProvider } from '../../context/ControlsContext'

export default function Layout() {
  return (
    <ControlsProvider>
      <div className="min-h-screen bg-navy-950">
        <Sidebar />
        <TopNav />
        <main className="ml-60 pt-14 min-h-screen">
          <div className="p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </ControlsProvider>
  )
}
