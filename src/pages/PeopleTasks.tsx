import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Award,
  Plus,
} from 'lucide-react'
import { useControlsContext } from '../context/ControlsContext'
import { policyTemplates } from '../data/policyTemplates'
import { renderPolicyTemplate } from '../utils/renderPolicyTemplate'
import { Card, ProgressBar, InfoTooltip } from '../components/ui'
import { PageContainer, PageContent } from '../components/ui/PageContainer'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { MetricCard } from '../components/ui/MetricCard'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { EmployeeCampaign, TaskStatus, TaskType } from '../types/controls'
import { format } from 'date-fns'

const taskStatusColors: Record<TaskStatus, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  overdue: 'text-red-700 bg-red-50 border-red-200'
}

function taskStatusVariant(status: TaskStatus): 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'completed': return 'success'
    case 'overdue': return 'danger'
    default: return 'warning'
  }
}

function CampaignCard({ campaign }: { campaign: EmployeeCampaign }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const totalTasks = campaign.tasks.length
  const completedTasks = campaign.tasks.filter(t => t.status === 'completed').length
  const pendingTasks = campaign.tasks.filter(t => t.status === 'pending').length
  const overdueTasks = campaign.tasks.filter(t => t.status === 'overdue').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const deadlineDate = new Date(campaign.deadline)
  const isDeadlinePassed = deadlineDate < new Date()
  const isAtRisk = isDeadlinePassed && completionRate < 80

  const averageScore = campaign.taskType === 'quiz'
    ? campaign.tasks
        .filter(t => t.score !== undefined)
        .reduce((sum, t) => sum + (t.score || 0), 0) / completedTasks || 0
    : null

  const completionColorClass =
    completionRate >= 80 ? 'text-success' : completionRate >= 50 ? 'text-warning' : 'text-destructive'

  return (
    <Card className="hover:border-slate-300 transition-all">
      <div>
        {/* Campaign Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="muted" size="sm">
                {campaign.taskType === 'quiz' ? t('peopleTasks.trainingQuizType') : t('peopleTasks.policyAcknowledgmentType')}
              </Badge>
              {isAtRisk && (
                <Badge variant="danger" size="sm">
                  <AlertTriangle size={11} className="mr-1" />
                  {t('peopleTasks.atRiskBadge')}
                </Badge>
              )}
              {completionRate === 100 && (
                <Badge variant="success" size="sm">
                  <CheckCircle size={11} className="mr-1" />
                  {t('peopleTasks.completeBadge')}
                </Badge>
              )}
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1">{campaign.controlName}</h3>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {t('peopleTasks.employeesCount', { count: totalTasks })}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {t('peopleTasks.dueLabel')} {format(deadlineDate, 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {t('peopleTasks.createdLabel')} {format(new Date(campaign.createdAt), 'MMM d')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-3xl font-semibold ${completionColorClass}`}>
                {completionRate}%
              </div>
              <div className="text-xs text-muted-foreground">{t('peopleTasks.completionLabel')}</div>
            </div>

            {isExpanded ? (
              <ChevronDown size={20} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={20} className="text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-3">
              <span className="text-emerald-600">{t('peopleTasks.completedCount', { count: completedTasks })}</span>
              <span className="text-amber-600">{t('peopleTasks.pendingCount', { count: pendingTasks })}</span>
              {overdueTasks > 0 && (
                <span className="text-red-600">{t('peopleTasks.overdueCount', { count: overdueTasks })}</span>
              )}
            </div>
            {averageScore !== null && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Award size={12} />
                {t('peopleTasks.avgScoreLabel')} {averageScore.toFixed(1)}/5
              </span>
            )}
          </div>
          <ProgressBar
            value={completionRate}
            color={completionRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}
            height="h-2"
          />
        </div>

        {/* Expanded Employee List */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {campaign.tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground">{task.employeeName}</p>
                    <Badge variant={taskStatusVariant(task.status)} size="sm">
                      {task.status === 'completed' ? t('peopleTasks.taskStatusCompleted') : task.status === 'overdue' ? t('peopleTasks.taskStatusOverdue') : t('peopleTasks.taskStatusPending')}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{task.employeeEmail}</span>
                    <span>•</span>
                    <span>{task.department}</span>
                  </div>
                </div>

                <div className="text-right text-xs">
                  {task.status === 'completed' ? (
                    <div>
                      <div className="text-emerald-600 font-semibold mb-0.5">
                        {task.completedDate ? format(new Date(task.completedDate), 'MMM d, yyyy') : t('peopleTasks.taskStatusCompleted')}
                      </div>
                      {task.score !== undefined && (
                        <div className="text-muted-foreground">{t('peopleTasks.scoreLabel')} {task.score}/5</div>
                      )}
                    </div>
                  ) : (
                    <div className={task.status === 'overdue' ? 'text-red-600' : 'text-amber-600'}>
                      {task.status === 'overdue' ? t('peopleTasks.taskStatusOverdue') : t('peopleTasks.notCompleted')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Campaign Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Mail size={14} />}
                disabled={pendingTasks === 0 && overdueTasks === 0}
              >
                {t('peopleTasks.sendReminderButton')} ({pendingTasks + overdueTasks})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconRight={<ChevronRight size={14} />}
                onClick={() => navigate('/controls')}
              >
                {t('peopleTasks.viewControlButton')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function PeopleTasks() {
  const { t } = useTranslation()
  const { campaigns, controls, createCampaign, employeeComplianceStats } = useControlsContext()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedControlId, setSelectedControlId] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('acknowledge')
  const [employeeEmails, setEmployeeEmails] = useState('')
  const [deadline, setDeadline] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const peopleControls = controls.filter(c => c.isPeopleControl)

  const handleCreateCampaign = () => {
    if (!selectedControlId || !employeeEmails.trim() || !deadline) return

    const employees = employeeEmails
      .split('\n')
      .map(line => line.trim())
      .filter(email => email.length > 0)
      .map(email => ({
        name: email.split('@')[0].replace(/[._]/g, ' '),
        email,
        department: 'General'
      }))

    if (employees.length === 0) return

    const policyContent = selectedTemplateId
      ? renderPolicyTemplate(selectedTemplateId, t)
      : undefined
    createCampaign(selectedControlId, taskType, employees, deadline, policyContent)
    setShowCreateForm(false)
    setSelectedControlId('')
    setTaskType('acknowledge')
    setEmployeeEmails('')
    setDeadline('')
    setSelectedTemplateId('')
  }

  const getCampaignCompletionRate = (c: EmployeeCampaign) =>
    c.tasks.length > 0 ? (c.tasks.filter(t => t.status === 'completed').length / c.tasks.length) * 100 : 0

  const activeCampaigns = campaigns.filter(c => getCampaignCompletionRate(c) < 100)

  const completedCampaigns = campaigns.filter(c => getCampaignCompletionRate(c) === 100)

  const atRiskCampaigns = campaigns.filter(c => {
    const isDeadlinePassed = new Date(c.deadline) < new Date()
    return isDeadlinePassed && getCampaignCompletionRate(c) < 80
  })

  return (
    <PageContainer>
      <PageHeader
        title={t('peopleTasks.pageTitle')}
        description={t('peopleTasks.pageSubtitle')}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => setShowCreateForm(true)}>
            {t('peopleTasks.createCampaignButton')}
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Inline Create Campaign Form */}
          {showCreateForm && (
            <Card className="border-cyan-200">
              <h3 className="text-base font-semibold text-foreground mb-4">{t('peopleTasks.createFormTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('peopleTasks.selectControlLabel')}</label>
                  <select
                    value={selectedControlId}
                    onChange={(e) => setSelectedControlId(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-border focus:ring-2 focus:ring-ring"
                  >
                    <option value="">{t('peopleTasks.selectControlPlaceholder')}</option>
                    {peopleControls.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('peopleTasks.taskTypeLabel')}</label>
                  <select
                    value={taskType}
                    onChange={(e) => {
                      const val = e.target.value as TaskType
                      setTaskType(val)
                      if (val !== 'acknowledge') setSelectedTemplateId('')
                    }}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-border focus:ring-2 focus:ring-ring"
                  >
                    <option value="acknowledge">{t('peopleTasks.policyAcknowledgmentType')}</option>
                    <option value="quiz">{t('peopleTasks.trainingQuizType')}</option>
                  </select>
                </div>

                {taskType === 'acknowledge' && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t('peopleTasks.policyTemplateLabel')}</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-border focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t('peopleTasks.policyTemplateNone')}</option>
                      {(() => {
                        const recommended = selectedControlId
                          ? policyTemplates.filter(tpl => tpl.relatedControlIds.includes(selectedControlId))
                          : []
                        const other = selectedControlId
                          ? policyTemplates.filter(tpl => !tpl.relatedControlIds.includes(selectedControlId))
                          : policyTemplates
                        return (
                          <>
                            {recommended.length > 0 && (
                              <optgroup label={t('peopleTasks.policyTemplateRecommended')}>
                                {recommended.map(tpl => (
                                  <option key={tpl.id} value={tpl.id}>{t(tpl.titleKey)}</option>
                                ))}
                              </optgroup>
                            )}
                            {other.length > 0 && (
                              <optgroup label={recommended.length > 0 ? t('peopleTasks.policyTemplateOther') : undefined as any}>
                                {other.map(tpl => (
                                  <option key={tpl.id} value={tpl.id}>{t(tpl.titleKey)}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )
                      })()}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('peopleTasks.employeeEmailsLabel')}</label>
                  <textarea
                    value={employeeEmails}
                    onChange={(e) => setEmployeeEmails(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-border focus:ring-2 focus:ring-ring resize-none"
                    placeholder={t('peopleTasks.employeeEmailsPlaceholder')}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t('peopleTasks.deadlineLabel')}</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-border focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  icon={<Plus size={14} />}
                  onClick={handleCreateCampaign}
                  disabled={!selectedControlId || !employeeEmails.trim() || !deadline}
                >
                  {t('peopleTasks.createButtonLabel')}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false)
                    setSelectedControlId('')
                    setTaskType('acknowledge')
                    setEmployeeEmails('')
                    setDeadline('')
                    setSelectedTemplateId('')
                  }}
                >
                  {t('peopleTasks.cancelButton')}
                </Button>
              </div>
            </Card>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label={t('peopleTasks.overallCompletionLabel')}
              value={`${employeeComplianceStats.completionRate}%`}
              semantic={employeeComplianceStats.completionRate >= 80 ? 'success' : 'warning'}
              icon={employeeComplianceStats.completionRate >= 80 ? (
                <TrendingUp size={18} />
              ) : (
                <TrendingDown size={18} />
              )}
              helperText={`${employeeComplianceStats.completedTasks}/${employeeComplianceStats.totalTasks} ${t('peopleTasks.tasksLabel')}`}
            />
            <MetricCard
              label={t('peopleTasks.activeCampaignsLabel')}
              value={activeCampaigns.length}
              semantic="info"
              icon={<Users size={18} />}
            />
            <MetricCard
              label={t('peopleTasks.atRiskLabel')}
              value={atRiskCampaigns.length}
              semantic="danger"
              icon={<AlertTriangle size={18} />}
              helperText={t('peopleTasks.pastDeadlineTrend')}
            />
            <MetricCard
              label={t('peopleTasks.completedLabel')}
              value={completedCampaigns.length}
              semantic="success"
              icon={<CheckCircle size={18} />}
            />
          </div>

          {/* Alert for at-risk campaigns */}
          {atRiskCampaigns.length > 0 && (
            <Card className="bg-red-50 border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-700 mb-1">
                    {t('peopleTasks.campaignsAtRiskTitle', { count: atRiskCampaigns.length })}
                  </h3>
                  <p className="text-sm text-red-600 leading-relaxed mb-3">
                    {atRiskCampaigns.length === 1
                      ? t('peopleTasks.campaignsAtRiskDescriptionSingle')
                      : t('peopleTasks.campaignsAtRiskDescriptionPlural')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {atRiskCampaigns.map(c => {
                      const completionRate = Math.round(getCampaignCompletionRate(c))
                      return (
                        <Badge key={c.id} variant="danger" size="sm">
                          {c.controlName.slice(0, 40)}... ({completionRate}%)
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* No campaigns message */}
          {campaigns.length === 0 && (
            <div className="bg-card border border-border rounded-lg">
              <EmptyState
                icon={<Users />}
                title={t('peopleTasks.noCampaignsTitle')}
                description={t('peopleTasks.noCampaignsDescription')}
                action={
                  <Button icon={<Plus size={16} />} onClick={() => setShowCreateForm(true)}>
                    {t('peopleTasks.createCampaignButton')}
                  </Button>
                }
              />
            </div>
          )}

          {/* Active Campaigns */}
          {activeCampaigns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {t('peopleTasks.activeCampaignsSectionTitle')} ({activeCampaigns.length})
                </h2>
              </div>

              <div className="space-y-3">
                {activeCampaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Campaigns */}
          {completedCampaigns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  {t('peopleTasks.completedCampaignsSectionTitle')} ({completedCampaigns.length})
                </h2>
              </div>

              <div className="space-y-3">
                {completedCampaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </PageContainer>
  )
}
