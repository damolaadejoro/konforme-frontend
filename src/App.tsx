import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import AssessmentLayout from './components/layout/AssessmentLayout'
import ScanLayout from './components/layout/ScanLayout'
import NIS2Overview from './pages/NIS2Overview'
import ControlsLibrary from './pages/ControlsLibrary'
import PeopleTasks from './pages/PeopleTasks'
import PeopleTasksLayout from './components/layout/PeopleTasksLayout'
import ContinuousCompliance from './pages/ContinuousCompliance'
import MyTasks from './pages/MyTasks'
import TaskHistory from './pages/TaskHistory'
import Scan from './pages/Scan'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import EmployeeTaskPage from './pages/EmployeeTaskPage'
import Assessment from './pages/Assessment'
import AssessmentHistory from './pages/AssessmentHistory'
import Remediation from './pages/Remediation'
import HumanFactor from './pages/HumanFactor'
import HumanFactorResults from './pages/HumanFactorResults'
import OrganizationalAssessment from './pages/OrganizationalAssessment'
import OrganizationalResults from './pages/OrganizationalResults'
import Findings from './pages/Findings'
import Login from './pages/Login'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import GetStarted from './pages/GetStarted'
import VerifyEmail from './pages/VerifyEmail'
import VerifyPending from './pages/VerifyPending'
import AcceptInvite from './pages/AcceptInvite'
import Team from './pages/Team'
import TaskComplete from './pages/TaskComplete'
import Scope from './pages/Scope'
import EvidenceLibrary from './pages/EvidenceLibrary'
import ActivityLog from './pages/ActivityLog'
import DevComponents from './pages/dev/Components'

export default function App() {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />

          {/* Email verification pending - no sidebar, no verification required */}
          <Route path="/verify-pending" element={
            <ProtectedRoute requireVerification={false}>
              <VerifyPending />
            </ProtectedRoute>
          } />

          {/* Post-registration onboarding - no sidebar */}
          <Route path="/get-started" element={<ProtectedRoute><GetStarted /></ProtectedRoute>} />

          {/* Employee task pages - no layout wrapper (separate experience) */}
          <Route path="/task/complete/:token" element={<TaskComplete />} />
          <Route path="/task/:taskId" element={<EmployeeTaskPage />} />

          {/* Admin dashboard routes - protected */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<NIS2Overview />} />
            <Route path="scope" element={<Scope />} />
            <Route path="controls" element={<ControlsLibrary />} />

            {/* Assessment with tabs */}
            <Route path="assessment" element={<AssessmentLayout />}>
              <Route index element={<Assessment />} />
              <Route path="organizational" element={<OrganizationalAssessment />} />
              <Route path="human-factor" element={<HumanFactor />} />
              <Route path="history" element={<AssessmentHistory />} />
            </Route>

            {/* Results pages — standalone (no tabs) */}
            <Route path="human-factor/results" element={<HumanFactorResults />} />
            <Route path="organizational/results" element={<OrganizationalResults />} />

            {/* Scan with tabs */}
            <Route path="scan" element={<ScanLayout />}>
              <Route index element={<Scan />} />
              <Route path="findings" element={<Findings />} />
            </Route>

            <Route path="remediation" element={<Remediation />} />
            <Route path="people-tasks" element={<PeopleTasksLayout />}>
              <Route index element={<PeopleTasks />} />
              <Route path="continuous" element={<ContinuousCompliance />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="history" element={<TaskHistory />} />
            </Route>
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="team" element={<Team />} />
            <Route path="evidence" element={<EvidenceLibrary />} />
            <Route path="activity" element={<ActivityLog />} />
            <Route path="dev/components" element={<DevComponents />} />

            {/* Backwards-compat redirects */}
            <Route path="human-factor" element={<Navigate to="/assessment/human-factor" replace />} />
            <Route path="organizational" element={<Navigate to="/assessment/organizational" replace />} />
            <Route path="findings" element={<Navigate to="/scan/findings" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </TooltipPrimitive.Provider>
  )
}
