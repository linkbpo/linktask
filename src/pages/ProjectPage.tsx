import { useProject } from '../hooks/useProject'
import GateTimeline from '../components/gates/GateTimeline'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProjectPage() {
  const { data: project, isLoading } = useProject()

  if (isLoading) return <p className="text-gray-500">Carregando projeto...</p>
  if (!project) return <p className="text-red-500">Projeto não encontrado.</p>

  const sortedGates = [...(project.gates ?? [])].sort((a, b) => a.number - b.number)

  return (
    <div className="max-w-2xl">
      <Link to="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={14} /> Projetos
      </Link>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{project.name}</h2>
      {project.description && <p className="text-gray-500 text-sm mb-6">{project.description}</p>}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Gates do Projeto</h3>
      <GateTimeline gates={sortedGates as any} />
    </div>
  )
}
