import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import { RefreshCw } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    logout()
  }, [logout])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await apiClient.post<{ token: string; user: { id: number; username: string; roles: string[] } }>('/auth/login', {
        username,
        password,
      })
      // /staff already picks the right dashboard from primaryRole (which
      // setAuth derives with manager/admin taking priority over kitchen/
      // waiter/delivery) — no need to duplicate that priority logic here,
      // and doing so previously sent multi-role managers to Kitchen first.
      setAuth(res.token, res.user)
      navigate('/staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (user: string, pass: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post<{ token: string; user: { id: number; username: string; roles: string[] } }>('/auth/login', {
        username: user,
        password: pass,
      })
      setAuth(res.token, res.user)
      navigate('/staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
      <form onSubmit={handleSubmit} className="bg-[#111118] border border-white/8 p-8 rounded-2xl w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#f97316]/15 border border-[#f97316]/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-[#f97316] font-bold text-xl">T</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">TableReady</h1>
          <p className="text-sm text-[#6b7280] mt-1">{t('login.subtitle')}</p>
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <div className="mb-4">
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">{t('login.username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none focus:border-[#f97316]/50 transition-colors"
            placeholder={t('login.usernamePlaceholder')}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">{t('login.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none focus:border-[#f97316]/50 transition-colors"
            placeholder={t('login.passwordPlaceholder')}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t('login.signingIn')}</> : t('login.signIn')}
        </button>

        <div className="mt-6 pt-6 border-t border-white/8">
          <p className="text-xs text-[#6b7280] mb-3 text-center">{t('login.quickLogin')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLogin('manager_test', 'password123')}
              disabled={loading}
              className="px-3 py-2 bg-[#1c1c27] border border-white/8 rounded-lg text-xs text-[#f1f5f9] hover:border-[#f97316]/50 transition-colors disabled:opacity-40"
            >
              {t('login.manager')}
            </button>
            <button
              type="button"
              onClick={() => quickLogin('kitchen_test', 'password123')}
              disabled={loading}
              className="px-3 py-2 bg-[#1c1c27] border border-white/8 rounded-lg text-xs text-[#f1f5f9] hover:border-[#f97316]/50 transition-colors disabled:opacity-40"
            >
              {t('login.kitchen')}
            </button>
            <button
              type="button"
              onClick={() => quickLogin('waiter_test', 'password123')}
              disabled={loading}
              className="px-3 py-2 bg-[#1c1c27] border border-white/8 rounded-lg text-xs text-[#f1f5f9] hover:border-[#f97316]/50 transition-colors disabled:opacity-40"
            >
              {t('login.waiter')}
            </button>
            <button
              type="button"
              onClick={() => quickLogin('delivery_test', 'password123')}
              disabled={loading}
              className="px-3 py-2 bg-[#1c1c27] border border-white/8 rounded-lg text-xs text-[#f1f5f9] hover:border-[#f97316]/50 transition-colors disabled:opacity-40"
            >
              {t('login.delivery')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
