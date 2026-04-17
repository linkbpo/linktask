import { useProject } from '../hooks/useProject'
import GateTimeline from '../components/gates/GateTimeline'
import GeminiChat from '../components/ai/GeminiChat'
import { useSyncDrive } from '../hooks/useGoogleSync'
import { ArrowLeft, FolderOpen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

export default function ProjectPage() {
  const { data: project, isLoading } = useProject()
  const { projectId } = useParams()
  const syncDrive = useSyncDrive()

  if (isLoading) return <p className="text-gray-500">Carregando projeto...</p>
  if (!project) return <p className="text-red-500">Projeto não encontrado.</p>

  const sortedGates = [...(project.gates ?? [])].sort((a, b) => a.number - b.number)

  return (
    <div className="flex gap-6 h-full">
      {/* Coluna principal */}
      <div className="flex-1 max-w-2xl">
        <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={14} /> Projetos
        </Link>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            {project.description && <p className="text-gray-500 text-sm">{project.description}</p>}
          </div>
          <button
            onClick={() => syncDrive.mutate(projectId!)}
            disabled={syncDrive.isPending || syncDrive.isSuccess}
            className="flex items-center gap-2 text-sm border rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <FolderOpen size={14} />
            {syncDrive.isPending ? 'Criando...' : syncDrive.isSuccess ? '✓ Drive criado' : 'Criar pasta Drive'}
          </button>
        </div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Gates do Projeto</h3>
        <GateTimeline gates={sortedGates as any} />
      </div>

      {/* Chat Gemini */}
      <div className="w-80 flex-shrink-0" style={{ height: 'calc(100vh - 5rem)' }}>
        <GeminiChat projectId={projectId!} />
      </div>
    </div>
  )
}
