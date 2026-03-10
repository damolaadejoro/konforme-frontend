import React from 'react'
import { Outlet } from 'react-router-dom'
import { ClipboardCheck, Building2, Users } from 'lucide-react'
import TabNav from '../TabNav'

const tabs = [
  { to: '/assessment', labelKey: 'nav.assessment', icon: ClipboardCheck, end: true },
  { to: '/assessment/organizational', labelKey: 'nav.organizational', icon: Building2 },
  { to: '/assessment/human-factor', labelKey: 'nav.humanFactor', icon: Users },
]

export default function AssessmentLayout() {
  return (
    <div>
      <TabNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
