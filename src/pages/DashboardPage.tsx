import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useProjects, useCreateProject } from '../hooks/useProjects'
import ProjectCard from '../components/projects/ProjectCard'
import { usePushSheets } from '../hooks/useGoogleSync'

export default function DashboardPage() {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const pushSheets = usePushSheets()
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => pushSheets.mutate()}
            disabled={pushSheets.isPending}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={pushSheets.isPending ? 'animate-spin' : ''} />
            {pushSheets.isPending ? 'Sincronizando...' : 'Sync Sheets'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={16} /> Novo Projeto
          </button>
        </div>
      </div>
      {pushSheets.isSuccess && (
        <p className="text-xs text-green-600 mt-1">✓ Sheets atualizado</p>
      )}
      {pushSheets.isError && (
        <p className="text-xs text-red-500 mt-1">Erro ao sincronizar</p>
      )}

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
