const STATUS_LABELS = {
  todo: 'A fazer',
  in_progress: 'Em andamento',
  blocked: 'Bloqueado',
  done: 'Concluído',
}

interface Task { id: string; title: string; status: keyof typeof STATUS_LABELS }

export default function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (status: string) => void }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm">
      <p className="text-sm text-gray-800 mb-2">{task.title}</p>
      <select
        value={task.status}
        onChange={e => onStatusChange(e.target.value)}
        className="text-xs border rounded px-2 py-1 text-gray-600 w-full"
      >
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </div>
  )
}
