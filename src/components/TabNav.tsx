import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'

interface Tab {
  to: string
  labelKey: string
  icon?: LucideIcon
  end?: boolean
}

interface TabNavProps {
  tabs: Tab[]
}

export default function TabNav({ tabs }: TabNavProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-1 border-b border-navy-700/50 mb-6">
      {tabs.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px ${
              isActive
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-navy-300 hover:text-white hover:border-navy-500'
            }`
          }
        >
          {Icon && <Icon size={15} />}
          {t(labelKey)}
        </NavLink>
      ))}
    </div>
  )
}
