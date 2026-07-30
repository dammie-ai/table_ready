import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { apiClient } from '../lib/api'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import CheckoutForm from '../components/CheckoutForm'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState('')
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY' | 'IN_HOUSE' | 'DINE_IN'>('PICKUP')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [error, setError] = useState('')
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const clearCart = useCartStore((s) => s.clearCart)
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  const handleCreateIntent = async () => {
    setError('')

    try {
      const res = await apiClient<{ clientSecret: string }>('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(total * 100),
          currency: 'usd',
        }),
      })
      setClientSecret(res.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment')
    }
  }

  const handleSuccess = () => {
    clearCart()
    navigate('/order/success')
  }

  if (!clientSecret) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Order Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['PICKUP', 'DELIVERY', 'IN_HOUSE', 'DINE_IN'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`p-4 rounded-lg border-2 ${
                    orderType === type
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {(orderType === 'IN_HOUSE' || orderType === 'DINE_IN') && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Table Number</h2>
              <input
                type="number"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Enter table number"
                className="w-full border rounded-lg px-4 py-2"
                required
              />
            </div>
          )}

          {orderType === 'DELIVERY' && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Delivery Address</h2>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
                className="w-full border rounded-lg px-4 py-2"
                rows={3}
                required
              />
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-3">Special Instructions</h2>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests?"
              className="w-full border rounded-lg px-4 py-2"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCreateIntent}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Continue to Payment
            </button>
          </div>
        </div>
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: { theme: 'stripe' },
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Payment</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm
            orderType={orderType}
            tableNumber={tableNumber}
            deliveryAddress={deliveryAddress}
            specialInstructions={specialInstructions}
            onSuccess={handleSuccess}
          />
        </Elements>
      )}
    </div>
  )
}
