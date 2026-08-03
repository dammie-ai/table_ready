import { useState } from 'react'
import { useCartStore } from '../stores/cartStore'
import { useTheme } from '../hooks/useTheme'

interface BillSplitterProps {
  onConfirm: (splits: { name: string; items: number[] }[]) => void
  onCancel: () => void
}

export default function BillSplitter({ onConfirm, onCancel }: BillSplitterProps) {
  const items = useCartStore((s) => s.items)
  const { theme } = useTheme()
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [peopleCount, setPeopleCount] = useState(2)
  const [assignments, setAssignments] = useState<Record<number, number>>({})

  const total = items.reduce((sum, i) => sum + i.base_price * i.quantity, 0)
  const perPerson = splitMode === 'equal' ? total / peopleCount : 0

  const toggleItemAssignment = (itemIndex: number, personIndex: number) => {
    setAssignments((prev) => {
      const current = prev[itemIndex] || 0
      if (current === personIndex + 1) {
        const next = { ...prev }
        delete next[itemIndex]
        return next
      }
      return { ...prev, [itemIndex]: personIndex + 1 }
    })
  }

  const handleConfirm = () => {
    if (splitMode === 'equal') {
      const splits = Array.from({ length: peopleCount }, (_, i) => ({
        name: `Person ${i + 1}`,
        items: [] as number[],
      }))
      items.forEach((_, idx) => {
        splits[idx % peopleCount].items.push(idx)
      })
      onConfirm(splits)
    } else {
      const splits: { name: string; items: number[] }[] = []
      items.forEach((_, idx) => {
        const person = assignments[idx]
        if (person) {
          const existing = splits.find((s) => s.name === `Person ${person}`)
          if (existing) {
            existing.items.push(idx)
          } else {
            splits.push({ name: `Person ${person}`, items: [idx] })
          }
        }
      })
      onConfirm(splits)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6" style={{ color: theme?.text_color }}>Split the Bill</h1>

      <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold" style={{ color: theme?.text_color }}>Total</span>
          <span className="text-2xl font-bold" style={{ color: theme?.primary_color }}>${total.toFixed(2)}</span>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSplitMode('equal')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              splitMode === 'equal' ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]' : 'border-white/8 text-[#6b7280]'
            }`}
          >
            Split Equally
          </button>
          <button
            onClick={() => setSplitMode('custom')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
              splitMode === 'custom' ? 'border-[#f97316] bg-[#f97316]/15 text-[#f97316]' : 'border-white/8 text-[#6b7280]'
            }`}
          >
            Custom
          </button>
        </div>

        {splitMode === 'equal' && (
          <div>
            <label className="block text-xs text-[#6b7280] uppercase tracking-widest font-mono mb-1.5">Number of People</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                className="w-10 h-10 rounded-lg border border-white/8 text-[#f1f5f9] hover:bg-white/5"
              >
                -
              </button>
              <span className="text-xl font-bold w-12 text-center" style={{ color: theme?.text_color }}>{peopleCount}</span>
              <button
                onClick={() => setPeopleCount(peopleCount + 1)}
                className="w-10 h-10 rounded-lg border border-white/8 text-[#f1f5f9] hover:bg-white/5"
              >
                +
              </button>
            </div>
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              <div className="flex justify-between text-sm">
                <span style={{ color: theme?.text_color }}>Each person pays</span>
                <span className="font-bold" style={{ color: theme?.primary_color }}>${perPerson.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {splitMode === 'custom' && (
          <div>
            <p className="text-sm text-[#6b7280] mb-3">Tap items to assign them to different people</p>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.menu_item_id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="font-medium text-sm" style={{ color: theme?.text_color }}>{item.name}</p>
                    <p className="text-xs text-[#6b7280]">${(item.base_price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(peopleCount, 4) }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => toggleItemAssignment(idx, i + 1)}
                        className={`w-8 h-8 rounded-lg border text-xs font-bold transition-colors ${
                          (assignments[idx] || 0) === i + 1
                            ? 'border-[#f97316] bg-[#f97316] text-white'
                            : 'border-white/8 text-[#6b7280]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 border border-white/8 text-[#f1f5f9] py-3 rounded-xl font-medium hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 text-white py-3 rounded-xl font-medium hover:opacity-90"
          style={{ backgroundColor: theme?.primary_color }}
        >
          Confirm Split
        </button>
      </div>
    </div>
  )
}
