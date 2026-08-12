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

const stripePromise = loadStripe((import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '')

// Read lazily inside useState initializers (not as a module-level const) —
// every page is statically imported up front in App.tsx, so a module-level
// read would run once at app boot, before the customer has ever verified a
// table PIN, and stay stale for the whole session.
const getVerifiedTableNumber = () =>
  typeof window !== 'undefined' ? localStorage.getItem('tableready_table_number') || '' : ''

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState('')
  const [verifiedTableNumber] = useState(getVerifiedTableNumber)
  const [orderType, setOrderType] = useState<'PICKUP' | 'DELIVERY' | 'DINE_IN'>(() =>
    getVerifiedTableNumber() ? 'DINE_IN' : 'PICKUP'
  )
  const [tableNumber, setTableNumber] = useState(getVerifiedTableNumber)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [tip, setTip] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [placingCashOrder, setPlacingCashOrder] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<CheckoutStep>('details')
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total())
  const clearCart = useCartStore((s) => s.clearCart)
  const navigate = useNavigate()
  const { theme } = useTheme()

  const subtotal = total
  const tax = subtotal * 0.08
  const finalTotal = subtotal + tax + tip

  useEffect(() => {
    // Guards against landing on /checkout directly with nothing in the cart
    // (e.g. a stale URL or back-button). Intentionally mount-only: it must
    // NOT re-fire when handleSuccess empties the cart after a successful
    // purchase, which would hijack the post-purchase redirect back to /cart.
    if (items.length === 0) {
      navigate('/cart')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const needsLocationCheck = orderType === 'DELIVERY' || orderType === 'DINE_IN'

  const handleCreateIntent = async () => {
    setError('')

    try {
      const res = await apiClient.post<{ clientSecret: string }>('/payments/create-intent', {
        amount: Math.round(finalTotal * 100),
        currency: 'usd',
      })
      setClientSecret(res.clientSecret)
      setStep('payment')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment')
    }
  }

  const handleSuccess = (createdOrderId?: number) => {
    if (createdOrderId) {
      // Guest ordering has no account/customer_id -- Order History reads this
      // locally-persisted list of order IDs instead, one per completed order.
      try {
        const raw = localStorage.getItem('tableready_order_history')
        const ids: number[] = raw ? JSON.parse(raw) : []
        const updated = [createdOrderId, ...ids.filter((id) => id !== createdOrderId)].slice(0, 20)
        localStorage.setItem('tableready_order_history', JSON.stringify(updated))
      } catch {
        // Non-critical -- worst case this order is missing from history.
      }
    }
    // Navigate away first — clearing the cart while still on /checkout would
    // trigger the empty-cart redirect effect above and hijack this navigation.
    if (createdOrderId) {
      navigate(`/order-tracking/${createdOrderId}`)
    } else {
      navigate('/order-success')
    }
    clearCart()
  }

  const buildOrderItems = () =>
    items.flatMap((i) => {
      if (i.combo_id && i.combo_main) {
        const comboItems = [
          { menu_item_id: i.combo_main.menu_item_id, quantity: i.quantity, custom_instructions: i.custom_instructions },
        ]
        if (i.combo_sides) {
          i.combo_sides.forEach((side) => {
            comboItems.push({ menu_item_id: side.menu_item_id, quantity: i.quantity, custom_instructions: i.custom_instructions })
          })
        }
        return comboItems
      }
      return [{ menu_item_id: i.menu_item_id, quantity: i.quantity, custom_instructions: i.custom_instructions }]
    })

  const handleCashOrder = async () => {
    setError('')
    setPlacingCashOrder(true)
    try {
      const orderRes = await apiClient.post<{ order: { master_order_id: number } }>('/orders', {
        order_type: orderType,
        table_number: tableNumber ? Number(tableNumber) : undefined,
        items: buildOrderItems(),
        notes: [specialInstructions, deliveryAddress ? `Delivery: ${deliveryAddress}` : null].filter(Boolean).join('\n') || undefined,
        // createOrder's schema/controller only ever recognized tip_amount --
        // this sent tip_value, an unrecognized key zod silently strips, so
        // every order's tip persisted as $0 regardless of what was shown
        // to the customer.
        tip_amount: tip || undefined,
        payment_method: 'cash',
        idempotency_key: `checkout-cash-${Date.now()}`,
      })
      handleSuccess(orderRes.order.master_order_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setPlacingCashOrder(false)
    }
  }

  const proceedToPayment = () => {
    if (paymentMethod === 'cash') {
      handleCashOrder()
    } else {
      handleCreateIntent()
    }
  }

  const handleLocationVerified = (locationValid: boolean) => {
    if (locationValid) {
      if (paymentMethod === 'cash') {
        handleCashOrder()
      } else {
        setStep('payment')
        handleCreateIntent()
      }
    }
  }

  if (step === 'location' && needsLocationCheck) {
    return (
      <LocationCheck
        orderType={orderType}
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
              {(['PICKUP', 'DELIVERY', 'DINE_IN'] as const).map((type) => (
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

          {orderType === 'DINE_IN' && (
            <div>
              <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Table Number</h2>
              {verifiedTableNumber ? (
                <div className="w-full border rounded-lg px-4 py-2 bg-green-50 border-green-200 text-green-800 text-sm">
                  Table {verifiedTableNumber} — confirmed via your table PIN
                </div>
              ) : (
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter table number"
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              )}
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

          <div>
            <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Payment Method</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['card', 'cash'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === method ? 'border-2' : 'border border-gray-200 hover:border-gray-300'
                  }`}
                  style={paymentMethod === method ? { borderColor: theme?.primary_color, backgroundColor: theme?.primary_color + '15' } : undefined}
                >
                  <span style={{ color: paymentMethod === method ? theme?.primary_color : theme?.text_color }}>
                    {method === 'card' ? 'Card' : 'Cash'}
                  </span>
                </button>
              ))}
            </div>
            {paymentMethod === 'cash' && (
              <p className="text-sm text-[#6b7280] mt-2">You'll pay in person when your order is ready.</p>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3" style={{ color: theme?.text_color }}>Tip</h2>
            <div className="flex gap-2">
              {[0, 5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTip(pct === 0 ? 0 : subtotal * (pct / 100))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    tip === (pct === 0 ? 0 : subtotal * (pct / 100))
                      ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]'
                      : 'border-white/8 text-[#6b7280]'
                  }`}
                >
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: theme?.primary_color + '20' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#6b7280]">Subtotal</span>
              <span className="text-sm" style={{ color: theme?.text_color }}>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#6b7280]">Tax</span>
              <span className="text-sm" style={{ color: theme?.text_color }}>${tax.toFixed(2)}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-[#6b7280]">Tip</span>
                <span className="text-sm" style={{ color: theme?.text_color }}>${tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold" style={{ color: theme?.text_color }}>Total:</span>
              <span className="text-2xl font-bold" style={{ color: theme?.primary_color }}>${finalTotal.toFixed(2)}</span>
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={() => {
                if (needsLocationCheck) {
                  setStep('location')
                } else {
                  proceedToPayment()
                }
              }}
              disabled={placingCashOrder}
              className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme?.primary_color }}
            >
              {placingCashOrder
                ? 'Placing order...'
                : needsLocationCheck
                ? 'Continue to Location Check'
                : paymentMethod === 'cash'
                ? 'Place Order — Pay with Cash'
                : 'Continue to Payment'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const options = {
    clientSecret,
    appearance: { theme: 'stripe' as const },
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Payment</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm
            clientSecret={clientSecret}
            orderType={orderType}
            tableNumber={tableNumber}
            deliveryAddress={deliveryAddress}
            specialInstructions={specialInstructions}
            tip={tip}
            onSuccess={handleSuccess}
          />
        </Elements>
      )}
    </div>
  )
}
