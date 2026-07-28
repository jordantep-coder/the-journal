import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppNav from './AppNav'

export default function ProtectedRoute({ children, mentorOnly = false }) {
  const { loading, isAuthenticated, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--muted)' }}>Loading…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (mentorOnly && profile.role !== 'mentor') {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  )
}
