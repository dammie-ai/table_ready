import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { apiClient } from '../lib/api'
import { useCartStore } from '../stores/cartStore'
import { useTheme } from '../hooks/useTheme'
import CheckoutForm from '../components/CheckoutForm'
import LocationCheck from '../pages/LocationCheck'

type CheckoutStep = 'details' | 'location' | 'payment'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState('')
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY' | 'IN_HOUSE' | 'DINE_IN'>('PICKUP')
  const [tableNumber, setTableNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState<number | null>(null)
  const [step, setStep] = useState<CheckoutStep>('details')
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const clearCart = useCartStore((s) => s.clearCart)
  const navigate = useNavigate()
  const { theme } = useTheme()

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  const needsLocationCheck = orderType === 'DELIVERY' || orderType === 'IN_HOUSE' || orderType === 'DINE_IN'

  const handleCreateIntent = async () => {
    setError('')

    try {
      const res = await apiClient.post<{ clientSecret: string }>('/payments/create-intent', {
        amount: Math.round(total * 100),
        currency: 'usd',
      })
      setClientSecret(res.clientSecret)
      setStep('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment')
    }
  }

  const handleSuccess = (createdOrderId?: number) => {
    clearCart()
    if (createdOrderId) {
      navigate(`/order-tracking/${createdOrderId}`)
    } else {
      navigate('/order-success')
    }
  }

  const handleLocationVerified = (locationValid: boolean) => {
    if (locationValid) {
      setStep('payment')
      handleCreateIntent()
    }
  }

  if (step === 'location' && needsLocationCheck) {
    return (
      <LocationCheck
        orderType={orderType}
        tableNumber={tableNumber}
        deliveryAddress={deliveryAddress}
        specialInstructions={specialInstructions}
        onLocationVerified={handleLocationVerified}
        onBack={() => setStep('details')}
      />
    )
  }

  if (!clientSecret || step !== 'payment') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Checkout</h1>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Order Type</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['PICKUP', 'DELIVERY', 'IN_HOUSE', 'DINE_IN'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    orderType === type
                      ? 'border-2'
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  style={orderType === type ? { borderColor: theme?.primary_color, backgroundColor: theme?.primary_color + '15' } : undefined}
                >
                  <span style={{ color: orderType === type ? theme?.primary_color : theme?.text_color }}>{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          </div>

          {(orderType === 'IN_HOUSE' || orderType === 'DINE_IN') && (
            <div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Table Number</h2>
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
              <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Delivery Address</h2>
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
            <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Special Instructions</h2>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests?"
              className="w-full border rounded-lg px-4 py-2"
              rows={3}
            />
          </div>

          <div className="border-t pt-4" style={{ borderColor: theme?.primary_color + '20' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold" style={{ color: theme?.text_color }}>Total:</span>
              <span className="text-2xl font-bold" style={{ color: theme?.primary_color }}>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setStep('location')}
              className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90"
              style={{ backgroundColor: theme?.primary_color }}
            >
              Continue to Location Check
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
      <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Payment</h1>
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
