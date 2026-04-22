export type PeopleTaskType = 'attestation' | 'process_check' | 'evidence_submission' | 'policy_ack' | 'training'
export type PDCAPhase = 'plan' | 'do' | 'check' | 'act'
export type TaskFrequency = 'one_off' | 'monthly' | 'quarterly' | 'annual'
export type PeriodStatus = 'completed' | 'pending' | 'overdue'
export type IsmsDomain =
  | 'policy_governance'
  | 'risk_management'
  | 'incident_management'
  | 'business_continuity'
  | 'supply_chain'
  | 'access_control'
  | 'asset_management'
  | 'audit_training'

export interface PeopleTaskItem {
  id: string
  title: string
  description: string
  taskType: PeopleTaskType
  pdcaPhase: PDCAPhase
  article21Subsection: string
  frequency: TaskFrequency
  nextDueDate: string | null
  assigneeUserId: string | null
  assigneeRole: string | null
  relatedControlId: string | null
  relatedProcessId: string | null
  relatedPlanId: string | null
  requiresEvidence: boolean
  attestationStatement: string | null
  baselineTemplateId: string | null
  ismsDomain: IsmsDomain | null
  active: boolean
  createdAt: string
  updatedAt: string
  currentPeriodStatus: PeriodStatus | null
  completionCount: number
}

export interface MyPeopleTask {
  id: string
  title: string
  description: string
  taskType: PeopleTaskType
  pdcaPhase: PDCAPhase
  article21Subsection: string
  frequency: TaskFrequency
  nextDueDate: string | null
  requiresEvidence: boolean
  attestationStatement: string | null
  relatedControlId: string | null
  ismsDomain: IsmsDomain | null
  currentPeriodKey: string
  currentPeriodStatus: PeriodStatus
}

export interface PeopleTaskCompletion {
  id: string
  peopleTaskId: string
  userId: string
  userName: string | null
  userEmail: string | null
  periodKey: string
  attestedAt: string | null
  attestationResponse: string | null
  evidenceId: string | null
  createdAt: string
}

export interface PDCASummary {
  total: number
  completed: number
  rate: number
}

export interface Article21CoverageItem {
  subsection: string
  label: string
  taskCount: number
  completionRate: number
  status: 'healthy' | 'partial' | 'at_risk' | 'not_started'
}

export interface IsmsDomainCoverageItem {
  domain: IsmsDomain
  label: string
  taskCount: number
  completionRate: number
  status: 'healthy' | 'partial' | 'at_risk' | 'not_started'
}

export interface ISMSCoverage {
  pdcaSummary: Record<PDCAPhase, PDCASummary>
  article21Coverage: Article21CoverageItem[]
  ismsDomainCoverage: IsmsDomainCoverageItem[]
  overallHealthScore: number
  overdueCount: number
  totalActive: number
  completedThisPeriod: number
}
