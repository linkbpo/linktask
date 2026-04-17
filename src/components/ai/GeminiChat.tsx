import { useState, useRef, useEffect } from 'react'
import { Send, Bot } from 'lucide-react'
import { useGeminiChat } from '../../hooks/useGeminiChat'

export default function GeminiChat({ projectId }: { projectId: string }) {
  const { messages, loading, error, sendMessage } = useGeminiChat(projectId)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-indigo-50">
        <Bot size={16} className="text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-700">Assistente Gemini</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-4">
            Pergunte sobre este projeto, gates, tarefas ou próximos passos.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400">
              Pensando...
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pergunte algo sobre o projeto..."
          disabled={loading}
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}
