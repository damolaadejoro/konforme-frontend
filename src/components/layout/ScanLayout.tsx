import React from 'react'
import { Outlet } from 'react-router-dom'
import { Radar, Search } from 'lucide-react'
import TabNav from '../TabNav'

const tabs = [
  { to: '/scan', labelKey: 'nav.scan', icon: Radar, end: true },
  { to: '/scan/findings', labelKey: 'nav.findings', icon: Search },
]

export default function ScanLayout() {
  return (
    <div>
      <TabNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
