import type { EUCountryInfo } from '../types/country'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${API_URL}/api/v1`

const AUTH_KEYS = {
  accountId: 'konforme_account_id',
  accountName: 'konforme_account_name',
  email: 'konforme_email',
  awsAccounts: 'konforme_aws_accounts',
  selectedAwsAccountId: 'konforme_selected_aws_account_id',
}

// --- AWS Account types ---

export interface AwsAccountInfo {
  id: string
  alias: string
  awsAccountId: string
  awsRegion: string
  isActive: boolean
  addedAt: string
}

// --- CSRF helper ---

function getCsrfToken(): string {
  const match = document.cookie.split('; ').find(row => row.startsWith('csrf_token='))
  return match ? match.split('=')[1] : ''
}

// --- Auth helpers ---

export function getStoredAuth() {
  let awsAccounts: AwsAccountInfo[] = []
  try {
    const raw = localStorage.getItem(AUTH_KEYS.awsAccounts)
    if (raw) awsAccounts = JSON.parse(raw)
  } catch { /* ignore */ }

  return {
    accountId: localStorage.getItem(AUTH_KEYS.accountId),
    accountName: localStorage.getItem(AUTH_KEYS.accountName),
    email: localStorage.getItem(AUTH_KEYS.email),
    awsAccounts,
    selectedAwsAccountId: localStorage.getItem(AUTH_KEYS.selectedAwsAccountId),
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(AUTH_KEYS.accountId)
}

// Backward-compatible alias
export const isConnected = isAuthenticated

// Keys that hold auth/session state — safe to clear on logout
const AUTH_ONLY_KEYS = new Set([
  AUTH_KEYS.accountId,
  AUTH_KEYS.accountName,
  AUTH_KEYS.email,
  AUTH_KEYS.awsAccounts,
  AUTH_KEYS.selectedAwsAccountId,
])

export function clearAuth() {
  // Only clear auth keys — preserve user work (controls, assessments, campaigns, etc.)
  AUTH_ONLY_KEYS.forEach(k => localStorage.removeItem(k))
}

// --- Refresh token logic ---

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return false
      const data = await res.json()
      // Update stored UI info
      localStorage.setItem(AUTH_KEYS.accountId, data.account_id)
      localStorage.setItem(AUTH_KEYS.accountName, data.account_name)
      localStorage.setItem(AUTH_KEYS.email, data.email)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

// --- Fetch wrapper ---

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  // Add CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase()
  const isAuthEndpoint = path.startsWith('/auth/')
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) {
      headers['X-CSRF-Token'] = csrf
    } else if (!isAuthEndpoint) {
      // CSRF token required for non-auth state-changing requests
      throw new Error('Missing CSRF token. Please refresh and try again.')
    }
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })
  } catch {
    throw new Error('Unable to connect to the server. Please check your internet connection and try again.')
  }

  // On 401, try refreshing the token once
  if (res.status === 401 && !isAuthEndpoint) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      // Retry the original request with fresh cookies
      const retryHeaders = { ...headers }
      const newCsrf = getCsrfToken()
      if (newCsrf && ['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
        retryHeaders['X-CSRF-Token'] = newCsrf
      }
      try {
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        })
      } catch {
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.')
      }
    }

    if (res.status === 401) {
      clearAuth()
      window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    const message = body.detail || `Something went wrong (${res.status})`
    throw new Error(message)
  }

  return res.json()
}

// --- Auth ---

interface AuthResponseRaw {
  access_token: string
  token_type: string
  account_id: string
  account_name: string
  email: string
  country: string | null
  language: string | null
}

function storeAuth(data: AuthResponseRaw) {
  // Clear all cached app data if switching to a different user
  const previousAccountId = localStorage.getItem(AUTH_KEYS.accountId)
  if (previousAccountId && previousAccountId !== data.account_id) {
    clearAuth()
  }

  localStorage.setItem(AUTH_KEYS.accountId, data.account_id)
  localStorage.setItem(AUTH_KEYS.accountName, data.account_name)
  localStorage.setItem(AUTH_KEYS.email, data.email)
  if (data.country) localStorage.setItem('konforme_country', data.country)
  if (data.language) localStorage.setItem('konforme_language', data.language)
}

export async function register(name: string, email: string, password: string, country?: string | null, language?: string | null): Promise<AuthResponseRaw> {
  const data = await apiFetch<AuthResponseRaw>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, country: country || null, language: language || 'en' }),
  })
  storeAuth(data)
  return data
}

export async function login(email: string, password: string): Promise<AuthResponseRaw> {
  const data = await apiFetch<AuthResponseRaw>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  storeAuth(data)
  return data
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch { /* ignore */ }
  clearAuth()
}

export async function getMe(): Promise<{ account_id: string; account_name: string; email: string; country: string | null; language: string | null }> {
  return apiFetch('/auth/me')
}

export async function resetPassword(email: string, newPassword: string): Promise<void> {
  await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, new_password: newPassword }),
  })
}

// --- Account ---

interface AwsAccountResponseRaw {
  id: string
  alias: string
  aws_account_id: string
  aws_region: string
  is_active: boolean
  added_at: string
}

function mapAwsAccount(raw: AwsAccountResponseRaw): AwsAccountInfo {
  return {
    id: raw.id,
    alias: raw.alias,
    awsAccountId: raw.aws_account_id,
    awsRegion: raw.aws_region,
    isActive: raw.is_active,
    addedAt: raw.added_at,
  }
}

// --- AWS Account CRUD ---

export async function addAwsAccount(
  alias: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string | null,
  region: string
): Promise<AwsAccountInfo> {
  const raw = await apiFetch<AwsAccountResponseRaw>('/accounts/aws-accounts', {
    method: 'POST',
    body: JSON.stringify({
      alias,
      aws_access_key_id: accessKeyId,
      aws_secret_access_key: secretAccessKey,
      aws_session_token: sessionToken || null,
      region,
    }),
  })

  const mapped = mapAwsAccount(raw)

  // Update stored list
  const stored = getStoredAuth()
  const updated = [...stored.awsAccounts, mapped]
  localStorage.setItem(AUTH_KEYS.awsAccounts, JSON.stringify(updated))

  return mapped
}

export async function removeAwsAccount(awsAccountId: string): Promise<void> {
  await apiFetch(`/accounts/aws-accounts/${awsAccountId}`, { method: 'DELETE' })

  // Update stored list
  const stored = getStoredAuth()
  const updated = stored.awsAccounts.filter(a => a.id !== awsAccountId)
  localStorage.setItem(AUTH_KEYS.awsAccounts, JSON.stringify(updated))

  // If removed account was selected, select another
  if (stored.selectedAwsAccountId === awsAccountId) {
    if (updated.length > 0) {
      localStorage.setItem(AUTH_KEYS.selectedAwsAccountId, updated[0].id)
    } else {
      localStorage.removeItem(AUTH_KEYS.selectedAwsAccountId)
    }
  }
}

export interface AccountInfoResponse {
  id: string
  name: string
  is_active: boolean
  country: string | null
  language: string | null
  connected_at: string
  aws_accounts: AwsAccountResponseRaw[]
}

export async function getAccountInfo(): Promise<AccountInfoResponse> {
  return apiFetch<AccountInfoResponse>('/accounts')
}

export async function updateAccount(updates: { name?: string; email?: string; country?: string; language?: string }): Promise<{ account_id: string; account_name: string; email: string }> {
  const data = await apiFetch<{ account_id: string; account_name: string; email: string }>('/accounts', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
  localStorage.setItem(AUTH_KEYS.accountName, data.account_name)
  localStorage.setItem(AUTH_KEYS.email, data.email)
  if (updates.country !== undefined) localStorage.setItem('konforme_country', updates.country)
  if (updates.language !== undefined) localStorage.setItem('konforme_language', updates.language)
  return data
}

// --- EU Countries (legacy) ---

export async function getEUCountries(): Promise<EUCountryInfo[]> {
  return apiFetch<EUCountryInfo[]>('/countries')
}

// --- Country Data (Phase 5) ---

export interface CountryListItem {
  code: string
  name: string
  nameLocal: string | null
  transpositionStatus: string
  transpositionLawName: string | null
  dateEffective: string | null
  competentAuthorityName: string | null
  researchConfidence: string | null
}

export interface CountryDetail {
  code: string
  name: string
  nameLocal: string | null
  transpositionStatus: string
  transpositionLawName: string | null
  transpositionLawReference: string | null
  transpositionLawUrl: string | null
  datePublished: string | null
  dateEffective: string | null
  competentAuthorityName: string | null
  competentAuthorityUrl: string | null
  csirtName: string | null
  csirtUrl: string | null
  researchConfidence: string | null
  researchNotes: string | null
}

export interface EntityTier {
  id: string
  tierKey: string
  localName: string | null
  description: string | null
  sectors: string[]
  sizeThresholds: Record<string, unknown>
  obligations: Record<string, unknown>
  penalties: Record<string, unknown>
}

export interface CountryControl {
  id: string
  controlId: string
  euArticle: string | null
  nationalLegalReference: string | null
  nationalSpecification: string | null
  goesBeyondEu: boolean
  appliesToTiers: string[]
  additionalRequirements: string[]
  isMandatory: boolean
}

export interface CountryDeadline {
  id: string
  deadlineDate: string
  description: string | null
  appliesToTiers: string[]
  legalReference: string | null
}

export interface CountryAssessmentQuestion {
  id: string
  baseQuestionId: string | null
  questionText: string
  helpText: string | null
  euArticle: string | null
  nationalLegalReference: string | null
  appliesToTiers: string[]
  domain: string | null
  weight: number
  isAdditional: boolean
}

export async function getCountries(): Promise<CountryListItem[]> {
  return apiFetch<CountryListItem[]>('/countries')
}

export async function getCountry(code: string): Promise<CountryDetail> {
  return apiFetch<CountryDetail>(`/countries/${encodeURIComponent(code)}`)
}

export async function getCountryTiers(code: string): Promise<EntityTier[]> {
  return apiFetch<EntityTier[]>(`/countries/${encodeURIComponent(code)}/tiers`)
}

export async function getCountryControls(code: string): Promise<CountryControl[]> {
  return apiFetch<CountryControl[]>(`/countries/${encodeURIComponent(code)}/controls`)
}

export async function getCountryDeadlines(code: string): Promise<CountryDeadline[]> {
  return apiFetch<CountryDeadline[]>(`/countries/${encodeURIComponent(code)}/deadlines`)
}

export async function getCountryAssessmentQuestions(code: string): Promise<CountryAssessmentQuestion[]> {
  return apiFetch<CountryAssessmentQuestion[]>(`/countries/${encodeURIComponent(code)}/assessment`)
}

export async function setAccountCountry(countryCode: string, entityTier?: string | null): Promise<{
  account_id: string
  country_code: string
  country_name: string
  entity_tier: string | null
}> {
  return apiFetch('/accounts/country', {
    method: 'PUT',
    body: JSON.stringify({
      country_code: countryCode,
      entity_tier: entityTier || null,
    }),
  })
}

// --- Cloud Credentials ---

export interface CloudCredential {
  id: string
  provider: string
  alias: string
  is_active: boolean
  added_at: string
  aws_account_id: string | null
  aws_region: string | null
  azure_subscription_id: string | null
  azure_tenant_id: string | null
}

export async function getCloudCredentials(accountId: string): Promise<{ credentials: CloudCredential[] }> {
  return apiFetch<{ credentials: CloudCredential[] }>(`/cloud-credentials/${accountId}`)
}

export async function addAzureCredential(
  accountId: string,
  alias: string,
  tenantId: string,
  clientId: string,
  clientSecret: string,
  subscriptionId: string
): Promise<CloudCredential> {
  return apiFetch<CloudCredential>(`/cloud-credentials/${accountId}/azure`, {
    method: 'POST',
    body: JSON.stringify({
      alias,
      tenant_id: tenantId,
      client_id: clientId,
      client_secret: clientSecret,
      subscription_id: subscriptionId,
    }),
  })
}

export async function removeCloudCredential(accountId: string, credentialId: string): Promise<void> {
  await apiFetch(`/cloud-credentials/${accountId}/${credentialId}`, { method: 'DELETE' })
}

export async function validateCloudCredential(accountId: string, credentialId: string): Promise<{ valid: boolean; provider: string }> {
  return apiFetch(`/cloud-credentials/${accountId}/${credentialId}/validate`, { method: 'POST' })
}

// --- Provider Scan ---

export async function startProviderScan(accountId: string, credentialId: string, provider: string): Promise<ScanStartResponse> {
  return apiFetch<ScanStartResponse>(`/scan/${accountId}/provider`, {
    method: 'POST',
    body: JSON.stringify({ credential_id: credentialId, provider }),
  })
}

// --- Scan ---

export interface ScanStartResponse {
  scan_id: string
  status: string
}

export interface ScanFinding {
  id: string
  checkName: string
  description: string
  resource: string
  resourceType: string
  severity: string
  status: string
  article: string
  articleTitle: string
  region: string
  evidence: string
  remediation: string
  remediationSteps: string[]
  domain: string
  timestamp: string
}

export interface DomainScore {
  domain: string
  article: string
  score: number
  passed: number
  failed: number
  total: number
}

export interface ScanResponse {
  id: string
  accountName: string
  accountId: string
  awsAccountId: string | null
  awsAlias: string | null
  region: string
  startedAt: string
  completedAt: string | null
  status: string
  overallScore: number | null
  totalChecks: number
  passed: number
  failed: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  findings: ScanFinding[]
  domainScores: DomainScore[]
  provider: string
  cloudCredentialId: string | null
}

export interface ScanSummary {
  id: string
  status: string
  startedAt: string
  completedAt: string | null
  overallScore: number | null
  totalChecks: number
  passed: number
  failed: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  provider: string
}

export async function getLatestScan(accountId: string, awsAccountId: string): Promise<ScanResponse> {
  return apiFetch<ScanResponse>(`/scan/latest/${accountId}?aws_account_id=${encodeURIComponent(awsAccountId)}`)
}

export async function getScanHistory(accountId: string, awsAccountId: string): Promise<ScanSummary[]> {
  return apiFetch<ScanSummary[]>(`/scans/${accountId}?aws_account_id=${encodeURIComponent(awsAccountId)}`)
}

export async function startScan(accountId: string, awsAccountId: string): Promise<ScanStartResponse> {
  return apiFetch<ScanStartResponse>(`/scan/${accountId}`, {
    method: 'POST',
    body: JSON.stringify({ aws_account_id: awsAccountId }),
  })
}

export async function getScan(scanId: string): Promise<ScanResponse> {
  return apiFetch<ScanResponse>(`/scan/${scanId}`)
}

// --- Assessment ---

export interface AssessmentResponseData {
  id: string
  completedAt: string
  score: number
  totalQuestions: number
  answered: number
  gaps: Array<{
    questionId: string
    question: string
    category: string
    article: string
    severity: string
    response: string
    recommendation: string
  }>
}

export interface AssessmentDetailResponse {
  assessment: AssessmentResponseData | null
  questions: Array<{
    id: string
    category: string
    question: string
    description: string
    article: string
    articleTitle: string
    severity: string
    guidance: string
  }>
}

export async function submitAssessment(
  accountId: string,
  responses: Array<{ question_id: string; response: string; notes?: string }>
): Promise<AssessmentResponseData> {
  return apiFetch<AssessmentResponseData>(`/assessment/${accountId}`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  })
}

export async function getAssessment(accountId: string): Promise<AssessmentDetailResponse> {
  return apiFetch<AssessmentDetailResponse>(`/assessment/${accountId}`)
}

// --- Assessment V2 (Maturity) ---

export async function submitAssessmentV2(
  accountId: string,
  responses: Array<{ question_id: string; maturity_level: number | null; notes?: string; evidence_refs?: string[] }>
): Promise<any> {
  return apiFetch(`/assessment/${accountId}/v2`, {
    method: 'POST',
    body: JSON.stringify({ responses }),
  })
}

export async function getAssessmentV2(accountId: string): Promise<any> {
  return apiFetch(`/assessment/${accountId}`)
}

export async function getAssessmentHistory(accountId: string): Promise<any> {
  return apiFetch(`/assessment/${accountId}/history`)
}

export async function getAssessmentVersion(accountId: string, versionId: string): Promise<any> {
  return apiFetch(`/assessment/${accountId}/version/${versionId}`)
}

export async function autoSaveResponse(
  accountId: string,
  questionId: string,
  data: { question_id: string; maturity_level: number | null; notes?: string; evidence_refs?: string[] }
): Promise<any> {
  return apiFetch(`/assessment/${accountId}/response/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// --- Remediation ---

