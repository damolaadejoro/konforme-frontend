import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVerification?: boolean
}

export default function ProtectedRoute({ children, requireVerification = true }: ProtectedRouteProps) {
  const { isAuthenticated, emailVerified, loading } = useAuth()

  // Wait for session verification before rendering protected content
  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect unverified users to verification pending page
  if (requireVerification && !emailVerified) {
    return <Navigate to="/verify-pending" replace />
  }

  return <>{children}</>
}
