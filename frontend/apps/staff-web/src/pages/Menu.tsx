import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSocket } from '../lib/socket'
import { useCartStore } from '../stores/cartStore'
import { getMenuItems, getComboMeals, type MenuItem } from '../lib/menuApi'

export default function Menu() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const addItem = useCartStore((s) => s.addItem)

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

  const handleAddToCart = (item: MenuItem) => {
    if (isOutOfStock(item)) return
    addItem({
      menu_item_id: item.item_id,
      name: item.name,
      base_price: item.base_price,
    })
    navigate('/cart')
  }

  if (loading) {
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
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Menu</h1>
        <button
          onClick={() => navigate('/combos')}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          Combo Deals
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
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
              className={`border rounded-lg overflow-hidden ${
                item.is_trending ? 'border-orange-400' : 'border-gray-200'
              } ${outOfStock ? 'opacity-60 bg-gray-50' : 'bg-white'}`}
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
                  {item.is_trending && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                      Trending
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {item.description || 'No description'}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xl font-bold text-blue-600">
                    ${item.base_price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={outOfStock}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {outOfStock ? 'Unavailable' : 'Add'}
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
  )
}
