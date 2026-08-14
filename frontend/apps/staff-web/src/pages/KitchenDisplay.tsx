import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { getSocket, onConnectionChange } from '../lib/socket'
import { getMenuItems, toggleMenuItemStock, updateMenuItemStockQuantity, type MenuItem } from '../lib/menuApi'

interface Order {
  master_order_id: number
  status: string
  total_amount: number
  table_number?: number
  order_type?: string
  customer_name?: string
  items: any[]
}

interface TopItem {
  item_id: number
  name: string
  total_quantity: number
  order_count: number
}

type TopItemsPeriod = 'day' | 'week' | 'month' | 'year'

// Same four windows the backend understands -- just the button labels are
// friendlier than the raw query param values.
const PERIOD_LABELS: Record<TopItemsPeriod, string> = {
  day: 'Today',
  week: 'Week',
  month: 'Month',
  year: 'Year',
}

const KITCHEN_HIDDEN_STATUSES = new Set([
  'ON_HOLD', 'CANCELLED_AND_REFUNDED', 'CANCELLED', 'COMPLETED', 'SERVED', 'PICKED_UP',
])

export default function KitchenDisplay() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'orders' | 'stock' | 'top-items'>('orders')
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [stockLoading, setStockLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [stockSearch, setStockSearch] = useState('')
  const [qtyEdits, setQtyEdits] = useState<Record<number, string>>({})
  const [savingQtyId, setSavingQtyId] = useState<number | null>(null)
  const [connected, setConnected] = useState(true)
  const [error, setError] = useState('')
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [topItemsLoading, setTopItemsLoading] = useState(false)
  const [topItemsPeriod, setTopItemsPeriod] = useState<TopItemsPeriod>('day')

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; orders: Order[] }>('/orders/kitchen-orders')
        setOrders(res.orders || [])
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    const loadMenuItems = async () => {
      try {
        const res = await getMenuItems()
        setMenuItems(res.items || [])
      } catch (err) {
        console.error('Failed to load menu items:', err)
      } finally {
        setStockLoading(false)
      }
    }

    loadOrders()
    loadMenuItems()

    // A dropped connection has no per-event replay — refetch on
    // reconnect rather than trust whatever's still on screen.
    const offConnection = onConnectionChange((isConnected) => {
      setConnected(isConnected)
      if (isConnected) {
        loadOrders()
        loadMenuItems()
      }
    })

    const socket = getSocket()
    socket.on('new_kitchen_order', (order: Order) => {
      setOrders((prev) => [order, ...prev])
    })
    socket.on('kitchen_order_updated', (data: { orderId: number; status?: string }) => {
      // Mirrors the exclusion list in GET /orders/kitchen-orders — once an
      // order reaches one of these, it's done and should disappear from
      // the live board instead of sitting there forever.
      if (data.status && KITCHEN_HIDDEN_STATUSES.has(data.status)) {
        setOrders((prev) => prev.filter((o) => o.master_order_id !== data.orderId))
        return
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.master_order_id === data.orderId ? { ...o, ...data } : o
        )
      )
    })
    socket.on('menu_item_updated', (data: { item_id: number; out_of_stock_flag?: boolean }) => {
      if (data.out_of_stock_flag === undefined) return
      setMenuItems((prev) =>
        prev.map((m) => (m.item_id === data.item_id ? { ...m, out_of_stock_flag: data.out_of_stock_flag! } : m))
      )
    })

    return () => {
      socket.off('new_kitchen_order')
      socket.off('kitchen_order_updated')
      socket.off('menu_item_updated')
      offConnection()
    }
  }, [])

  // Kept separate from the orders/menu-items load above on purpose -- this
  // one only needs to run when someone's actually looking at the Top Items
  // tab, and it re-fires whenever they flip between Today/Week/Month/Year.
  useEffect(() => {
    if (view !== 'top-items') return

    let cancelled = false
    setTopItemsLoading(true)
    apiClient
      .get<{ success: boolean; period: string; items: TopItem[] }>(`/analytics/top-items?period=${topItemsPeriod}`)
      .then((res) => {
        if (!cancelled) setTopItems(res.items || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load top items')
      })
      .finally(() => {
        if (!cancelled) setTopItemsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [view, topItemsPeriod])

  const toggleStock = async (itemId: number) => {
    setTogglingId(itemId)
    try {
      const res = await toggleMenuItemStock(itemId)
      setMenuItems((prev) => prev.map((m) => (m.item_id === itemId ? res.item : m)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle stock')
    } finally {
      setTogglingId(null)
    }
  }

  // Not part of the same PUT the manager's full menu form uses -- kitchen
  // doesn't have rights to that one, just to this one number, via its own
  // narrow endpoint (mirrors how toggleStock above is split off from the
  // full menu-item toggle for the same reason).
  const saveQuantity = async (itemId: number) => {
    const raw = qtyEdits[itemId]
    if (raw === undefined || raw.trim() === '') return
    const qty = parseInt(raw, 10)
    if (isNaN(qty) || qty < 0) {
      setError('Units left must be a non-negative number.')
      return
    }
    setSavingQtyId(itemId)
    try {
      const res = await updateMenuItemStockQuantity(itemId, qty)
      setMenuItems((prev) => prev.map((m) => (m.item_id === itemId ? res.item : m)))
      setQtyEdits((prev) => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update units left')
    } finally {
      setSavingQtyId(null)
    }
  }

  // Kitchen's chain stops at READY for every order type, full stop --
  // READY_FOR_PICKUP/PICKED_UP/OUT_FOR_DELIVERY/etc describe a customer,
  // counter staff, or driver physically taking the order, which kitchen
  // can't confirm happened. This used to let kitchen walk a PICKUP order
  // straight to PICKED_UP (skipping the counter hand-off, same class of
  // bug SERVED already covers for dine-in) and, worse, walk a DELIVERY
  // order to PICKED_UP too, bypassing the driver flow in DeliveryPortal
  // entirely. Waiter's "Pickup" tab and DeliveryPortal own everything
  // past READY for their respective types now.
  const nextStatusFor = (currentStatus: string) => {
    const flow: Record<string, string> = {
      RECEIVED: 'IN_PREPARATION',
      IN_PREPARATION: 'COOKING',
      COOKING: 'READY',
    }
    return flow[currentStatus]
  }

  const advanceStatus = async (orderId: number, currentStatus: string) => {
    const nextStatus = nextStatusFor(currentStatus)
    if (!nextStatus) return

    try {
      await apiClient.patch(`/orders/${orderId}/status`, {
        status: nextStatus,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to advance order status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white text-2xl">Loading kitchen display...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {!connected && (
        <div className="bg-red-600 text-white text-center py-2 rounded-lg mb-4 font-semibold">
          ⚠ Connection lost — reconnecting... orders may be stale until this clears.
        </div>
      )}
      {error && (
        <div className="bg-red-900/60 border border-red-600 text-red-200 text-center py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      <h1 className="text-4xl font-bold mb-6 text-center">Kitchen Display</h1>

      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => setView('orders')}
          className={`px-6 py-2 rounded-lg text-lg font-semibold ${
            view === 'orders' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setView('stock')}
          className={`px-6 py-2 rounded-lg text-lg font-semibold ${
            view === 'stock' ? 'bg-yellow-500 text-gray-900' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Stock
        </button>
        <button
          onClick={() => setView('top-items')}
          className={`px-6 py-2 rounded-lg text-lg font-semibold ${
            view === 'top-items' ? 'bg-[#f97316] text-white' : 'bg-gray-800 text-gray-300'
          }`}
        >
          Top Items
        </button>
      </div>

      {view === 'stock' ? (
        stockLoading ? (
          <p className="text-center text-gray-400 text-2xl py-20">Loading menu items...</p>
        ) : (
          <div className="max-w-6xl mx-auto">
            <input
              type="text"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Search menu items…"
              className="w-full mb-4 px-4 py-3 rounded-lg bg-gray-800 border-2 border-gray-700 text-white placeholder-gray-500 text-lg focus:outline-none focus:border-yellow-500"
            />
            {menuItems.filter((item) => item.name.toLowerCase().includes(stockSearch.trim().toLowerCase())).length === 0 && (
              <p className="text-center text-gray-400 text-lg py-10">No items match "{stockSearch}".</p>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {menuItems
              .filter((item) => item.name.toLowerCase().includes(stockSearch.trim().toLowerCase()))
              .map((item) => (
              <div
                key={item.item_id}
                className={`rounded-lg p-4 border-2 flex items-center justify-between ${
                  item.out_of_stock_flag ? 'bg-gray-800 border-red-600' : 'bg-gray-800 border-gray-700'
                }`}
              >
                <div className="flex-1">
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className={`text-sm ${item.out_of_stock_flag ? 'text-red-400' : 'text-green-400'}`}>
                    {item.out_of_stock_flag ? 'Out of stock' : 'In stock'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={item.stock_quantity != null ? String(item.stock_quantity) : 'units left'}
                      value={qtyEdits[item.item_id] ?? ''}
                      onChange={(e) => setQtyEdits((prev) => ({ ...prev, [item.item_id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveQuantity(item.item_id) }}
                      className="w-20 px-2 py-1 text-sm rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                    />
                    <button
                      onClick={() => saveQuantity(item.item_id)}
                      disabled={savingQtyId === item.item_id || qtyEdits[item.item_id] === undefined}
                      className="px-2 py-1 text-xs font-semibold rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 whitespace-nowrap"
                    >
                      {savingQtyId === item.item_id ? '…' : 'Set'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => toggleStock(item.item_id)}
                  disabled={togglingId === item.item_id}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap disabled:opacity-50 ${
                    item.out_of_stock_flag
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {togglingId === item.item_id ? '...' : item.out_of_stock_flag ? 'Restock' : 'Mark Out of Stock'}
                </button>
              </div>
            ))}
            </div>
          </div>
        )
      ) : view === 'top-items' ? (
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center gap-2 mb-6">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTopItemsPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  topItemsPeriod === p ? 'bg-[#f97316] text-white' : 'bg-[#111118] border border-white/8 text-[#6b7280]'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {topItemsLoading ? (
            <p className="text-center text-gray-400 text-2xl py-20">Loading top items...</p>
          ) : topItems.length === 0 ? (
            <p className="text-center text-gray-400 text-2xl py-20">No orders in this period yet</p>
          ) : (
            // Same ranked-list shape as ManagerPanel's Top Items card, just
            // sized up for a kitchen-display screen someone's reading from
            // a few feet away.
            <div className="bg-[#111118] border border-white/8 rounded-2xl divide-y divide-white/8">
              {topItems.map((item, i) => (
                <div key={item.item_id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`text-xl font-mono w-8 text-center shrink-0 ${i === 0 ? 'text-[#f97316]' : 'text-[#6b7280]'}`}>
                      #{i + 1}
                    </span>
                    <span className="text-xl font-semibold text-[#f1f5f9] truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="text-xl font-bold text-[#f1f5f9]">{item.total_quantity} sold</div>
                    <div className="text-sm text-[#6b7280]">{item.order_count} order{item.order_count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 text-2xl py-20">No active orders</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <div
              key={order.master_order_id}
              className="bg-gray-800 rounded-lg p-6 border-4 border-yellow-500"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold">#{order.master_order_id}</h2>
                  <p className="text-xl text-gray-300">
                    {order.table_number ? `Table ${order.table_number}` : (order.order_type?.replace(/_/g, ' ') || 'Takeout')}
                    {order.customer_name && <span className="text-gray-400"> · {order.customer_name}</span>}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-lg text-lg font-bold ${
                    order.status === 'READY' || order.status === 'READY_FOR_PICKUP'
                      ? 'bg-green-600 text-white'
                      : order.status === 'COOKING'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {order.items?.map((item: any) => (
                  <div key={item.order_item_id} className="border-t border-gray-700 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-medium">
                        {item.quantity}x {item.name || `Item #${item.item_id}`}
                      </span>
                    </div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {item.modifiers.map((mod: any, idx: number) => (
                          <li
                            key={idx}
                            className={`text-lg font-medium ${
                              mod.modifier_type === 'removal' ? 'text-red-400 font-bold' : 'text-cyan-300'
                            }`}
                          >
                            {mod.modifier_type === 'removal' ? '⚠ NO ' : '+ '}
                            {mod.quantity > 1 ? `${mod.quantity}x ` : ''}
                            {mod.name || `Modifier #${mod.modifier_id}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.custom_instructions && (
                      <p className="text-yellow-400 mt-1 italic">
                        {item.custom_instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4">
                {(() => {
                  const next = nextStatusFor(order.status)
                  if (!next) {
                    // Order sitting at READY — kitchen's part is done;
                    // whoever owns hand-off for this type takes it from
                    // here (waiter for DINE_IN/PICKUP/ORDER_FROM_HOME,
                    // driver for DELIVERY), not this button.
                    return (
                      <div className="w-full text-center text-yellow-400 text-lg font-bold py-4 rounded-lg border-2 border-dashed border-yellow-500/40">
                        {order.order_type === 'DELIVERY' ? 'Waiting for driver' : 'Waiting for waiter'}
                      </div>
                    )
                  }
                  return (
                    <button
                      onClick={() => advanceStatus(order.master_order_id, order.status)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-xl font-bold py-4 rounded-lg"
                    >
                      ADVANCE
                    </button>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
