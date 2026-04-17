import { Link } from 'react-router-dom'
import { CheckCircle, Circle, Lock } from 'lucide-react'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
} as const

interface Gate { id: string; number: number; status: string }
interface Project {
  id: string
  name: string
  status: keyof typeof STATUS_COLORS
  current_gate: number
  gates: Gate[]
}

export default function ProjectCard({ project }: { project: Project }) {
  const approvedCount = project.gates.filter(g => g.status === 'approved').length

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900">{project.name}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">
        Gate atual: <span className="font-medium text-gray-700">{project.current_gate}/13</span>
        {' · '}{approvedCount} aprovados
      </p>
      <div className="flex gap-1">
        {Array.from({ length: 13 }, (_, i) => {
          const gate = project.gates.find(g => g.number === i + 1)
          const status = gate?.status ?? 'locked'
          return status === 'approved'
            ? <CheckCircle key={i} size={14} className="text-green-500" />
            : status === 'locked'
            ? <Lock key={i} size={14} className="text-gray-300" />
            : <Circle key={i} size={14} className="text-indigo-400" />
        })}
      </div>
    </Link>
  )
}
