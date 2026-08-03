import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Login from './pages/Login'
import StaffDashboard from './pages/StaffDashboard'
import KitchenDisplay from './pages/KitchenDisplay'
import WaiterDashboard from './pages/WaiterDashboard'
import DeliveryPortal from './pages/DeliveryPortal'
import ManagerPanel from './pages/ManagerPanel'
import MenuManagement from './pages/MenuManagement'
import Reservations from './pages/Reservations'
import Waitlist from './pages/Waitlist'
import StaffManagement from './pages/StaffManagement'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Promotions from './pages/Promotions'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderTracking from './pages/OrderTracking'
import OrderSuccess from './pages/OrderSuccess'
import OrderHistory from './pages/OrderHistory'
import Welcome from './pages/Welcome'
import GroupChoice from './pages/GroupChoice'
import TablePin from './pages/TablePin'
import SharedCart from './pages/SharedCart'
import ComboBuilder from './pages/ComboBuilder'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const primaryRole = useAuthStore((s) => s.primaryRole)

  return (
    <Routes>
      {/* Customer-facing routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/group-choice" element={<GroupChoice />} />
      <Route path="/table-pin" element={<TablePin />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/combos" element={<ComboBuilder />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/shared-cart" element={<SharedCart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-tracking/:id" element={<OrderTracking />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/order-history" element={<OrderHistory />} />
      
      {/* Staff routes */}
      <Route path="/login" element={<Login />} />
      
      <Route path="/staff" element={
        <ProtectedRoute>
          {primaryRole === 'kitchen' && <KitchenDisplay />}
          {primaryRole === 'waiter' && <WaiterDashboard />}
          {primaryRole === 'delivery' && <DeliveryPortal />}
          {(primaryRole === 'manager' || primaryRole === 'admin' || primaryRole === 'assistant_manager') && <ManagerPanel />}
          {primaryRole === 'other' && <StaffDashboard />}
        </ProtectedRoute>
      } />
      
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={['kitchen', 'manager', 'assistant_manager', 'waiter']}>
          <KitchenDisplay />
        </ProtectedRoute>
      } />
      
      <Route path="/waiter" element={
        <ProtectedRoute allowedRoles={['waiter']}>
          <WaiterDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/delivery" element={
        <ProtectedRoute allowedRoles={['delivery']}>
          <DeliveryPortal />
        </ProtectedRoute>
      } />
      
      <Route path="/menu-management" element={
        <ProtectedRoute allowedRoles={['manager', 'assistant_manager']}>
          <MenuManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/reservations" element={
        <ProtectedRoute allowedRoles={['manager', 'assistant_manager', 'waiter']}>
          <Reservations />
        </ProtectedRoute>
      } />
      
      <Route path="/waitlist" element={
        <ProtectedRoute allowedRoles={['manager', 'assistant_manager', 'waiter']}>
          <Waitlist />
        </ProtectedRoute>
      } />
      
      <Route path="/staff-management" element={
        <ProtectedRoute allowedRoles={['manager', 'admin', 'assistant_manager']}>
          <StaffManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute allowedRoles={['manager', 'admin', 'assistant_manager']}>
          <Settings />
        </ProtectedRoute>
      } />
      
      <Route path="/reports" element={
        <ProtectedRoute allowedRoles={['manager', 'admin', 'assistant_manager']}>
          <Reports />
        </ProtectedRoute>
      } />
      
      <Route path="/promotions" element={
        <ProtectedRoute allowedRoles={['manager', 'admin', 'assistant_manager']}>
          <Promotions />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/welcome" replace />} />
    </Routes>
  )
}
