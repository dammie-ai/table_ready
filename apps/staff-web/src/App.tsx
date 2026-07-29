import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import StaffDashboard from './pages/StaffDashboard'
import KitchenDisplay from './pages/KitchenDisplay'
import MenuManagement from './pages/MenuManagement'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.user?.role)

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          {role === 'kitchen' ? <KitchenDisplay /> : <StaffDashboard />}
        </ProtectedRoute>
      } />
      
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={['kitchen', 'manager', 'assistant_manager']}>
          <KitchenDisplay />
        </ProtectedRoute>
      } />
      
      <Route path="/menu-management" element={
        <ProtectedRoute allowedRoles={['manager', 'assistant_manager']}>
          <MenuManagement />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
