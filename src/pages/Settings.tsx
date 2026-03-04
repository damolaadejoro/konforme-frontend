import React, { useState } from 'react'
import { Bell, Shield, User } from 'lucide-react'
import { Card, Button, Input, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { updateAccount } from '../services/api'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
        enabled ? 'bg-cyan-500' : 'bg-navy-700'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

export default function Settings() {
  const { accountName, email, setAccountName, setEmail } = useAuth()

  const [name, setName] = useState(accountName || '')
  const [contactEmail, setContactEmail] = useState(email || '')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const data = await updateAccount({ name, email: contactEmail })
      setAccountName(data.account_name)
      setEmail(data.email)
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    critical: true,
    weekly: true,
    threshold: true,
  })

  const toggleNotification = (key: string) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const notificationItems = [
    { key: 'critical', label: 'Critical findings alert', desc: 'Notify immediately when critical findings are detected' },
    { key: 'weekly', label: 'Weekly compliance digest', desc: 'Weekly summary of compliance status' },
    { key: 'threshold', label: 'Score below threshold', desc: 'Alert when score drops below 50%' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-syne text-white">Settings</h1>
        <p className="text-sm text-navy-300 mt-1">Configure your Konforme workspace</p>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <User size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">Account</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Organisation Name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Contact Email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
        </div>
        {saveMessage && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${saveMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {saveMessage.text}
          </div>
        )}
        <div className="mt-4">
          <Button size="sm" onClick={handleSave} loading={saving}>Save Changes</Button>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Bell size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {notificationItems.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-navy-900/40 border border-navy-800">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-navy-400 mt-0.5">{item.desc}</p>
              </div>
              <Toggle
                enabled={notifications[item.key]}
                onToggle={() => toggleNotification(item.key)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Compliance */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Shield size={16} className="text-cyan-400" />
          <h2 className="text-base font-bold font-syne text-white">Compliance Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Primary Framework"
            options={[
              { value: 'nis2', label: 'NIS2 (EU 2022/2555)' },
              { value: 'iso27001', label: 'ISO 27001' },
              { value: 'soc2', label: 'SOC 2 Type II' },
            ]}
          />
          <Select
            label="Scan Schedule"
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'manual', label: 'Manual only' },
            ]}
          />
        </div>
      </Card>

      {/* Version */}
      <div className="text-center text-xs text-navy-600 py-4">
        Konforme v1.0.0 · Built for NIS2 compliance · © 2024 Konforme
      </div>
    </div>
  )
}
