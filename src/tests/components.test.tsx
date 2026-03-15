import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import NIS2Overview from '../pages/NIS2Overview'
import TaskNotFound from '../components/task/TaskNotFound'
import TaskShell from '../components/task/TaskShell'

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accountId: 'test-account-id',
    accountName: 'Test User',
    email: 'test@example.com',
    isAuthenticated: true,
    loading: false,
    awsAccounts: [],
    selectedAwsAccountId: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    addAwsAccount: vi.fn(),
    removeAwsAccount: vi.fn(),
    selectAwsAccount: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock useAssessment hook
vi.mock('../hooks/useAssessment', () => ({
  useAssessment: () => ({
    overallScore: 0,
    projectedScore: 0,
    articleScores: {},
    answeredCount: 0,
    totalQuestions: 0,
    progressPercent: 0,
  }),
}))

// Mock services/api
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    getCombinedScore: vi.fn(),
    isConnected: vi.fn(() => false),
    getStoredAuth: vi.fn(() => null),
    getEUCountries: vi.fn(() => Promise.resolve([])),
    getCountries: vi.fn(() => Promise.resolve([])),
    getCloudCredentials: vi.fn(() => Promise.resolve({ credentials: [] })),
  }
})

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'en' },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

// Mock the ControlsContext (NIS2Overview uses useControlsContext, not useControls directly)
vi.mock('../context/ControlsContext', () => ({
  useControlsContext: () => ({
    complianceScore: {
      overall: 75,
      technical: 80,
      organizational: 70,
      people: 75,
      byArticle: {}
    },
    articleAreas: [
      {
        id: 'test-area',
        name: 'Risk Management',
        article: 'Art. 21',
        controlCount: 5,
        implementedCount: 3,
        status: 'Partial'
      }
    ],
    criticalGaps: [
      {
        id: 'gap-1',
        title: 'Critical Gap Control',
        description: 'Test gap',
        article: 'Art. 21(2)(a)',
        articleArea: 'Risk Management',
        category: 'Technical',
        status: 'Not Started',
        owner: '',
        dueDate: null,
        evidence: [],
        notes: '',
        isAutoPopulated: false,
        isPeopleControl: false,
        lastUpdated: new Date().toISOString(),
        severity: 'critical'
      }
    ],
    allCriticalGaps: [
      {
        id: 'gap-1',
        title: 'Critical Gap Control',
        description: 'Test gap',
        article: 'Art. 21(2)(a)',
        articleArea: 'Risk Management',
        category: 'Technical',
        status: 'Not Started',
        owner: '',
        dueDate: null,
        evidence: [],
        notes: '',
        isAutoPopulated: false,
        isPeopleControl: false,
        lastUpdated: new Date().toISOString(),
        severity: 'critical'
      }
    ],
    employeeComplianceStats: {
      totalTasks: 10,
      completedTasks: 5,
      pendingTasks: 3,
      overdueTasks: 2,
      completionRate: 50
    },
    controls: [],
    campaigns: [],
    selectedControl: null,
    setSelectedControl: vi.fn(),
    updateControl: vi.fn(),
    addEvidence: vi.fn(),
    removeEvidence: vi.fn(),
    createCampaign: vi.fn(),
    updateTaskStatus: vi.fn(),
    filterControls: vi.fn(),
    getCampaignsForControl: vi.fn(),
    allTasks: [],
    lastSaved: new Date().toISOString(),
    loading: false,
    countryControlMap: {},
    getCountryOverlay: vi.fn(() => null),
  })
}))

describe('UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
  })

  describe('NIS2 Overview Page', () => {
    it('Renders without crashing', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      expect(screen.getByText('overview.title')).toBeInTheDocument()
    })

    it('Displays the overall readiness score', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      // 75% appears multiple times (overall + people), so use getAllByText
      expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
    })

    it('Displays score as green when between 71-90%', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      // The score is 75%, which should show the "good" label
      expect(screen.getByText('overview.good')).toBeInTheDocument()
    })

    it('Displays all three category scores', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      // No backend connected: technical=0%, assessment=0%, controls=75% (from complianceScore.overall)
      // Overall = controls score at 100% weight = 75%
      expect(screen.getAllByText('75%').length).toBeGreaterThanOrEqual(2) // Overall + Controls
      expect(screen.getAllByText('0%').length).toBeGreaterThanOrEqual(1) // Technical + Assessment (no backend)
    })

    it('Renders the Article 21 coverage map', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      expect(screen.getByText('overview.coverageMap')).toBeInTheDocument()
    })

    it('Renders the top 5 critical gaps section', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      expect(screen.getByText('overview.topGaps')).toBeInTheDocument()
    })

    it('Quick action buttons are present and visible', () => {
      render(
        <TooltipPrimitive.Provider>
          <BrowserRouter>
            <NIS2Overview />
          </BrowserRouter>
        </TooltipPrimitive.Provider>
      )
      expect(screen.getByText('overview.manageControls')).toBeInTheDocument()
      expect(screen.getByText('overview.peopleTasksTitle')).toBeInTheDocument()
      expect(screen.getByText('overview.technicalScan')).toBeInTheDocument()
    })
  })

  describe('Employee Task Pages', () => {
    it('/task/invalid-task renders the error page', () => {
      render(<TaskNotFound />)
      expect(screen.getByText('Task Not Found')).toBeInTheDocument()
    })

    it('TaskShell renders the Konforme logo', () => {
      render(
        <TaskShell companyName="Test Company" totalSteps={4} currentStep={1}>
          <div>Test Content</div>
        </TaskShell>
      )
      expect(screen.getAllByText('Konforme').length).toBeGreaterThan(0)
    })

    it('TaskShell renders the company name', () => {
      render(
        <TaskShell companyName="Test Company" totalSteps={4} currentStep={1}>
          <div>Test Content</div>
        </TaskShell>
      )
      expect(screen.getByText('Test Company')).toBeInTheDocument()
    })

    it('TaskShell renders the progress bar', () => {
      const { container } = render(
        <TaskShell companyName="Test Company" totalSteps={4} currentStep={2}>
          <div>Test Content</div>
        </TaskShell>
      )
      // Progress bar should be present (it's a div with specific width)
      const progressBar = container.querySelector('[style*="width"]')
      expect(progressBar).toBeInTheDocument()
    })
  })
})
