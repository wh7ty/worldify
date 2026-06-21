import { Navigate } from 'react-router-dom'
import { useWorldStore } from '../../store/useWorldStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authReady = useWorldStore((state) => state.authReady)
  const isAuthenticated = useWorldStore((state) => state.isAuthenticated)

  if (!authReady) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
