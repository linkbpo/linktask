import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BQ_SCOPES = ['https://www.googleapis.com/auth/bigquery']

async function runBigQueryJob(token: string, projectId: string, query: string) {
  const res = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/jobs`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        configuration: {
          query: { query, useLegacySql: false },
        },
      }),
    }
  )
  if (!res.ok) throw new Error(`BigQuery job error: ${await res.text()}`)
  return res.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const bqProjectId = Deno.env.get('GOOGLE_BIGQUERY_PROJECT_ID')
    if (!bqProjectId) throw new Error('GOOGLE_BIGQUERY_PROJECT_ID not set')

    // Use service role key for full data access (this is a server-to-server sync)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = await getGoogleAccessToken(BQ_SCOPES)

    // Fetch data from Supabase
    const [projectsRes, gatesRes, tasksRes, itemsRes] = await Promise.all([
      supabase.from('projects').select('id, tenant_id, name, status, current_gate, created_at, updated_at'),
      supabase.from('gates').select('id, project_id, number, title, status, approved_at, created_at'),
      supabase.from('tasks').select('id, gate_id, project_id, title, status, due_date, created_at, updated_at'),
      supabase.from('gate_items').select('id, gate_id, label, checked, "order"'),
    ])

    if (projectsRes.error) throw projectsRes.error
    if (gatesRes.error) throw gatesRes.error
    if (tasksRes.error) throw tasksRes.error
    if (itemsRes.error) throw itemsRes.error

    const now = new Date().toISOString()

    // Helper to build BigQuery INSERT VALUES
    const toValues = (rows: any[], mapper: (r: any) => string) =>
      rows.map(mapper).join(',\n')

    const sq = (v: string | null | undefined) => v ? `'${v.replace(/'/g, "''")}'` : 'NULL'
    const bool = (v: boolean) => v ? 'TRUE' : 'FALSE'

    // Projects — always DELETE (full refresh), then INSERT if data exists
    await runBigQueryJob(token, bqProjectId, `DELETE FROM \`${bqProjectId}.linktask.projects\` WHERE TRUE`)
    if (projectsRes.data?.length) {
      const values = toValues(projectsRes.data, (p) =>
        `('${p.id}', '${p.tenant_id}', ${sq(p.name)}, '${p.status}', ${p.current_gate ?? 0}, '${p.created_at}', '${p.updated_at}', '${now}')`
      )
      await runBigQueryJob(token, bqProjectId, `
        INSERT INTO \`${bqProjectId}.linktask.projects\`
          (id, tenant_id, name, status, current_gate, created_at, updated_at, synced_at)
        VALUES ${values}
      `)
    }

    // Gates
    await runBigQueryJob(token, bqProjectId, `DELETE FROM \`${bqProjectId}.linktask.gates\` WHERE TRUE`)
    if (gatesRes.data?.length) {
      const values = toValues(gatesRes.data, (g) =>
        `('${g.id}', '${g.project_id}', ${g.number}, ${sq(g.title)}, '${g.status}', ${sq(g.approved_at)}, '${g.created_at}', '${now}')`
      )
      await runBigQueryJob(token, bqProjectId, `
        INSERT INTO \`${bqProjectId}.linktask.gates\`
          (id, project_id, number, title, status, approved_at, created_at, synced_at)
        VALUES ${values}
      `)
    }

    // Tasks
    await runBigQueryJob(token, bqProjectId, `DELETE FROM \`${bqProjectId}.linktask.tasks\` WHERE TRUE`)
    if (tasksRes.data?.length) {
      const values = toValues(tasksRes.data, (t) =>
        `('${t.id}', '${t.gate_id}', '${t.project_id}', ${sq(t.title)}, '${t.status}', ${sq(t.due_date)}, '${t.created_at}', '${now}')`
      )
      await runBigQueryJob(token, bqProjectId, `
        INSERT INTO \`${bqProjectId}.linktask.tasks\`
          (id, gate_id, project_id, title, status, due_date, created_at, synced_at)
        VALUES ${values}
      `)
    }

    // Gate items
    await runBigQueryJob(token, bqProjectId, `DELETE FROM \`${bqProjectId}.linktask.gate_items\` WHERE TRUE`)
    if (itemsRes.data?.length) {
      const values = toValues(itemsRes.data, (i) =>
        `('${i.id}', '${i.gate_id}', ${sq(i.label)}, ${bool(i.checked)}, ${i.order ?? 0}, '${now}')`
      )
      await runBigQueryJob(token, bqProjectId, `
        INSERT INTO \`${bqProjectId}.linktask.gate_items\`
          (id, gate_id, label, checked, item_order, synced_at)
        VALUES ${values}
      `)
    }

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
