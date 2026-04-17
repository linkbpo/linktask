import { Link, useParams } from 'react-router-dom'
import { CheckCircle, Circle, Lock, AlertCircle, Clock } from 'lucide-react'

const STATUS_CONFIG = {
  locked:           { icon: Lock,         color: 'text-gray-300', bg: 'bg-gray-50',    label: 'Bloqueado' },
  open:             { icon: Circle,       color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Aberto' },
  pending_approval: { icon: Clock,        color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Aguardando aprovação' },
  approved:         { icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50',  label: 'Aprovado' },
  blocked:          { icon: AlertCircle,  color: 'text-red-500',    bg: 'bg-red-50',    label: 'Bloqueado' },
} as const

interface Gate {
  id: string
  number: number
  title: string
  status: keyof typeof STATUS_CONFIG
  gate_items: { id: string; checked: boolean }[]
}

export default function GateTimeline({ gates }: { gates: Gate[] }) {
  const { projectId } = useParams()

  return (
    <div className="space-y-2">
      {gates.map((gate) => {
        const config = STATUS_CONFIG[gate.status]
        const Icon = config.icon
        const checkedCount = gate.gate_items.filter(i => i.checked).length
        const totalCount = gate.gate_items.length
        const isClickable = gate.status !== 'locked'

        const content = (
          <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${config.bg} ${isClickable ? 'cursor-pointer hover:shadow-sm' : 'opacity-60'}`}>
            <div className="flex-shrink-0">
              <Icon size={20} className={config.color} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">Gate {gate.number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} bg-white border`}>
                  {config.label}
                </span>
              </div>
              <p className="font-medium text-gray-900 text-sm mt-0.5">{gate.title}</p>
            </div>
            {totalCount > 0 && (
              <div className="text-right text-xs text-gray-500">
                <span className={checkedCount === totalCount ? 'text-green-600 font-medium' : ''}>
                  {checkedCount}/{totalCount}
                </span>
                <p>itens</p>
              </div>
            )}
          </div>
        )

        return isClickable ? (
          <Link key={gate.id} to={`/projects/${projectId}/gate/${gate.number}`}>
            {content}
          </Link>
        ) : (
          <div key={gate.id}>{content}</div>
        )
      })}
    </div>
  )
}
