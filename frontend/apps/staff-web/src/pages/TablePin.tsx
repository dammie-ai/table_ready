import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../lib/api'

export default function TablePin() {
  const [searchParams] = useSearchParams()
  const [pin, setPin] = useState(() => searchParams.get('code') || '')
  const [tableNumber, setTableNumber] = useState(() => searchParams.get('table') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoVerifying, setAutoVerifying] = useState(false)
  const navigate = useNavigate()

  const verify = useCallback(async (tableNum: string, code: string) => {
    setLoading(true)
    setError('')

    try {
      const res = await apiClient.post<{ success: boolean; table_id: number; message: string; waiter_name: string | null }>('/tables/verify-code', {
        table_number: Number(tableNum),
        code,
      })

      if (res.success) {
        localStorage.setItem('tableready_table_id', String(res.table_id))
        localStorage.setItem('tableready_table_number', tableNum)
        if (res.waiter_name) {
          localStorage.setItem('tableready_waiter_name', res.waiter_name)
        } else {
          localStorage.removeItem('tableready_waiter_name')
        }
        navigate('/menu?mode=dine-in')
      } else {
        setError(res.message || 'Invalid PIN')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // A table's QR code just encodes this page's URL with ?table=&code= already
  // filled in — scanning it (with any camera app, no in-app scanner needed)
  // skips manual PIN entry entirely.
  useEffect(() => {
    const qrTable = searchParams.get('table')
    const qrCode = searchParams.get('code')
    if (qrTable && qrCode && qrCode.length === 4) {
      setAutoVerifying(true)
      verify(qrTable, qrCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await verify(tableNumber, pin)
  }

  if (autoVerifying && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <h1 className="text-xl font-bold text-gray-900 mb-1">Table {tableNumber} scanned</h1>
          <p className="text-sm text-gray-600">Seating you now...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Table PIN</h1>
          <p className="text-sm text-gray-600">Ask your server for the 4-digit table code</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <p className="text-red-600 text-sm text-center">{error}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs text-gray-500 uppercase tracking-widest font-mono mb-1.5">Table Number</label>
          <input
            type="number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="e.g. 5"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest mb-4"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs text-gray-500 uppercase tracking-widest font-mono mb-1.5">4-Digit PIN</label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono"
            maxLength={4}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || pin.length !== 4}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {loading ? 'Verifying...' : 'Start Ordering'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
        >
          Back
        </button>
      </form>
    </div>
  )
}
