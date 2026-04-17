import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

async function clearAndWrite(token: string, sheetId: string, range: string, values: string[][]) {
  // Clear range
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:clear`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  )

  // Write values
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  )
  if (!res.ok) throw new Error(`Sheets write error: ${await res.text()}`)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sheetId = Deno.env.get('GOOGLE_SHEETS_ID')
    if (!sheetId) throw new Error('GOOGLE_SHEETS_ID not set')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Fetch all projects with gates
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*, gates(*, gate_items(*)), tasks(*), project_members(role, user_id)')

    if (error) throw error

    const token = await getGoogleAccessToken(SHEETS_SCOPES)
    const now = new Date().toISOString()

    // === Aba: Projetos ===
    const projectRows: string[][] = [
      ['Nome', 'Status', 'Gate Atual', 'Gates Aprovados', 'Atualizado em'],
      ...(projects ?? []).map((p: any) => [
        p.name,
        p.status,
        p.current_gate != null ? String(p.current_gate) : '',
        String((p.gates ?? []).filter((g: any) => g.status === 'approved').length),
        now,
      ]),
    ]
    await clearAndWrite(token, sheetId, 'Projetos!A1:E1000', projectRows)

    // === Aba: Gates ===
    const gateRows: string[][] = [
      ['Projeto', 'Gate', 'Título', 'Status', 'Itens Checked', 'Total Itens', 'Data Aprovação'],
    ]
    for (const p of projects ?? []) {
      for (const g of (p.gates ?? []).sort((a: any, b: any) => a.number - b.number)) {
        gateRows.push([
          p.name,
          String(g.number),
          g.title,
          g.status,
          String(g.gate_items.filter((i: any) => i.checked).length),
          String(g.gate_items.length),
          g.approved_at ? new Date(g.approved_at).toLocaleDateString('pt-BR') : '',
        ])
      }
    }
    await clearAndWrite(token, sheetId, 'Gates!A1:G1000', gateRows)

    // === Aba: Tarefas ===
    const taskRows: string[][] = [
      ['Projeto', 'Gate', 'Título', 'Status', 'Prazo'],
    ]
    for (const p of projects ?? []) {
      for (const t of p.tasks ?? []) {
        const gate = p.gates.find((g: any) => g.id === t.gate_id)
        taskRows.push([
          p.name,
          gate ? `${gate.number} - ${gate.title}` : '',
          t.title,
          t.status,
          t.due_date ?? '',
        ])
      }
    }
    await clearAndWrite(token, sheetId, 'Tarefas!A1:E1000', taskRows)

    return new Response(JSON.stringify({ success: true, synced_at: now }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
