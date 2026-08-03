import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../hooks/useTheme'
import { LayoutDashboard, UtensilsCrossed, Users, Calendar, ClipboardList, Settings, BarChart3, Tag, LogOut, Menu, X } from 'lucide-react'

interface StaffLayoutProps {
  children: React.ReactNode
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const primaryRole = useAuthStore((s) => s.primaryRole)
  const { theme } = useTheme()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  const managerNavItems = [
    { path: '/staff', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/menu-management', label: 'Menu', icon: UtensilsCrossed },
    { path: '/reservations', label: 'Reservations', icon: Calendar },
    { path: '/waitlist', label: 'Waitlist', icon: ClipboardList },
    { path: '/staff-management', label: 'Staff', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/promotions', label: 'Promotions', icon: Tag },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  const kitchenNavItems = [
    { path: '/kitchen', label: 'Kitchen Display', icon: UtensilsCrossed },
  ]

  const waiterNavItems = [
    { path: '/waiter', label: 'Floor Map', icon: LayoutDashboard },
    { path: '/reservations', label: 'Reservations', icon: Calendar },
    { path: '/waitlist', label: 'Waitlist', icon: ClipboardList },
  ]

  const deliveryNavItems = [
    { path: '/delivery', label: 'Delivery Queue', icon: ClipboardList },
  ]

  const getNavItems = () => {
    switch (primaryRole) {
      case 'kitchen': return kitchenNavItems
      case 'waiter': return waiterNavItems
      case 'delivery': return deliveryNavItems
      default: return managerNavItems
    }
  }

  const navItems = getNavItems()

  return (
    <div className="min-h-screen bg-[#09090f] text-[#f1f5f9] flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-[#111118] border-r border-white/8 transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-0
      `}>
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#f97316]/15 border border-[#f97316]/30 flex items-center justify-center">
              <span className="text-[#f97316] font-bold text-sm">T</span>
            </div>
            <span className="font-display font-bold text-sm tracking-widest uppercase text-[#f97316]">TableReady</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#6b7280] hover:text-[#f1f5f9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-[#f97316]/15 text-[#f97316]'
                    : 'text-[#6b7280] hover:text-[#f1f5f9] hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/8">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/8 bg-[#09090f]/95 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#f1f5f9]"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-display font-bold text-sm tracking-widest uppercase text-[#f97316]">TableReady</span>
          <div className="w-6" />
        </div>

        {children}
      </main>
    </div>
  )
}
