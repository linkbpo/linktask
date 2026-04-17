import { useState, FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useTasks, useCreateTask, useUpdateTaskStatus } from '../../hooks/useTasks'
import TaskCard from './TaskCard'

const COLUMNS = [
  { status: 'todo',        label: 'A fazer',       color: 'bg-gray-100' },
  { status: 'in_progress', label: 'Em andamento',  color: 'bg-blue-50' },
  { status: 'blocked',     label: 'Bloqueado',     color: 'bg-red-50' },
  { status: 'done',        label: 'Concluído',     color: 'bg-green-50' },
]

export default function TaskBoard({ gateId, projectId }: { gateId: string; projectId: string }) {
  const { data: tasks = [] } = useTasks(gateId)
  const createTask = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const [newTitle, setNewTitle] = useState('')

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createTask.mutateAsync({ gateId, projectId, title: newTitle })
    setNewTitle('')
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Tarefas</h3>
      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Nova tarefa..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button type="submit" className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm">
          <Plus size={14} /> Adicionar
        </button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {COLUMNS.map(col => (
          <div key={col.status} className={`rounded-lg p-3 ${col.color}`}>
            <p className="text-xs font-semibold text-gray-500 mb-2">{col.label}</p>
            <div className="space-y-2">
              {(tasks as any[]).filter(t => t.status === col.status).map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={status => updateStatus.mutate({ taskId: task.id, status, gateId })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
