import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../stores/cartStore'
import { useTheme } from '../hooks/useTheme'
import BillSplitter from '../components/BillSplitter'

export default function Cart() {
  const [instructions, setInstructions] = useState<Record<number, string>>({})
  const [showSplitter, setShowSplitter] = useState(false)
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const updateInstructions = useCartStore((s) => s.updateInstructions)
  const removeCartLine = useCartStore((s) => s.removeCartLine)
  const updateCartLineQuantity = useCartStore((s) => s.updateCartLineQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
  const total = useCartStore((s) => s.total())
  const navigate = useNavigate()
  const { theme } = useTheme()

  const handleCheckout = () => {
    if (items.length === 0) return
    navigate('/checkout')
  }

  const handleSplitConfirm = (_splits: { name: string; items: number[] }[]) => {
    setShowSplitter(false)
    navigate('/checkout')
  }

  if (showSplitter) {
    return <BillSplitter onConfirm={handleSplitConfirm} onCancel={() => setShowSplitter(false)} />
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Your Cart</h1>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <button
            onClick={() => navigate('/menu')}
            className="text-white px-6 py-2 rounded-lg hover:opacity-90"
            style={{ backgroundColor: theme?.primary_color }}
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
                  <div key={item.cartId} className="border rounded-lg p-4" style={{ borderColor: theme?.primary_color + '40' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: theme?.text_color }}>{item.name}</h3>
                        <p className="text-xs uppercase tracking-wide mt-1" style={{ color: theme?.primary_color }}>Combo Deal</p>
                      </div>
                      <button
                        onClick={() => removeCartLine(item.cartId)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {item.combo_main && (
                      <div className="mb-3">
                        <p className="text-sm uppercase tracking-wide mb-1" style={{ color: theme?.text_color }}>Main</p>
                        <div className="flex justify-between">
                          <span className="font-medium">{item.combo_main.name}</span>
                          <span>${item.combo_main.base_price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {item.combo_sides && item.combo_sides.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm uppercase tracking-wide mb-1" style={{ color: theme?.text_color }}>Sides</p>
                        {item.combo_sides.map((side, idx) => (
                          <div key={idx} className="flex justify-between mb-1">
                            <span>{side.name}</span>
                            <span>${side.base_price.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: theme?.primary_color + '20' }}>
                      <div className="flex items-center gap-3">
                        <label className="text-sm" style={{ color: theme?.text_color }}>Qty:</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartLineQuantity(item.cartId, item.quantity - 1)}
                            className="w-8 h-8 rounded border hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartLineQuantity(item.cartId, item.quantity + 1)}
                            className="w-8 h-8 rounded border hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className="text-xl font-bold" style={{ color: theme?.primary_color }}>
                        ${(item.base_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )
              }

              return (
                  <div key={item.menu_item_id!} className="border rounded-lg p-4" style={{ borderColor: theme?.primary_color + '40' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold" style={{ color: theme?.text_color }}>{item.name}</h3>
                      <p className="font-medium" style={{ color: theme?.primary_color }}>
                        ${item.base_price.toFixed(2)}
                      </p>
                    </div>
                      <button
                        onClick={() => removeItem(item.menu_item_id!)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <label className="text-sm" style={{ color: theme?.text_color }}>Qty:</label>
                    <div className="flex items-center gap-2">
                       <button
                         onClick={() => updateQuantity(item.menu_item_id!, item.quantity - 1)}
                         className="w-8 h-8 rounded border hover:bg-gray-100"
                       >
                         -
                       </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                       <button
                         onClick={() => updateQuantity(item.menu_item_id!, item.quantity + 1)}
                         className="w-8 h-8 rounded border hover:bg-gray-100"
                       >
                         +
                       </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-sm block mb-1" style={{ color: theme?.text_color }}>
                      Special Instructions:
                    </label>
                    <input
                      type="text"
                      value={instructions[item.menu_item_id!] || item.custom_instructions || ''}
                      onChange={(e) =>
                        setInstructions((prev) => ({
                          ...prev,
                          [item.menu_item_id!]: e.target.value,
                        }))
                      }
                      // Local state above only drove this input's own
                      // display -- updateInstructions (the store action
                      // that actually attaches this to the cart item
                      // checkout reads from) was never called, so anything
                      // typed here was silently discarded.
                      onBlur={(e) => updateInstructions(item.menu_item_id!, e.target.value)}
                      placeholder="e.g., no onions, extra sauce"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t pt-4 mb-6" style={{ borderColor: theme?.primary_color + '20' }}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold" style={{ color: theme?.text_color }}>Total:</span>
              <span className="text-2xl font-bold" style={{ color: theme?.primary_color }}>
                ${total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheckout}
              className="flex-1 text-white py-3 rounded-lg font-medium hover:opacity-90"
              style={{ backgroundColor: theme?.primary_color }}
            >
              Proceed to Checkout
            </button>
            <button
              onClick={() => setShowSplitter(true)}
              className="px-4 py-3 border border-white/8 rounded-lg hover:bg-white/5 text-sm font-medium"
            >
              Split Bill
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
