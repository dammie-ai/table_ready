import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../lib/socket'
import { useCartStore } from '../stores/cartStore'
import { getMenuItems, type MenuItem } from '../lib/menuApi'
import { useTheme, themeBackgroundStyle, themeRadiusPx } from '../hooks/useTheme'

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)
  const { theme, loading: themeLoading } = useTheme()

  const loadMenu = async () => {
    try {
      const res = await getMenuItems()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()

    const socket = getSocket()
    socket.on('menu_item_updated', (data: { item_id: number; is_active: boolean }) => {
      setItems((prev) =>
        prev.map((item) =>
          item.item_id === data.item_id ? { ...item, is_active: data.is_active } : item
        )
      )
    })

    return () => {
      socket.off('menu_item_updated')
    }
  }, [])

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category_type)))]

  const filtered = selectedCategory === 'All' 
    ? items 
    : items.filter((i) => i.category_type === selectedCategory)

  const isOutOfStock = (item: MenuItem) => {
    return !item.is_active || item.out_of_stock_flag || item.stock_quantity <= 0
  }

  const [addedItem, setAddedItem] = useState<number | null>(null)
  const groupCode = localStorage.getItem('tableready_group_code')

  const handleAddToCart = (item: MenuItem) => {
    if (isOutOfStock(item)) return
    addItem({
      menu_item_id: item.item_id,
      name: item.name,
      base_price: item.base_price,
    })
    setAddedItem(item.item_id)
    setTimeout(() => setAddedItem(null), 1500)
  }

  if (loading || themeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading menu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={themeBackgroundStyle(theme)}>
    <div className="max-w-4xl mx-auto p-4 pb-24" style={{ fontFamily: theme?.font_family }}>
      {theme?.announcement_banner && (
        <div
          className="text-center text-sm font-medium py-2 px-4 rounded-lg mb-4 text-white"
          style={{ backgroundColor: theme?.accent_color }}
        >
          {theme.announcement_banner}
        </div>
      )}
      {typeof window !== 'undefined' && localStorage.getItem('tableready_waiter_name') && (
        <div className="text-center text-sm py-2 px-4 rounded-lg mb-4" style={{ color: theme?.text_color, backgroundColor: theme?.primary_color + '15' }}>
          🧑‍🍳 You're being served by <span className="font-semibold">{localStorage.getItem('tableready_waiter_name')}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3" style={{ flexDirection: theme?.logo_position === 'center' ? 'column' : 'row' }}>
          {theme?.logo_url && <img src={theme.logo_url} alt="" className="h-10 w-10 object-contain" style={{ borderRadius: themeRadiusPx(theme) }} />}
          <h1 className="text-3xl font-bold" style={{ color: theme?.text_color }}>
            {theme?.restaurant_name || 'Menu'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {groupCode && (
            <button
              onClick={() => navigate('/shared-cart')}
              className="relative text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
              style={{ backgroundColor: theme?.primary_color }}
            >
              Group Cart
            </button>
          )}
          <button
            onClick={() => navigate('/cart')}
            className="relative text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            style={{ backgroundColor: theme?.primary_color }}
          >
            Cart
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-xs rounded-full flex items-center justify-center font-bold" style={{ color: theme?.primary_color }}>
                {cartItems.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedCategory === cat
                ? 'text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            style={selectedCategory === cat ? { backgroundColor: theme?.primary_color } : undefined}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const outOfStock = isOutOfStock(item)
          return (
            <div
              key={item.item_id}
              className={`border overflow-hidden ${
                item.is_trending ? 'border-orange-400' : 'border-gray-200'
              } ${outOfStock ? 'opacity-60 bg-gray-50' : 'bg-white'}`}
              style={{ borderRadius: themeRadiusPx(theme) }}
            >
              {item.image_url && (
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className={`w-full h-full object-cover ${outOfStock ? 'grayscale' : ''}`}
                    loading="lazy"
                  />
                  {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                 {item.is_trending && theme?.show_trending_badges && (
                      <span className="text-xs text-white px-2 py-1 rounded" style={{ backgroundColor: theme?.primary_color }}>
                        Trending
                      </span>
                    )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.description || 'No description'}
                </p>

                 <div className="flex items-center justify-between mt-3">
                   <span className="text-xl font-bold" style={{ color: theme?.primary_color }}>
                     {theme?.currency_symbol || '$'}{item.base_price.toFixed(2)}
                   </span>
                   <button
                     onClick={() => handleAddToCart(item)}
                     disabled={outOfStock}
                     className="text-white px-4 py-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     style={{
                       borderRadius: themeRadiusPx(theme),
                       backgroundColor: addedItem === item.item_id ? '#10b981' : theme?.primary_color,
                     }}
                   >
                     {outOfStock ? 'Unavailable' : addedItem === item.item_id ? 'Added!' : 'Add'}
                   </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No items found in this category.</p>
      )}
    </div>
    </div>
  )
}