export async function getRemediationTasks(accountId: string): Promise<any[]> {
  return apiFetch(`/remediation/${accountId}`)
}

export async function createRemediationTask(
  accountId: string,
  task: { question_id: string; title: string; description?: string; priority?: string; assigned_to?: string | null; due_date?: string | null }
): Promise<any> {
  return apiFetch(`/remediation/${accountId}`, {
    method: 'POST',
    body: JSON.stringify(task),
  })
}

export async function updateRemediationTask(
  accountId: string,
  taskId: string,
  updates: { title?: string; description?: string; status?: string; priority?: string; assigned_to?: string | null; due_date?: string | null }
): Promise<any> {
  return apiFetch(`/remediation/${accountId}/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// --- Evidence ---

export interface EvidenceFile {
  id: string
  controlId: string
  filename: string
  fileSize: number
  contentType: string
  uploadedAt: string
  uploadedBy: string
}

export async function uploadEvidence(accountId: string, controlId: string, file: File): Promise<EvidenceFile> {
  const formData = new FormData()
  formData.append('file', file)

  const method = 'POST'
  const headers: Record<string, string> = {}
  const csrf = getCsrfToken()
  if (csrf) {
    headers['X-CSRF-Token'] = csrf
  } else {
    throw new Error('Missing CSRF token. Please refresh and try again.')
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}/evidence/${accountId}/${encodeURIComponent(controlId)}`, {
      method,
      headers,
      body: formData,
      credentials: 'include',
    })
  } catch {
    throw new Error('Unable to connect to the server.')
  }

  // On 401, try refresh then retry
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryHeaders: Record<string, string> = {}
      const newCsrf = getCsrfToken()
      if (newCsrf) retryHeaders['X-CSRF-Token'] = newCsrf
      try {
        res = await fetch(`${API_BASE}/evidence/${accountId}/${encodeURIComponent(controlId)}`, {
          method,
          headers: retryHeaders,
          body: formData,
          credentials: 'include',
        })
      } catch {
        throw new Error('Unable to connect to the server.')
      }
    }
    if (res.status === 401) {
      clearAuth()
      window.location.href = '/login'
      throw new Error('Session expired. Please log in again.')
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `Upload failed (${res.status})`)
  }

  return res.json()
}

