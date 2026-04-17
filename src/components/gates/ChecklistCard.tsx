import { useToggleGateItem } from '../../hooks/useGate'

interface GateItem {
  id: string
  label: string
  checked: boolean
  order: number
}

export default function ChecklistCard({ items, gateStatus }: { items: GateItem[]; gateStatus: string }) {
  const toggle = useToggleGateItem()
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const isEditable = gateStatus === 'open'

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Checklist do Gate</h3>
      <ul className="space-y-2">
        {sorted.map(item => (
          <li key={item.id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={item.checked}
              disabled={!isEditable}
              onChange={e => toggle.mutate({ itemId: item.id, checked: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded text-indigo-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
