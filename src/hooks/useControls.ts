import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Control,
  ControlCategory,
  ControlSeverity,
  ControlStatus,
  EmployeeCampaign,
  EmployeeTask,
  ComplianceScore,
  ArticleArea,
  TaskType,
  TaskStatus
} from '../types/controls'
import {
  getBaseControls,
  getControlStates,
  bulkUpsertControls,
  updateControlState,
  getCampaigns,
  createCampaignApi,
  updateCampaignTask,
  getCountryControls,
  getCountryAssessmentQuestions,
} from '../services/api'
import type { AccountControlState, BaseControlDef, CampaignApi, CountryControl, CountryAssessmentQuestion } from '../services/api'

// Module-level cache for base control definitions (rarely change)
let cachedFreshControls: Control[] | null = null

function defsToControls(defs: BaseControlDef[]): Control[] {
  return defs.map(d => ({
    id: d.controlId,
    title: d.title,
    description: d.description,
    article: d.article,
    articleArea: d.articleArea,
    category: d.category as ControlCategory,
    severity: d.severity as ControlSeverity,
    isPeopleControl: d.isPeopleControl,
    status: 'Not Started' as ControlStatus,
    owner: '',
    dueDate: null,
    evidence: [],
    notes: '',
    isAutoPopulated: false,
    lastUpdated: new Date().toISOString(),
  }))
}

async function getFreshControls(): Promise<Control[]> {
  if (cachedFreshControls) return cachedFreshControls
  const defs = await getBaseControls()
  cachedFreshControls = defsToControls(defs)
  return cachedFreshControls
}

const STORAGE_KEY = 'konforme_controls'
const CAMPAIGNS_STORAGE_KEY = 'konforme_campaigns'

// Status weights for scoring
const STATUS_WEIGHTS = {
  'Not Started': 0,
  'Planned': 0.25,
  'Partial': 0.5,
  'Implemented': 1
}

// Severity weights
const SEVERITY_WEIGHTS = {
  critical: 3,
  high: 2,
  medium: 1
}

// Country overlay data attached to controls
export interface CountryControlOverlay {
  nationalLegalReference: string | null
  nationalSpecification: string | null
  goesBeyondEu: boolean
  additionalRequirements: string[]
}

// Normalize article format: "Art 21(2)(a)" -> "Art. 21(2)(a)" to match controlsData
function normalizeArticle(article: string): string {
  if (article.startsWith('Art ') && !article.startsWith('Art. ')) {
    return 'Art. ' + article.slice(4)
  }
  return article
}

// Map article to area name
const ARTICLE_AREA_NAMES: Record<string, string> = {
  'Art. 20': 'Governance',
  'Art 20': 'Governance',
  'Art. 21(2)(a)': 'Risk Management',
  'Art. 21(2)(b)': 'Incident Handling',
  'Art. 21(2)(c)': 'Business Continuity',
  'Art. 21(2)(d)': 'Supply Chain Security',
  'Art. 21(2)(e)': 'Secure Development',
  'Art. 21(2)(f)': 'Effectiveness Assessment',
  'Art. 21(2)(g)': 'Cyber Hygiene & Training',
  'Art. 21(2)(h)': 'Cryptography & Encryption',
  'Art. 21(2)(i)': 'Access Control & Asset Management',
  'Art. 21(2)(j)': 'MFA & Secured Communications',
}

// Convert backend campaign to frontend EmployeeCampaign
function mapCampaignFromApi(c: CampaignApi): EmployeeCampaign {
  return {
    id: c.id,
    controlId: c.controlId,
    controlName: c.controlName,
    taskType: c.taskType as TaskType,
    deadline: c.deadline,
    createdAt: c.createdAt,
    policyContent: c.policyContent || undefined,
    tasks: c.tasks.map(t => ({
      id: t.id,
      controlId: t.controlId,
      campaignId: t.campaignId,
      employeeName: t.employeeName,
      employeeEmail: t.employeeEmail,
      department: t.department,
      taskType: t.taskType as TaskType,
      status: t.status as TaskStatus,
      sentDate: t.sentDate,
      completedDate: t.completedDate,
      deadline: t.deadline,
      score: t.score ?? undefined,
    })),
  }
}

// Merge backend state into template controls
function mergeStateIntoControls(
  baseControls: Control[],
  backendStates: AccountControlState[]
): Control[] {
  const stateMap = new Map(backendStates.map(s => [s.controlId, s]))
  return baseControls.map(c => {
    const state = stateMap.get(c.id)
    if (!state) return c
    return {
      ...c,
      status: (state.status as ControlStatus) || c.status,
      owner: state.owner || c.owner,
      dueDate: state.dueDate,
      notes: state.notes || c.notes,
      isCountrySpecific: state.isCountrySpecific,
      lastUpdated: state.lastUpdated || c.lastUpdated,
    }
  })
}

