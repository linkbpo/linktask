import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { project_id, message } = await req.json()
    if (!project_id || !message) throw new Error('project_id and message are required')

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    // Init Supabase with user's auth token
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Fetch project context
    const { data: project } = await supabase
      .from('projects')
      .select('name, status, current_gate, gates(number, title, status, gate_items(label, checked)), tasks(title, status)')
      .eq('id', project_id)
      .single()

    if (!project) throw new Error('Project not found or access denied')

    // Fetch conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('ai_conversations')
      .select('role, content')
      .eq('project_id', project_id)
      .order('created_at', { ascending: true })
      .limit(10)

    // Build context prompt
    const approvedGates = project.gates.filter((g: any) => g.status === 'approved').length
    const openTasks = project.tasks.filter((t: any) => t.status !== 'done').length
    const currentGate = project.gates.find((g: any) => g.status === 'open')

    const systemPrompt = `Você é um assistente de gestão de projetos para o linktask da Enjoy.
Contexto do projeto atual:
- Nome: ${project.name}
- Status: ${project.status}
- Gate atual: ${project.current_gate}/13
- Gates aprovados: ${approvedGates}/13
- Tarefas abertas: ${openTasks}
${currentGate ? `- Gate em andamento: ${currentGate.title}
  Checklist: ${currentGate.gate_items.filter((i: any) => i.checked).length}/${currentGate.gate_items.length} itens completos` : ''}

Responda de forma objetiva e prática. Sugira próximos passos concretos quando relevante.`

    // Build messages for Gemini
    const geminiMessages = [
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ]

    // Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    )

    if (!geminiRes.ok) throw new Error(`Gemini API error: ${await geminiRes.text()}`)

    const geminiData = await geminiRes.json()
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.'

    // Save conversation to DB
    await supabase.from('ai_conversations').insert([
      { project_id, role: 'user', content: message },
      { project_id, role: 'assistant', content: reply },
    ])

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
