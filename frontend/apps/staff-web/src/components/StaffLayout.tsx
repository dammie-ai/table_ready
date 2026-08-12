import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../hooks/useTheme'
import { LayoutDashboard, UtensilsCrossed, Users, Calendar, ClipboardList, Settings, BarChart3, Tag, LogOut, Menu, X, ChevronDown, Check } from 'lucide-react'

interface StaffLayoutProps {
  children: React.ReactNode
}

const ROLE_HOME: Record<string, string> = {
  manager: '/staff',
  admin: '/staff',
  assistant_manager: '/staff',
  kitchen: '/kitchen',
  waiter: '/waiter',
  delivery: '/delivery',
  other: '/staff',
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const primaryRole = useAuthStore((s) => s.primaryRole)
  const user = useAuthStore((s) => s.user)
  const switchRole = useAuthStore((s) => s.switchRole)
  const { theme } = useTheme()
  const { t } = useTranslation()
  const ROLE_LABELS: Record<string, string> = {
    manager: t('roles.manager'),
    admin: t('roles.admin'),
    assistant_manager: t('roles.assistant_manager'),
    kitchen: t('roles.kitchen'),
    waiter: t('roles.waiter'),
    delivery: t('roles.delivery'),
    other: t('roles.other'),
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSwitchRole = (role: string) => {
    switchRole(role)
    setRoleMenuOpen(false)
    navigate(ROLE_HOME[role] || '/staff')
  }

  const isActive = (path: string) => location.pathname === path

  const managerNavItems = [
    { path: '/staff', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/menu-management', label: t('nav.menu'), icon: UtensilsCrossed },
    { path: '/combo-management', label: t('nav.combos'), icon: UtensilsCrossed },
    { path: '/modifier-management', label: t('nav.modifiers'), icon: UtensilsCrossed },
    { path: '/reservations', label: t('nav.reservations'), icon: Calendar },
    { path: '/waitlist', label: t('nav.waitlist'), icon: ClipboardList },
    { path: '/delivery', label: t('nav.deliveryQueue'), icon: ClipboardList },
    { path: '/staff-management', label: t('nav.staff'), icon: Users },
    { path: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { path: '/promotions', label: t('nav.promotions'), icon: Tag },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ]

  const kitchenNavItems = [
    { path: '/kitchen', label: t('nav.kitchenDisplay'), icon: UtensilsCrossed },
  ]

  const waiterNavItems = [
    { path: '/waiter', label: t('nav.floorMap'), icon: LayoutDashboard },
    { path: '/reservations', label: t('nav.reservations'), icon: Calendar },
    { path: '/waitlist', label: t('nav.waitlist'), icon: ClipboardList },
  ]

  const deliveryNavItems = [
    { path: '/delivery', label: t('nav.deliveryQueue'), icon: ClipboardList },
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

        {user && user.roles.length > 1 && (
          <div className="relative px-3 pt-3">
            <button
              onClick={() => setRoleMenuOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm font-medium text-[#f1f5f9] hover:bg-white/8 transition-colors"
            >
              <span>{t('layout.viewingAs')} <span className="text-[#f97316]">{ROLE_LABELS[primaryRole || ''] || primaryRole}</span></span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {roleMenuOpen && (
              <div className="absolute left-3 right-3 mt-1 bg-[#1c1c27] border border-white/8 rounded-xl overflow-hidden z-10 shadow-xl">
                {user.roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleSwitchRole(role)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  >
                    <span className={role === primaryRole ? 'text-[#f97316] font-medium' : 'text-[#f1f5f9]'}>
                      {ROLE_LABELS[role] || role}
                    </span>
                    {role === primaryRole && <Check className="w-4 h-4 text-[#f97316]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
            {t('layout.signOut')}
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