export function useControls() {
  const [controls, setControls] = useState<Control[]>([])
  const [campaigns, setCampaigns] = useState<EmployeeCampaign[]>([])
  const [selectedControl, setSelectedControl] = useState<Control | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [countryControlMap, setCountryControlMap] = useState<Record<string, CountryControlOverlay>>({})
  const [loading, setLoading] = useState(true)

  // Track whether initial load is done to avoid saving during load
  const initialLoadDone = useRef(false)

  const accountId = localStorage.getItem('konforme_account_id')

  // Load controls and campaigns from backend on mount
  useEffect(() => {
    if (!accountId) {
      getFreshControls().then(fresh => setControls(fresh)).catch(() => setControls([]))
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadData() {
      try {
        // Load base control definitions, backend state, and campaigns in parallel
        const [freshControls, backendStates, backendCampaigns] = await Promise.all([
          getFreshControls(),
          getControlStates(accountId!).catch(() => [] as AccountControlState[]),
          getCampaigns(accountId!).catch(() => [] as CampaignApi[]),
        ])

        if (cancelled) return

        // Migration: if backend is empty but localStorage has data, migrate it
        if (backendStates.length === 0) {
          const localData = localStorage.getItem(STORAGE_KEY)
          if (localData) {
            try {
              const parsed = JSON.parse(localData) as Control[]
              const toMigrate = parsed.map(c => ({
                control_id: c.id,
                status: c.status,
                owner: c.owner,
                due_date: c.dueDate || null,
                notes: c.notes,
                is_country_specific: c.isCountrySpecific || false,
              }))
              const migrated = await bulkUpsertControls(accountId!, toMigrate)
              if (!cancelled) {
                // Clear localStorage after successful migration
                localStorage.removeItem(STORAGE_KEY)
                localStorage.removeItem(CAMPAIGNS_STORAGE_KEY)
                const merged = mergeStateIntoControls(freshControls, migrated)
                setControls(merged)
              }
            } catch {
              // Migration failed, use fresh controls and seed backend
              if (!cancelled) {
                const seeded = await seedBackend(accountId!, freshControls)
                const merged = mergeStateIntoControls(freshControls, seeded)
                setControls(merged)
              }
            }
          } else {
            // No localStorage, no backend — seed backend with defaults
            const seeded = await seedBackend(accountId!, freshControls)
            if (!cancelled) {
              const merged = mergeStateIntoControls(freshControls, seeded)
              setControls(merged)
            }
          }
        } else {
          // Backend has data — use it
          if (!cancelled) {
            const merged = mergeStateIntoControls(freshControls, backendStates)
            setControls(merged)
          }
        }

        // Load campaigns
        if (!cancelled) {
          if (backendCampaigns.length > 0) {
            setCampaigns(backendCampaigns.map(mapCampaignFromApi))
            // Clear legacy localStorage campaigns
            localStorage.removeItem(CAMPAIGNS_STORAGE_KEY)
          } else {
            // Migrate localStorage campaigns if any
            const localCampaigns = localStorage.getItem(CAMPAIGNS_STORAGE_KEY)
            if (localCampaigns) {
              try {
                setCampaigns(JSON.parse(localCampaigns))
                localStorage.removeItem(CAMPAIGNS_STORAGE_KEY)
              } catch {
                setCampaigns([])
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load controls from backend', err)
        if (!cancelled) {
          getFreshControls().then(fresh => setControls(fresh)).catch(() => setControls([]))
        }
      } finally {
        if (!cancelled) {
          initialLoadDone.current = true
          setLoading(false)
        }
      }
    }

    // Load country data in parallel
    const countryCode = localStorage.getItem('konforme_country')

    loadData().then(() => {
      if (cancelled || !countryCode) return

      Promise.all([
        getCountryControls(countryCode).catch(() => [] as CountryControl[]),
        getCountryAssessmentQuestions(countryCode).catch(() => [] as CountryAssessmentQuestion[]),
      ]).then(([countryControls, countryQuestions]) => {
        if (cancelled) return

        // Build overlay map
        const map: Record<string, CountryControlOverlay> = {}
        const dedupReqs = new Set<string>()
        countryControls.forEach(cc => {
          const key = normalizeArticle(cc.euArticle || '')
          if (!map[key]) {
            map[key] = {
              nationalLegalReference: cc.nationalLegalReference,
              nationalSpecification: cc.nationalSpecification,
              goesBeyondEu: cc.goesBeyondEu,
              additionalRequirements: [],
            }
            dedupReqs.clear()
          }
          if (cc.goesBeyondEu) {
            map[key].goesBeyondEu = true
            if (cc.nationalSpecification && !map[key].nationalSpecification) {
              map[key].nationalSpecification = cc.nationalSpecification
            }
          }
          if (cc.additionalRequirements?.length) {
            cc.additionalRequirements.forEach(r => {
              if (!dedupReqs.has(r)) {
                dedupReqs.add(r)
                map[key].additionalRequirements.push(r)
              }
            })
          }
        })
        setCountryControlMap(map)

        // Enrich controls with country data + add country-specific controls
        setControls(prev => {
          const baseControls = prev.filter(c => !c.isCountrySpecific)
          const enriched = baseControls.map(c => {
            const overlay = map[c.article]
            if (!overlay) return c
            return {
              ...c,
              nationalLegalReference: overlay.nationalLegalReference,
              nationalSpecification: overlay.nationalSpecification,
              goesBeyondEu: overlay.goesBeyondEu,
              additionalRequirements: overlay.additionalRequirements,
            }
          })

          const additionalControls: Control[] = countryQuestions
            .filter(q => q.isAdditional)
            .map((q, i) => {
              const controlId = `country-ctrl-${countryCode.toLowerCase()}-${i + 1}`
              return {
                id: controlId,
                title: q.questionText,
                description: q.helpText || q.questionText,
                article: normalizeArticle(q.euArticle || ''),
                articleArea: ARTICLE_AREA_NAMES[normalizeArticle(q.euArticle || '')] || q.domain || 'National Requirement',
                category: 'Organizational' as ControlCategory,
                status: 'Not Started' as ControlStatus,
                owner: '',
                dueDate: null,
                evidence: [],
                notes: '',
                isAutoPopulated: false,
                isPeopleControl: false,
                lastUpdated: new Date().toISOString(),
                severity: 'high' as ControlSeverity,
                isCountrySpecific: true,
                nationalLegalReference: q.nationalLegalReference,
              }
            })

          return [...enriched, ...additionalControls]
        })
      })
    })

    return () => { cancelled = true }
  }, [accountId])

  // Seed backend with default "Not Started" controls
  async function seedBackend(acctId: string, freshControls: Control[]): Promise<AccountControlState[]> {
    const items = freshControls.map(c => ({
      control_id: c.id,
      status: c.status,
      owner: c.owner,
      due_date: c.dueDate || null,
      notes: c.notes,
      is_country_specific: false,
    }))
    try {
      return await bulkUpsertControls(acctId, items)
    } catch {
      return []
    }
  }

  // Update control — saves to backend immediately, returns error message or null
  const updateControl = useCallback(async (controlId: string, updates: Partial<Control>): Promise<string | null> => {
    const prev = controls.find(c => c.id === controlId)
    const prevStatus = prev?.status

    setControls(curr =>
      curr.map(control =>
        control.id === controlId
          ? { ...control, ...updates, lastUpdated: new Date().toISOString() }
          : control
      )
    )

    // Persist to backend
    if (accountId) {
      const backendUpdates: Record<string, unknown> = {}
      if (updates.status !== undefined) backendUpdates.status = updates.status
      if (updates.owner !== undefined) backendUpdates.owner = updates.owner
      if (updates.dueDate !== undefined) backendUpdates.due_date = updates.dueDate || null
      if (updates.notes !== undefined) backendUpdates.notes = updates.notes

      if (Object.keys(backendUpdates).length > 0) {
        try {
          await updateControlState(accountId, controlId, backendUpdates as any)
          setLastSaved(new Date().toISOString())
          return null
        } catch (err: any) {
          console.error('Failed to save control to backend', err)
          const detail = err?.message || 'Failed to save'
          // Revert optimistic update on evidence-related errors
          if (detail.toLowerCase().includes('evidence')) {
            setControls(curr =>
              curr.map(control =>
                control.id === controlId
                  ? { ...control, status: prevStatus || control.status }
                  : control
              )
            )
          }
          return detail
        }
      }
    }
    return null
  }, [accountId, controls])

  // Add evidence to control (evidence is managed by a separate Evidence API, just update local state)
  const addEvidence = useCallback((controlId: string, evidence: Omit<Control['evidence'][0], 'id'>) => {
    const newEvidence = {
      ...evidence,
      id: `ev-${Date.now()}`
    }

    setControls(prev =>
      prev.map(control =>
        control.id === controlId
          ? {
              ...control,
              evidence: [...control.evidence, newEvidence],
              lastUpdated: new Date().toISOString()
            }
          : control
      )
    )
  }, [])

  // Remove evidence
  const removeEvidence = useCallback((controlId: string, evidenceId: string) => {
    setControls(prev =>
      prev.map(control =>
        control.id === controlId
          ? {
              ...control,
              evidence: control.evidence.filter(e => e.id !== evidenceId),
              lastUpdated: new Date().toISOString()
            }
          : control
      )
    )
  }, [])

  // Create employee campaign — saves to backend
  const createCampaign = useCallback((
    controlId: string,
    taskType: TaskType,
    employees: Array<{ name: string; email: string; department: string }>,
    deadline: string,
    policyContent?: string
  ) => {
    const control = controls.find(c => c.id === controlId)
    if (!control) return

    if (accountId) {
      createCampaignApi(accountId, {
        control_id: controlId,
        control_name: control.title,
        task_type: taskType,
        deadline,
        employees: employees.map(e => ({
          employee_name: e.name,
          employee_email: e.email,
          department: e.department,
        })),
        policy_content: policyContent || null,
      }).then(result => {
        setCampaigns(prev => [...prev, mapCampaignFromApi(result)])
      }).catch(err => {
        console.error('Failed to create campaign', err)
        // Fallback: create locally
        createCampaignLocally(controlId, control.title, taskType, employees, deadline, policyContent)
      })
    } else {
      createCampaignLocally(controlId, control.title, taskType, employees, deadline, policyContent)
    }

    // Update control status if not already implemented
    if (control.status === 'Not Started') {
      updateControl(controlId, { status: 'Planned' })
    }
  }, [controls, accountId, updateControl])

  function createCampaignLocally(
    controlId: string,
    controlName: string,
    taskType: TaskType,
    employees: Array<{ name: string; email: string; department: string }>,
    deadline: string,
    policyContent?: string
  ) {
    const campaignId = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const tasks: EmployeeTask[] = employees.map(emp => ({
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      controlId,
      campaignId,
      employeeName: emp.name,
      employeeEmail: emp.email,
      department: emp.department,
      taskType,
      status: 'pending' as TaskStatus,
      sentDate: new Date().toISOString(),
      completedDate: null,
      deadline
    }))

    const campaign: EmployeeCampaign = {
      id: campaignId,
      controlId,
      controlName,
      taskType,
      deadline,
      createdAt: new Date().toISOString(),
      tasks,
      policyContent
    }

    setCampaigns(prev => [...prev, campaign])
  }

  // Update task status — saves to backend
  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus, score?: number) => {
    setCampaigns(prev =>
      prev.map(campaign => ({
        ...campaign,
        tasks: campaign.tasks.map(task =>
          task.id === taskId
            ? {
                ...task,
                status,
                completedDate: status === 'completed' ? new Date().toISOString() : task.completedDate,
                score
              }
            : task
        )
      }))
    )

    if (accountId) {
      updateCampaignTask(accountId, taskId, {
        status,
        score: score ?? null,
      }).catch(err => {
        console.error('Failed to update campaign task', err)
      })
    }
  }, [accountId])

  // Calculate compliance score
  const complianceScore: ComplianceScore = useMemo(() => {
    let totalWeightedScore = 0
    let totalPossibleWeight = 0

    const categoryScores = {
      Technical: { score: 0, possible: 0 },
      Organizational: { score: 0, possible: 0 },
      People: { score: 0, possible: 0 }
    }

    const byArticle: Record<string, { score: number; possible: number }> = {}

    controls.forEach(control => {
      const statusWeight = STATUS_WEIGHTS[control.status]
      const severityWeight = SEVERITY_WEIGHTS[control.severity]
      const weightedScore = statusWeight * severityWeight
      const possibleWeight = severityWeight

      totalWeightedScore += weightedScore
      totalPossibleWeight += possibleWeight

      categoryScores[control.category].score += weightedScore
      categoryScores[control.category].possible += possibleWeight

      const article = control.article
      if (!byArticle[article]) {
        byArticle[article] = { score: 0, possible: 0 }
      }
      byArticle[article].score += weightedScore
      byArticle[article].possible += possibleWeight
    })

    const overall = totalPossibleWeight > 0
      ? Math.round((totalWeightedScore / totalPossibleWeight) * 100)
      : 0

    const technical = categoryScores.Technical.possible > 0
      ? Math.round((categoryScores.Technical.score / categoryScores.Technical.possible) * 100)
      : 0

    const organizational = categoryScores.Organizational.possible > 0
      ? Math.round((categoryScores.Organizational.score / categoryScores.Organizational.possible) * 100)
      : 0

    const people = categoryScores.People.possible > 0
      ? Math.round((categoryScores.People.score / categoryScores.People.possible) * 100)
      : 0

    const articleScores: Record<string, number> = {}
    Object.keys(byArticle).forEach(article => {
      const { score, possible } = byArticle[article]
      articleScores[article] = possible > 0 ? Math.round((score / possible) * 100) : 0
    })

    return {
      overall,
      technical,
      organizational,
      people,
      byArticle: articleScores
    }
  }, [controls])

  // Get article areas with status
  const articleAreas: ArticleArea[] = useMemo(() => {
    const areas: Record<string, ArticleArea> = {}

    controls.forEach(control => {
      const areaName = control.articleArea
      if (!areas[areaName]) {
        areas[areaName] = {
          id: areaName.toLowerCase().replace(/\s+/g, '-'),
          name: areaName,
          article: control.article.split('(')[0].trim(),
          controlCount: 0,
          implementedCount: 0,
          status: 'Not Started' as ControlStatus
        }
      }

      areas[areaName].controlCount++
      if (control.status === 'Implemented') {
        areas[areaName].implementedCount++
      }
    })

    Object.values(areas).forEach(area => {
      const implementedRatio = area.implementedCount / area.controlCount
      if (implementedRatio === 1) {
        area.status = 'Implemented'
      } else if (implementedRatio >= 0.5) {
        area.status = 'Partial'
      } else if (implementedRatio > 0) {
        area.status = 'Planned'
      } else {
        area.status = 'Not Started'
      }
    })

    return Object.values(areas)
  }, [controls])

  // Get critical gaps
  const allCriticalGaps = useMemo(() => {
    return controls
      .filter(c =>
        (c.status === 'Not Started' || c.status === 'Partial') &&
        (c.severity === 'critical' || c.severity === 'high')
      )
      .sort((a, b) => {
        const aCountryPriority = (a.isCountrySpecific ? 0 : a.goesBeyondEu ? 1 : 2)
        const bCountryPriority = (b.isCountrySpecific ? 0 : b.goesBeyondEu ? 1 : 2)
        if (aCountryPriority !== bCountryPriority) return aCountryPriority - bCountryPriority

        const severityOrder = { critical: 0, high: 1, medium: 2 }
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
        if (severityDiff !== 0) return severityDiff

        const statusOrder = { 'Not Started': 0, 'Planned': 1, 'Partial': 2, 'Implemented': 3 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
  }, [controls])

  const criticalGaps = useMemo(() => {
    return allCriticalGaps.slice(0, 5)
  }, [allCriticalGaps])

  // Filter controls
  const filterControls = (
    category?: ControlCategory,
    status?: ControlStatus,
    articleArea?: string,
    searchQuery?: string,
    severity?: ControlSeverity
  ) => {
    return controls.filter(control => {
      if (category && control.category !== category) return false
      if (status && control.status !== status) return false
      if (articleArea && control.articleArea !== articleArea) return false
      if (severity && control.severity !== severity) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          control.title.toLowerCase().includes(query) ||
          control.description.toLowerCase().includes(query) ||
          control.article.toLowerCase().includes(query)
        )
      }
      return true
    })
  }

  // Get campaigns for control
  const getCampaignsForControl = (controlId: string) => {
    return campaigns.filter(c => c.controlId === controlId)
  }

  // Get all tasks across all campaigns
  const allTasks = useMemo(() => {
    return campaigns.flatMap(c => c.tasks)
  }, [campaigns])

  // Employee compliance stats
  const employeeComplianceStats = useMemo(() => {
    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    const pendingTasks = allTasks.filter(t => t.status === 'pending').length
    const overdueTasks = allTasks.filter(t => t.status === 'overdue').length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate
    }
  }, [allTasks])

  // Helper: get country overlay for a control by its article
  const getCountryOverlay = (article: string): CountryControlOverlay | null => {
    return countryControlMap[article] || countryControlMap[normalizeArticle(article)] || null
  }

  return {
    controls,
    campaigns,
    selectedControl,
    setSelectedControl,
    updateControl,
    addEvidence,
    removeEvidence,
    createCampaign,
    updateTaskStatus,
    complianceScore,
    articleAreas,
    criticalGaps,
    allCriticalGaps,
    filterControls,
    getCampaignsForControl,
    allTasks,
    employeeComplianceStats,
    lastSaved,
    loading,
    // Country-specific
    countryControlMap,
    getCountryOverlay,
  }
}
