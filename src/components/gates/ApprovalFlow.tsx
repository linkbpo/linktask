import { useRequestApproval, useApproveGate } from '../../hooks/useGate'
import { CheckCircle, Clock, Send } from 'lucide-react'

interface Props {
  gateId: string
  projectId: string
  gateNumber: number
  status: string
  allItemsChecked: boolean
}

export default function ApprovalFlow({ gateId, projectId, gateNumber, status, allItemsChecked }: Props) {
  const requestApproval = useRequestApproval()
  const approveGate = useApproveGate()

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle size={18} />
        <span className="text-sm font-medium">Gate aprovado</span>
      </div>
    )
  }

  if (status === 'pending_approval') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-yellow-700 mb-3">
          <Clock size={18} />
          <span className="text-sm font-medium">Aguardando aprovação</span>
        </div>
        <button
          onClick={() => approveGate.mutate({ gateId, projectId, nextGateNumber: gateNumber + 1 })}
          className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Aprovar Gate {gateNumber}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Aprovação</h3>
      {!allItemsChecked && (
        <p className="text-xs text-gray-400 mb-3">Complete todos os itens do checklist para solicitar aprovação.</p>
      )}
      <button
        disabled={!allItemsChecked || requestApproval.isPending}
        onClick={() => requestApproval.mutate(gateId)}
        className="flex items-center gap-2 w-full justify-center bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={14} />
        Solicitar Aprovação
      </button>
    </div>
  )
}