export async function listEvidence(accountId: string, controlId: string): Promise<EvidenceFile[]> {
  return apiFetch<EvidenceFile[]>(`/evidence/${accountId}/${encodeURIComponent(controlId)}`)
}

export function getEvidenceDownloadUrl(accountId: string, controlId: string, evidenceId: string): string {
  return `${API_BASE}/evidence/${accountId}/${encodeURIComponent(controlId)}/${evidenceId}/download`
}

export async function deleteEvidence(accountId: string, controlId: string, evidenceId: string): Promise<void> {
  await apiFetch(`/evidence/${accountId}/${encodeURIComponent(controlId)}/${evidenceId}`, {
    method: 'DELETE',
  })
}

// --- Scoring Config ---

export interface ScoringConfigResponse {
  technicalWeight: number
  organizationalWeight: number
  domainWeights: Record<string, number> | null
  preset: string | null
}

export interface ScoringConfigUpdateResponse extends ScoringConfigResponse {
  previewOverallScore: number | null
  previewGrade: string | null
}

export async function getScoringConfig(): Promise<ScoringConfigResponse> {
  return apiFetch<ScoringConfigResponse>('/settings/scoring')
}

export async function updateScoringConfig(
  technicalWeight: number,
  organizationalWeight: number
): Promise<ScoringConfigUpdateResponse> {
  return apiFetch<ScoringConfigUpdateResponse>('/settings/scoring', {
    method: 'PUT',
    body: JSON.stringify({
      technical_weight: technicalWeight,
      organizational_weight: organizationalWeight,
    }),
  })
}

