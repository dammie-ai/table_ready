import { Link, useSearchParams } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function OrderSuccess() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { theme } = useTheme()

  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <div className="py-20">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: theme?.primary_color + '20' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme?.primary_color }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: theme?.primary_color }}>Order Placed!</h1>
        <p className="text-gray-600 mb-2">Your order has been confirmed and sent to the kitchen.</p>
        {orderId && (
          <p className="text-sm text-gray-500 mb-8">
            Order #{orderId}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          {orderId && (
            <Link
              to={`/order-tracking/${orderId}`}
              className="inline-block text-white px-6 py-3 rounded-lg hover:opacity-90"
              style={{ backgroundColor: theme?.primary_color }}
            >
              Track Order
            </Link>
          )}
          <Link
            to="/menu"
            className="inline-block border px-6 py-3 rounded-lg hover:bg-gray-50"
            style={{ borderColor: theme?.primary_color, color: theme?.primary_color }}
          >
            Order More
          </Link>
        </div>
      </div>
    </div>
  )
}
