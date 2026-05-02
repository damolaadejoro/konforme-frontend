import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getTeamMembers,
  inviteTeamMembers,
  updateMemberRole,
  removeMember,
  type TeamMember,
} from '../services/api'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from '../components/ui/DataTable'

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
      <PageContainer>
        <PageHeader title={t('team.pageTitle', 'Team')} description={t('team.pageSubtitle', 'Manage team members and roles')} />
        <PageContent>
          <EmptyState
            icon={<Users />}
            title={t('team.noAccess', "You don't have permission to manage the team.")}
          />
        </PageContent>
      </PageContainer>
    )
  }

  const roleBadgeVariant: Record<string, 'info' | 'default' | 'muted'> = {
    owner: 'info',
    admin: 'default',
    member: 'muted',
  }

  const statusBadge = (m: TeamMember) => {
    if (!m.inviteAccepted) {
      return <Badge variant="warning">{t('team.pending', 'Pending')}</Badge>
    }
    if (m.emailVerified) {
      return <Badge variant="success">{t('team.active', 'Active')}</Badge>
    }
    return <Badge variant="muted">{t('team.unverified', 'Unverified')}</Badge>
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('team.pageTitle', 'Team')}
        description={t('team.pageSubtitle', 'Manage team members and roles')}
        actions={
          <Button onClick={() => setShowInvite(true)} icon={<UserPlus size={16} />}>
            {t('team.inviteButton', 'Invite Members')}
          </Button>
        }
      />
      <PageContent>
        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">{t('team.inviteTitle', 'Invite Team Members')}</h2>

              <label className="block text-sm text-muted-foreground mb-1">{t('team.emailsLabel', 'Email addresses (one per line or comma-separated)')}</label>
              <textarea
                value={inviteEmails}
                onChange={e => setInviteEmails(e.target.value)}
                placeholder="alice@company.com&#10;bob@company.com"
                rows={4}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground mb-4"
              />

              <label className="block text-sm text-muted-foreground mb-1">{t('team.roleLabel', 'Role')}</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground mb-4"
              >
                <option value="member">{t('team.roleMember', 'Member')}</option>
                <option value="admin">{t('team.roleAdmin', 'Admin')}</option>
              </select>

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => { setShowInvite(false); setError('') }}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmails.trim()}
                  loading={inviting}
                >
                  {t('team.sendInvites', 'Send Invites')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Members Table */}
        {loading ? (
          <p className="text-muted-foreground">{t('common.loading')}</p>
        ) : members.length === 0 ? (
          <div className="bg-card border border-border rounded-lg">
            <EmptyState
              icon={<Users />}
              title={t('team.noMembers', 'No team members yet. Invite your first member.')}
              action={
                <Button onClick={() => setShowInvite(true)} icon={<UserPlus size={16} />}>
                  {t('team.inviteButton', 'Invite Members')}
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>{t('team.nameHeader', 'Name')}</TableHeaderCell>
                <TableHeaderCell>{t('team.emailHeader', 'Email')}</TableHeaderCell>
                <TableHeaderCell>{t('team.roleHeader', 'Role')}</TableHeaderCell>
                <TableHeaderCell>{t('team.statusHeader', 'Status')}</TableHeaderCell>
                {role === 'owner' && <TableHeaderCell>{t('team.actionsHeader', 'Actions')}</TableHeaderCell>}
              </tr>
            </TableHead>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant[m.role] || 'muted'} size="sm">
                      {t(`team.role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}`, m.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {statusBadge(m)}
                  </TableCell>
                  {role === 'owner' && (
                    <TableCell>
                      {m.role !== 'owner' && (
                        <div className="flex gap-2">
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(m.id, e.target.value)}
                            className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground"
                          >
                            <option value="admin">{t('team.roleAdmin', 'Admin')}</option>
                            <option value="member">{t('team.roleMember', 'Member')}</option>
                          </select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemove(m.id, m.name)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageContent>
    </PageContainer>
  )
}
