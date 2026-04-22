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
import { Card, Button, StatCard, ProgressBar, InfoTooltip } from '../components/ui'
import { EmployeeCampaign, TaskStatus, TaskType } from '../types/controls'
import { format } from 'date-fns'

const taskStatusColors: Record<TaskStatus, string> = {
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  overdue: 'text-red-400 bg-red-500/10 border-red-500/20'
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

  return (
    <Card className="hover:border-navy-700 transition-all">
      <div>
        {/* Campaign Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs px-2 py-0.5 rounded bg-navy-800 text-[#CBD8E8]">
                {campaign.taskType === 'quiz' ? t('peopleTasks.trainingQuizType') : t('peopleTasks.policyAcknowledgmentType')}
              </span>
              {isAtRisk && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {t('peopleTasks.atRiskBadge')}
                </span>
              )}
              {completionRate === 100 && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle size={11} />
                  {t('peopleTasks.completeBadge')}
                </span>
              )}
            </div>

            <h3 className="text-[15px] font-semibold text-white mb-1">{campaign.controlName}</h3>

            <div className="flex items-center gap-4 text-[13px] text-[#94b4d1]">
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
              <div className="text-3xl font-bold font-syne" style={{
                color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444'
              }}>
                {completionRate}%
              </div>
              <div className="text-xs text-[#94b4d1]">{t('peopleTasks.completionLabel')}</div>
            </div>

            {isExpanded ? (
              <ChevronDown size={20} className="text-cyan-400" />
            ) : (
              <ChevronRight size={20} className="text-[#4a6580]" />
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">{t('peopleTasks.completedCount', { count: completedTasks })}</span>
              <span className="text-yellow-400">{t('peopleTasks.pendingCount', { count: pendingTasks })}</span>
              {overdueTasks > 0 && (
                <span className="text-red-400">{t('peopleTasks.overdueCount', { count: overdueTasks })}</span>
              )}
            </div>
            {averageScore !== null && (
              <span className="flex items-center gap-1 text-[#CBD8E8]">
                <Award size={12} />
                {t('peopleTasks.avgScoreLabel')} {averageScore.toFixed(1)}/5
              </span>
            )}
          </div>
          <ProgressBar
            value={completionRate}
            color={completionRate >= 80 ? 'bg-emerald-500' : 'bg-yellow-500'}
            height="h-2"
          />
        </div>

        {/* Expanded Employee List */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-navy-700 space-y-2">
            {campaign.tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-navy-900/40 border border-navy-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[14px] font-medium text-white">{task.employeeName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-lg border ${taskStatusColors[task.status]}`}>
                      {task.status === 'completed' ? t('peopleTasks.taskStatusCompleted') : task.status === 'overdue' ? t('peopleTasks.taskStatusOverdue') : t('peopleTasks.taskStatusPending')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[13px] text-[#94b4d1]">
                    <span>{task.employeeEmail}</span>
                    <span>•</span>
                    <span>{task.department}</span>
                  </div>
                </div>

                <div className="text-right text-[13px]">
                  {task.status === 'completed' ? (
                    <div>
                      <div className="text-emerald-400 font-semibold mb-0.5">
                        {task.completedDate ? format(new Date(task.completedDate), 'MMM d, yyyy') : t('peopleTasks.taskStatusCompleted')}
                      </div>
                      {task.score !== undefined && (
                        <div className="text-[#94b4d1]">{t('peopleTasks.scoreLabel')} {task.score}/5</div>
                      )}
                    </div>
                  ) : (
                    <div className={task.status === 'overdue' ? 'text-red-400' : 'text-yellow-400'}>
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
                disabled={pendingTasks === 0 && overdueTasks === 0}
              >
                <Mail size={14} />
                {t('peopleTasks.sendReminderButton')} ({pendingTasks + overdueTasks})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/controls')}
              >
                {t('peopleTasks.viewControlButton')} <ChevronRight size={14} />
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold font-syne text-white flex items-center gap-2">
            {t('peopleTasks.pageTitle')}
            <InfoTooltip content={t('peopleTasks.pageTitleTooltip')} />
          </h1>
          <p className="text-[14px] text-[#CBD8E8] mt-1">
            {t('peopleTasks.pageSubtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus size={16} />
          {t('peopleTasks.createCampaignButton')}
        </Button>
      </div>

      {/* Inline Create Campaign Form */}
      {showCreateForm && (
        <Card className="border-cyan-500/30">
          <h3 className="text-[16px] font-bold font-syne text-white mb-4">{t('peopleTasks.createFormTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('peopleTasks.selectControlLabel')}</label>
              <select
                value={selectedControlId}
                onChange={(e) => setSelectedControlId(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('peopleTasks.selectControlPlaceholder')}</option>
                {peopleControls.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('peopleTasks.taskTypeLabel')}</label>
              <select
                value={taskType}
                onChange={(e) => {
                  const val = e.target.value as TaskType
                  setTaskType(val)
                  if (val !== 'acknowledge') setSelectedTemplateId('')
                }}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="acknowledge">{t('peopleTasks.policyAcknowledgmentType')}</option>
                <option value="quiz">{t('peopleTasks.trainingQuizType')}</option>
              </select>
            </div>

            {taskType === 'acknowledge' && (
              <div>
                <label className="text-xs text-[#94b4d1] mb-1 block">{t('peopleTasks.policyTemplateLabel')}</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
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
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('peopleTasks.employeeEmailsLabel')}</label>
              <textarea
                value={employeeEmails}
                onChange={(e) => setEmployeeEmails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
                placeholder={t('peopleTasks.employeeEmailsPlaceholder')}
              />
            </div>

            <div>
              <label className="text-xs text-[#94b4d1] mb-1 block">{t('peopleTasks.deadlineLabel')}</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button
              onClick={handleCreateCampaign}
              disabled={!selectedControlId || !employeeEmails.trim() || !deadline}
            >
              <Plus size={14} />
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
        <StatCard
          label={t('peopleTasks.overallCompletionLabel')}
          value={`${employeeComplianceStats.completionRate}%`}
          icon={employeeComplianceStats.completionRate >= 80 ? (
            <TrendingUp size={18} className="text-emerald-400" />
          ) : (
            <TrendingDown size={18} className="text-yellow-400" />
          )}
          accent={employeeComplianceStats.completionRate >= 80 ? 'text-emerald-400' : 'text-yellow-400'}
          trend={`${employeeComplianceStats.completedTasks}/${employeeComplianceStats.totalTasks} ${t('peopleTasks.tasksLabel')}`}
        />
        <StatCard
          label={t('peopleTasks.activeCampaignsLabel')}
          value={activeCampaigns.length}
          icon={<Users size={18} className="text-cyan-400" />}
          accent="text-cyan-400"
        />
        <StatCard
          label={t('peopleTasks.atRiskLabel')}
          value={atRiskCampaigns.length}
          icon={<AlertTriangle size={18} className="text-red-500" />}
          accent="text-red-500"
          trend={t('peopleTasks.pastDeadlineTrend')}
        />
        <StatCard
          label={t('peopleTasks.completedLabel')}
          value={completedCampaigns.length}
          icon={<CheckCircle size={18} className="text-emerald-400" />}
          accent="text-emerald-400"
        />
      </div>

      {/* Alert for at-risk campaigns */}
      {atRiskCampaigns.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-red-400 mb-1">
                {t('peopleTasks.campaignsAtRiskTitle', { count: atRiskCampaigns.length })}
              </h3>
              <p className="text-[14px] text-red-300 leading-relaxed mb-3">
                {atRiskCampaigns.length === 1
                  ? t('peopleTasks.campaignsAtRiskDescriptionSingle')
                  : t('peopleTasks.campaignsAtRiskDescriptionPlural')}
              </p>
              <div className="flex flex-wrap gap-2">
                {atRiskCampaigns.map(c => {
                  const completionRate = Math.round(getCampaignCompletionRate(c))
                  return (
                    <span key={c.id} className="text-xs px-2 py-1 rounded bg-navy-900/60 border border-red-500/20 text-red-300">
                      {c.controlName.slice(0, 40)}... ({completionRate}%)
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* No campaigns message */}
      {campaigns.length === 0 && (
        <Card className="text-center py-12">
          <Users size={48} className="text-navy-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold font-syne text-white mb-2">
            {t('peopleTasks.noCampaignsTitle')}
          </h3>
          <p className="text-[14px] text-[#CBD8E8] max-w-md mx-auto mb-6">
            {t('peopleTasks.noCampaignsDescription')}
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={16} />
            {t('peopleTasks.createCampaignButton')}
          </Button>
        </Card>
      )}

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-bold font-syne text-white">
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
            <h2 className="text-[18px] font-bold font-syne text-white flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-400" />
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
  )
}
