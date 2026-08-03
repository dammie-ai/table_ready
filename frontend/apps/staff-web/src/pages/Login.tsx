import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
      setAuth(res.token, res.user)
      navigate('/staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
          <p className="text-sm text-[#6b7280] mt-1">Staff Gateway</p>
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <div className="mb-4">
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none focus:border-[#f97316]/50 transition-colors"
            placeholder="Enter your username"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1c1c27] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280]/50 outline-none focus:border-[#f97316]/50 transition-colors"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#f97316] text-white py-3 rounded-xl font-semibold hover:bg-[#f97316]/85 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
        </button>
        <p className="text-[10px] text-[#6b7280]/50 mt-6 text-center font-mono">
          Demo: manager_test / waiter_test / kitchen_test / delivery_test
        </p>
      </form>
    </div>
  )
}
