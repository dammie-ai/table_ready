import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { apiClient } from '../lib/api'
import { useCartStore } from '../stores/cartStore'

interface CheckoutFormProps {
  clientSecret: string
  orderType: string
  tableNumber: string
  deliveryAddress: string
  specialInstructions: string
  tip: number
  onSuccess: (orderId?: number) => void
}

export default function CheckoutForm({
  clientSecret,
  orderType,
  tableNumber,
  deliveryAddress,
  specialInstructions,
  tip,
  onSuccess,
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    if (!stripe || !elements) {
      setError('Stripe not loaded')
      setProcessing(false)
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card field not ready')
      setProcessing(false)
      return
    }

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
        setProcessing(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        const items = useCartStore.getState().items
        const orderItems = items.flatMap((i) => {
          if (i.combo_id && i.combo_main) {
            const comboItems = [
              {
                menu_item_id: i.combo_main.menu_item_id,
                quantity: i.quantity,
                custom_instructions: i.custom_instructions,
              },
            ]
            if (i.combo_sides) {
              i.combo_sides.forEach((side) => {
                comboItems.push({
                  menu_item_id: side.menu_item_id,
                  quantity: i.quantity,
                  custom_instructions: i.custom_instructions,
                })
              })
            }
            return comboItems
          }
          return [
            {
              menu_item_id: i.menu_item_id,
              quantity: i.quantity,
              custom_instructions: i.custom_instructions,
            },
          ]
        })

        const orderRes = await apiClient.post<{ order: { master_order_id: number } }>('/orders', {
          order_type: orderType,
          table_number: tableNumber ? Number(tableNumber) : undefined,
          items: orderItems,
          notes: [specialInstructions, deliveryAddress ? `Delivery: ${deliveryAddress}` : null].filter(Boolean).join('\n') || undefined,
          // Same fix as Checkout.tsx: createOrder's schema only recognizes
          // tip_amount, not tip_value -- the tip was silently dropped.
          tip_amount: tip || undefined,
          idempotency_key: `checkout-${Date.now()}`,
        })
        const createdOrderId = orderRes.order.master_order_id

        await apiClient.post('/payments/confirm', {
          paymentIntentId: paymentIntent.id,
          orderId: createdOrderId,
        })

        onSuccess(createdOrderId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Card Details</label>
        <div className="border rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#f1f5f9',
                  '::placeholder': { color: '#6b7280' },
                },
              },
            }}
          />
          <p className="text-sm text-gray-500 mt-2">
            Test card: 4242 4242 4242 4242 • Any future expiry • Any CVC
          </p>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        {processing ? 'Processing...' : `Pay $${useCartStore.getState().total().toFixed(2)}`}
      </button>
    </form>
  )
}
