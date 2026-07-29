import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
