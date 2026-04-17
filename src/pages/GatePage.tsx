import { useGate } from '../hooks/useGate'
import { useParams, Link } from 'react-router-dom'
import ChecklistCard from '../components/gates/ChecklistCard'
import ApprovalFlow from '../components/gates/ApprovalFlow'
import { ArrowLeft } from 'lucide-react'

export default function GatePage() {
  const { data: gate, isLoading } = useGate()
  const { projectId, gateNumber } = useParams()

  if (isLoading) return <p className="text-gray-500">Carregando gate...</p>
  if (!gate) return <p className="text-red-500">Gate não encontrado.</p>

  const allItemsChecked = (gate.gate_items as any[]).every((i) => i.checked)

  return (
    <div className="max-w-xl">
      <Link to={`/projects/${projectId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Projeto
      </Link>
      <div className="mb-6">
        <p className="text-xs text-gray-400 font-mono">Gate {gateNumber}</p>
        <h2 className="text-2xl font-bold text-gray-900">{gate.title}</h2>
      </div>
      <div className="space-y-4">
        <ChecklistCard items={gate.gate_items as any} gateStatus={gate.status} />
        <ApprovalFlow
          gateId={gate.id}
          projectId={projectId!}
          gateNumber={Number(gateNumber)}
          status={gate.status}
          allItemsChecked={allItemsChecked}
        />
      </div>
    </div>
  )
}
