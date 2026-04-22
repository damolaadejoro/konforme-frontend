import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

global.localStorage = localStorageMock as any

// Mock API module — useControls fetches from the backend but tests run without one
vi.mock('../services/api', () => ({
  getBaseControls: vi.fn().mockResolvedValue([]),
  getControlStates: vi.fn().mockResolvedValue([]),
  bulkUpsertControls: vi.fn().mockResolvedValue([]),
  updateControlState: vi.fn().mockResolvedValue({}),
  getCampaigns: vi.fn().mockResolvedValue([]),
  createCampaignApi: vi.fn().mockResolvedValue({ id: 'mock', tasks: [] }),
  updateCampaignTask: vi.fn().mockResolvedValue({}),
  getCountryControls: vi.fn().mockResolvedValue([]),
  getCountryAssessmentQuestions: vi.fn().mockResolvedValue([]),
}))

// Reset localStorage mock before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
