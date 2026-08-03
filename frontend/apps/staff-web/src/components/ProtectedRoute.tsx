import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = useAuthStore((s) => s.token)
  const primaryRole = useAuthStore((s) => s.primaryRole)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && primaryRole && !allowedRoles.includes(primaryRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
