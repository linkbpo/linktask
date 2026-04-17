import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function useGeminiChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.functions.invoke('gemini-chat', {
        body: { project_id: projectId, message: text },
      })
      if (error) throw error
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return { messages, loading, error, sendMessage }
}
