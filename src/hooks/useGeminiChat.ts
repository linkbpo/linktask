import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useGeminiChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (text: string): Promise<boolean> => {
    if (!text.trim() || loading) return false

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { project_id: projectId, message: text },
      })
      if (error) throw error
      const reply = data?.reply
      if (!reply) throw new Error('Empty response from assistant')
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return false
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, error, sendMessage }
}
