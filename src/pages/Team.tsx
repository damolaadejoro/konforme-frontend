import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import {
  getTeamMembers,
  inviteTeamMembers,
  updateMemberRole,
  removeMember,
  type TeamMember,
} from '../services/api'

export default function Team() {
  const { t } = useTranslation()
  const { accountId, role } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')

  const isOwnerOrAdmin = role === 'owner' || role === 'admin'

  useEffect(() => {
    if (!isOwnerOrAdmin) return
    loadMembers()
  }, [accountId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMembers() {
    try {
      const data = await getTeamMembers()
      setMembers(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    const emails = inviteEmails
      .split(/[\n,]/)
      .map(e => e.trim())
      .filter(Boolean)

    if (emails.length === 0) return

    setInviting(true)
    setError('')
    try {
      await inviteTeamMembers(emails, inviteRole)
      setShowInvite(false)
      setInviteEmails('')
      await loadMembers()
    } catch (e: any) {
      setError(e.message || 'Failed to send invitations')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      await updateMemberRole(userId, newRole)
      await loadMembers()
    } catch {
      // ignore
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(t('team.removeConfirm', `Remove ${name} from the team?`))) return
    try {
      await removeMember(userId)
      await loadMembers()
    } catch {
      // ignore
    }
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <p className="text-lg">{t('team.noAccess', 'You don\'t have permission to manage the team.')}</p>
      </div>
    )
  }

  const roleBadgeColor: Record<string, string> = {
    owner: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    member: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('team.pageTitle', 'Team')}</h1>
          <p className="text-zinc-400 text-sm mt-1">{t('team.pageSubtitle', 'Manage team members and roles')}</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {t('team.inviteButton', 'Invite Members')}
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">{t('team.inviteTitle', 'Invite Team Members')}</h2>

            <label className="block text-sm text-zinc-400 mb-1">{t('team.emailsLabel', 'Email addresses (one per line or comma-separated)')}</label>
            <textarea
              value={inviteEmails}
              onChange={e => setInviteEmails(e.target.value)}
              placeholder="alice@company.com&#10;bob@company.com"
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 mb-4"
            />

            <label className="block text-sm text-zinc-400 mb-1">{t('team.roleLabel', 'Role')}</label>
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white mb-4"
            >
              <option value="member">{t('team.roleMember', 'Member')}</option>
              <option value="admin">{t('team.roleAdmin', 'Admin')}</option>
            </select>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowInvite(false); setError('') }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmails.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {inviting ? t('common.loading') : t('team.sendInvites', 'Send Invites')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      {loading ? (
        <p className="text-zinc-400">{t('common.loading')}</p>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <p>{t('team.noMembers', 'No team members yet. Invite your first member.')}</p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase">
                <th className="px-4 py-3">{t('team.nameHeader', 'Name')}</th>
                <th className="px-4 py-3">{t('team.emailHeader', 'Email')}</th>
                <th className="px-4 py-3">{t('team.roleHeader', 'Role')}</th>
                <th className="px-4 py-3">{t('team.statusHeader', 'Status')}</th>
                {role === 'owner' && <th className="px-4 py-3">{t('team.actionsHeader', 'Actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-sm text-white">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadgeColor[m.role] || roleBadgeColor.member}`}>
                      {t(`team.role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}`, m.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {!m.inviteAccepted ? (
                      <span className="text-amber-400">{t('team.pending', 'Pending')}</span>
                    ) : m.emailVerified ? (
                      <span className="text-green-400">{t('team.active', 'Active')}</span>
                    ) : (
                      <span className="text-zinc-400">{t('team.unverified', 'Unverified')}</span>
                    )}
                  </td>
                  {role === 'owner' && (
                    <td className="px-4 py-3 text-sm">
                      {m.role !== 'owner' && (
                        <div className="flex gap-2">
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="admin">{t('team.roleAdmin', 'Admin')}</option>
                            <option value="member">{t('team.roleMember', 'Member')}</option>
                          </select>
                          <button
                            onClick={() => handleRemove(m.id, m.name)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