// --- Score ---

export interface CombinedScoreResponse {
  overallScore: number | null
  technicalScore: number | null
  humanFactorScore: number | null
  controlsScore: number | null
  lastTechnicalScan: string | null
  lastHumanAssessment: string | null
  technicalWeight: number
  humanWeight: number
  assessmentWeight: number
  controlsWeight: number
  grade: string | null
  articleBreakdown: Array<{
    article: string
    articleTitle: string
    technicalScore: number | null
    humanScore: number | null
    combinedScore: number | null
  }>
}

export async function getCombinedScore(
  accountId: string,
  opts?: { awsAccountId?: string; credentialId?: string },
): Promise<CombinedScoreResponse> {
  const searchParams = new URLSearchParams()
  if (opts?.awsAccountId) searchParams.set('aws_account_id', opts.awsAccountId)
  if (opts?.credentialId) searchParams.set('credential_id', opts.credentialId)
  const qs = searchParams.toString()
  return apiFetch<CombinedScoreResponse>(`/score/${accountId}${qs ? `?${qs}` : ''}`)
}

// --- Report ---

export interface ReportResponse {
  accountId: string
  accountName: string
  generatedAt: string
  overallScore: number | null
  grade: string | null
  criticalActions: Array<{
    checkId: string
    title: string
    severity: string
    article: string
    remediation: string
    resource: string
  }>
  warnings: Array<{
    checkId: string
    title: string
    severity: string
    article: string
    remediation: string
    resource: string
  }>
  humanGaps: Array<{
    questionId: string
    question: string
    category: string
    article: string
    severity: string
    response: string
    recommendation: string
  }>
  passingCount: number
  totalChecks: number
}

