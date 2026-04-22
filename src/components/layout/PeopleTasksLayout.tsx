import React from 'react'
import { Outlet } from 'react-router-dom'
import { Users, Shield, UserCheck, Clock } from 'lucide-react'
import TabNav from '../TabNav'

const tabs = [
  { to: '/people-tasks', labelKey: 'peopleTasks.tabs.campaigns', icon: Users, end: true },
  { to: '/people-tasks/continuous', labelKey: 'peopleTasks.tabs.continuous', icon: Shield },
  { to: '/people-tasks/my-tasks', labelKey: 'peopleTasks.tabs.myTasks', icon: UserCheck },
  { to: '/people-tasks/history', labelKey: 'peopleTasks.tabs.history', icon: Clock },
]

export default function PeopleTasksLayout() {
  return (
    <div>
      <TabNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
