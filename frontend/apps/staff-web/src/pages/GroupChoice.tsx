import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface GroupChoiceProps {
  onSelect?: (mode: 'individual' | 'group') => void
}

export default function GroupChoice({ onSelect }: GroupChoiceProps) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSelect = async (mode: 'individual' | 'group') => {
    setLoading(true)
    try {
      if (mode === 'group') {
        const groupCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        localStorage.setItem('tableready_group_code', groupCode)
      } else {
        localStorage.removeItem('tableready_group_code')
      }
      if (onSelect) {
        onSelect(mode)
      }
      navigate('/welcome')
    } catch (err) {
      console.error('Failed to set order mode:', err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How are you ordering?</h1>
          <p className="text-gray-600">Choose your dining style to get started</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleSelect('individual')}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">👤</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Just Me</h2>
                <p className="text-sm text-gray-600 mt-1">Ordering alone, paying alone</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleSelect('group')}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">👥</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Group Order</h2>
                <p className="text-sm text-gray-600 mt-1">Dining together, split the bill</p>
              </div>
            </div>
          </button>
        </div>

        {loading && (
          <div className="mt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}
      </div>
    </div>
  )
}
