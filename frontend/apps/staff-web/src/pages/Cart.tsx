import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'

export default function Cart() {
  const [instructions, setInstructions] = useState<Record<number, string>>({})
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore((s) => s.total())
  const navigate = useNavigate()

  const handleCheckout = () => {
    if (items.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <button
            onClick={() => navigate('/menu')}
            className="text-blue-600 hover:underline"
          >
            Browse Menu
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map((item) => {
              if (item.combo_id) {
                return (
                  <div key={`${item.combo_id}-${item.combo_main?.menu_item_id}`} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{item.name}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Combo Deal</p>
                      </div>
                      <button
                        onClick={() => item.combo_main && removeItem(item.combo_main.menu_item_id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {item.combo_main && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Main</p>
                        <div className="flex justify-between">
                          <span className="font-medium">{item.combo_main.name}</span>
                          <span>${item.combo_main.base_price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {item.combo_sides && item.combo_sides.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600 uppercase tracking-wide mb-1">Sides</p>
                        {item.combo_sides.map((side, idx) => (
                          <div key={idx} className="flex justify-between mb-1">
                            <span>{side.name}</span>
                            <span>${side.base_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600">Qty:</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => item.combo_main && updateQuantity(item.combo_main.menu_item_id, item.quantity - 1)}
                            className="w-8 h-8 rounded border hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => item.combo_main && updateQuantity(item.combo_main.menu_item_id, item.quantity + 1)}
                            className="w-8 h-8 rounded border hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-blue-600">
                        ${(item.base_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                <div key={item.menu_item_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-blue-600 font-medium">
                        ${item.base_price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.menu_item_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <label className="text-sm text-gray-600">Qty:</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                        className="w-8 h-8 rounded border hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                        className="w-8 h-8 rounded border hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-sm text-gray-600 block mb-1">
                      Special Instructions:
                    </label>
                    <input
                      type="text"
                      value={instructions[item.menu_item_id] || item.custom_instructions || ''}
                      onChange={(e) =>
                        setInstructions((prev) => ({
                          ...prev,
                          [item.menu_item_id]: e.target.value,
                        }))
                      }
                      placeholder="e.g., no onions, extra sauce"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheckout}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={clearCart}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  )
}
