import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '../lib/api'

// Browsers ship no window.BarcodeDetector types yet — declare just enough
// of the shape this file uses.
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
declare global {
  interface Window {
    BarcodeDetector?: { new (options: { formats: string[] }): BarcodeDetectorLike }
  }
}

export default function TablePin() {
  const [searchParams] = useSearchParams()
  const [pin, setPin] = useState(() => searchParams.get('code') || '')
  const [tableNumber, setTableNumber] = useState(() => searchParams.get('table') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoVerifying, setAutoVerifying] = useState(false)
  const [mode, setMode] = useState<'scan' | 'manual'>(() =>
    searchParams.get('table') && searchParams.get('code') ? 'manual' : 'scan'
  )
  const [scanError, setScanError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pollRef = useRef<number | null>(null)
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

  // Live in-browser camera scan, for when a customer opens this page
  // directly (e.g. "Dine In" from the welcome flow) rather than scanning
  // the table's QR with their phone's own camera app. Uses the native
  // BarcodeDetector API — no extra dependency — and falls back to manual
  // entry on unsupported browsers (notably Safari/iOS) or a denied
  // permission prompt.
  useEffect(() => {
    if (mode !== 'scan' || autoVerifying) return

    let cancelled = false

    const start = async () => {
      if (!window.BarcodeDetector) {
        setScanError("Your browser doesn't support in-page QR scanning — enter your table PIN manually below.")
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        pollRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              const raw = codes[0].rawValue
              try {
                const url = new URL(raw)
                const qrTable = url.searchParams.get('table')
                const qrCode = url.searchParams.get('code')
                if (qrTable && qrCode && qrCode.length === 4) {
                  setAutoVerifying(true)
                  verify(qrTable, qrCode)
                }
              } catch {
                // Not a URL we recognize — ignore and keep scanning.
              }
            }
          } catch {
            // Transient detection error — ignore and keep scanning.
          }
        }, 400)
      } catch (err) {
        setScanError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera access was denied — enter your table PIN manually below.'
            : "Couldn't access the camera — enter your table PIN manually below."
        )
      }
    }

    start()

    return () => {
      cancelled = true
      if (pollRef.current) window.clearInterval(pollRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoVerifying])

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

  if (mode === 'scan') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Scan Table QR Code</h1>
            <p className="text-sm text-gray-600">Point your camera at the QR code on your table</p>
          </div>

          {scanError ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-700 text-sm text-center">{scanError}</p>
            </div>
          ) : (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-900 mb-4">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-4 border-white/60 rounded-2xl pointer-events-none" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode('manual')}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            Enter PIN Manually
          </button>
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            className="w-full mt-3 text-gray-500 text-sm hover:text-gray-700"
          >
            Back
          </button>
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
          onClick={() => { setScanError(''); setMode('scan') }}
          className="w-full mt-3 text-blue-600 text-sm font-medium hover:text-blue-700"
        >
          Scan QR Code Instead
        </button>
        <button
          type="button"
          onClick={() => navigate('/welcome')}
          className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
        >
          Back
        </button>
      </form>
    </div>
  )
}