export async function getReport(accountId: string): Promise<ReportResponse> {
  return apiFetch<ReportResponse>(`/report/${accountId}`)
}

// --- Controls ---

export interface AccountControlState {
  id: string
  controlId: string
  status: string
  owner: string
  dueDate: string | null
  notes: string
  isCountrySpecific: boolean
  lastUpdated: string
}

export async function getControlStates(accountId: string): Promise<AccountControlState[]> {
  return apiFetch<AccountControlState[]>(`/controls/${accountId}`)
}

export async function bulkUpsertControls(
  accountId: string,
  controls: Array<{
    control_id: string
    status?: string
    owner?: string
    due_date?: string | null
    notes?: string
    is_country_specific?: boolean
  }>
): Promise<AccountControlState[]> {
  return apiFetch<AccountControlState[]>(`/controls/${accountId}/bulk`, {
    method: 'PUT',
    body: JSON.stringify({ controls }),
  })
}

export async function updateControlState(
  accountId: string,
  controlId: string,
  updates: { status?: string; owner?: string; due_date?: string | null; notes?: string }
): Promise<AccountControlState> {
  return apiFetch<AccountControlState>(`/controls/${accountId}/${encodeURIComponent(controlId)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

// --- Campaigns ---

export interface CampaignTaskApi {
  id: string
  controlId: string
  campaignId: string
  employeeName: string
  employeeEmail: string
  department: string
  taskType: string
  status: string
  sentDate: string
  completedDate: string | null
  deadline: string
  score: number | null
}

export interface CampaignApi {
  id: string
  controlId: string
  controlName: string
  taskType: string
  deadline: string
  createdAt: string
  policyContent: string | null
  tasks: CampaignTaskApi[]
}

export async function getCampaigns(accountId: string): Promise<CampaignApi[]> {
  return apiFetch<CampaignApi[]>(`/campaigns/${accountId}`)
}

export async function createCampaignApi(
  accountId: string,
  data: {
    control_id: string
    control_name: string
    task_type: string
    deadline: string
    employees: Array<{ employee_name: string; employee_email: string; department?: string }>
    policy_content?: string | null
  }
): Promise<CampaignApi> {
  return apiFetch<CampaignApi>(`/campaigns/${accountId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCampaignTask(
  accountId: string,
  taskId: string,
  updates: { status?: string; score?: number | null }
): Promise<CampaignTaskApi> {
  return apiFetch<CampaignTaskApi>(`/campaigns/${accountId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}
