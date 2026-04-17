import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useProjects, useCreateProject } from '../hooks/useProjects'
import ProjectCard from '../components/projects/ProjectCard'

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createProject.mutateAsync({ name })
    setName('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Projetos</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-white border rounded-xl p-4 flex gap-3">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do projeto"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Criar
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500">
            Cancelar
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : projects?.length === 0 ? (
        <p className="text-gray-400">Nenhum projeto ainda. Crie o primeiro!</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map(p => <ProjectCard key={p.id} project={p as any} />)}
        </div>
      )}
    </div>
  )
}
