import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMenuItems, getComboMeals, getComboMealDetail, type MenuItem, type ComboMeal, type ComboMealSide } from '../lib/menuApi'
import { useCartStore } from '../stores/cartStore'

type Step = 'select-combo' | 'pick-main' | 'pick-sides' | 'review'

export default function ComboBuilder() {
  const [step, setStep] = useState<Step>('select-combo')
  const [combos, setCombos] = useState<ComboMeal[]>([])
  const [selectedCombo, setSelectedCombo] = useState<(ComboMeal & { sides: ComboMealSide[] }) | null>(null)
  const [mainItems, setMainItems] = useState<MenuItem[]>([])
  const [sideItems, setSideItems] = useState<MenuItem[]>([])
  const [selectedMain, setSelectedMain] = useState<MenuItem | null>(null)
  const [selectedSides, setSelectedSides] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const addCombo = useCartStore((s) => s.addCombo)

  useEffect(() => {
    loadCombos()
  }, [])

  const loadCombos = async () => {
    try {
      const res = await getComboMeals()
      setCombos(res.combos)
    } catch (err) {
      console.error('Failed to load combos:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadComboDetail = async (combo: ComboMeal) => {
    setLoading(true)
    try {
      const detail = await getComboMealDetail(combo.combo_id)
      setSelectedCombo(detail.combo)

      const menuRes = await getMenuItems()
      setMainItems(menuRes.items.filter(i => i.category_type === detail.combo.required_main_category && i.is_active && !i.out_of_stock_flag))
      setSideItems(menuRes.items.filter(i => i.category_type === detail.combo.sides_category && i.is_active && !i.out_of_stock_flag))
      
      setStep('pick-main')
    } catch (err) {
      console.error('Failed to load combo detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCombo = (combo: ComboMeal) => {
    loadComboDetail(combo)
  }

  const handleSelectMain = (item: MenuItem) => {
    setSelectedMain(item)
    setStep('pick-sides')
  }

  const toggleSide = (item: MenuItem) => {
    setSelectedSides(prev => {
      const exists = prev.find(s => s.item_id === item.item_id)
      if (exists) {
        return prev.filter(s => s.item_id !== item.item_id)
      }
      if (prev.length >= (selectedCombo?.max_sides || 2)) {
        return prev
      }
      return [...prev, item]
    })
  }

  const handleAddToCart = () => {
    if (!selectedCombo || !selectedMain) return

    addCombo({
      combo_id: selectedCombo.combo_id,
      name: selectedCombo.name,
      base_price: selectedCombo.base_price,
      combo_main: {
        menu_item_id: selectedMain.item_id,
        name: selectedMain.name,
        base_price: selectedMain.base_price
      },
      combo_sides: selectedSides.map(s => ({
        menu_item_id: s.item_id,
        name: s.name,
        base_price: s.base_price
      }))
    })

    navigate('/cart')
  }

  const canProceedFromSides = selectedSides.length > 0 && selectedSides.length <= (selectedCombo?.max_sides || 2)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Combo Builder</h1>
        <button onClick={() => navigate('/menu')} className="text-blue-600 hover:underline">
          Back to Menu
        </button>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {['Select Combo', 'Pick Main', 'Pick Sides', 'Review'].map((label, idx) => {
          const steps: Step[] = ['select-combo', 'pick-main', 'pick-sides', 'review']
          const currentIdx = steps.indexOf(step)
          const isActive = idx === currentIdx
          const isComplete = idx < currentIdx
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive ? 'bg-blue-600 text-white' : isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {isComplete ? '✓' : idx + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                {label}
              </span>
              {idx < 3 && <div className="flex-1 h-0.5 bg-gray-200 mx-2" />}
            </div>
          )
        })}
      </div>

      {step === 'select-combo' && (
        <div className="grid gap-4">
          {combos.map((combo) => (
            <button
              key={combo.combo_id}
              onClick={() => handleSelectCombo(combo)}
              className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="flex gap-4">
                {combo.image_url && (
                  <img src={combo.image_url} alt={combo.name} className="w-24 h-24 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{combo.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{combo.description}</p>
                  <p className="text-lg font-bold text-blue-600 mt-2">${combo.base_price.toFixed(2)}</p>
                </div>
              </div>
            </button>
          ))}
          {combos.length === 0 && (
            <p className="text-center text-gray-500 py-8">No combo deals available right now.</p>
          )}
        </div>
      )}

      {step === 'pick-main' && selectedCombo && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 1: Pick Your Main</h2>
          <p className="text-sm text-gray-600 mb-4">Choose one {selectedCombo.required_main_category} for your combo.</p>
          <div className="grid gap-3">
            {mainItems.map((item) => (
              <button
                key={item.item_id}
                onClick={() => handleSelectMain(item)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-500 transition-all flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <span className="text-blue-600 font-bold">${item.base_price.toFixed(2)}</span>
              </button>
            ))}
          </div>
          {mainItems.length === 0 && (
            <p className="text-center text-gray-500 py-8">No {selectedCombo.required_main_category} available.</p>
          )}
        </div>
      )}

      {step === 'pick-sides' && selectedCombo && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 2: Pick Your Sides</h2>
          <p className="text-sm text-gray-600 mb-4">Choose up to {selectedCombo.max_sides} sides from {selectedCombo.sides_category}.</p>
          <p className="text-sm text-blue-600 mb-4">Selected: {selectedSides.length} / {selectedCombo.max_sides}</p>
          <div className="grid gap-3">
            {sideItems.map((item) => {
              const isSelected = selectedSides.some(s => s.item_id === item.item_id)
              return (
                <button
                  key={item.item_id}
                  onClick={() => toggleSide(item)}
                  disabled={!isSelected && selectedSides.length >= (selectedCombo.max_sides || 2)}
                  className={`w-full border-2 rounded-xl p-4 text-left transition-all flex justify-between items-center ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-500'
                  } ${!isSelected && selectedSides.length >= (selectedCombo.max_sides || 2) ? 'opacity-50' : ''}`}
                >
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <span className="text-blue-600 font-bold">${item.base_price.toFixed(2)}</span>
                </button>
              )
            })}
          </div>
          {sideItems.length === 0 && (
            <p className="text-center text-gray-500 py-8">No sides available.</p>
          )}
          <div className="mt-6 flex gap-3">
            <button onClick={() => setStep('pick-main')} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">
              Back
            </button>
            <button 
              onClick={() => setStep('review')} 
              disabled={!canProceedFromSides}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'review' && selectedCombo && selectedMain && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Step 3: Review Your Combo</h2>
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-blue-600 mb-4">{selectedCombo.name}</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Main</p>
              <div className="flex justify-between">
                <span className="font-medium">{selectedMain.name}</span>
                <span>${selectedMain.base_price.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 uppercase tracking-wide mb-2">Sides</p>
              {selectedSides.map((side) => (
                <div key={side.item_id} className="flex justify-between mb-1">
                  <span>{side.name}</span>
                  <span>${side.base_price.toFixed(2)}</span>
                </div>
              ))}
              {selectedSides.length === 0 && (
                <p className="text-gray-500 text-sm">No sides selected</p>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Combo Price</span>
                <span className="text-blue-600">${selectedCombo.base_price.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">You save ${(selectedMain.base_price + selectedSides.reduce((sum, s) => sum + s.base_price, 0) - selectedCombo.base_price).toFixed(2)} with this combo!</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('pick-sides')} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">
              Back
            </button>
            <button onClick={handleAddToCart} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium">
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
