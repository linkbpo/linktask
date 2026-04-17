import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive']

async function createDriveFolder(token: string, name: string, parentId: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  })
  if (!res.ok) throw new Error(`Drive create folder error: ${await res.text()}`)
  const data = await res.json()
  return data.id
}

const GATE_TITLES = [
  '', 'Onboarding', 'Briefing', 'Apresentação Básica', 'RACI Inicial',
  'Orçamento', 'Business Plan', 'Apresentação BP', 'Atualização do RACI',
  'Execução', 'Ajuste', 'Entrega', 'Documentação Atualizada', 'Conclusão',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { project_id } = await req.json()
    if (!project_id) throw new Error('project_id is required')

    const rootFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')
    if (!rootFolderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID not set')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Check if project folder already created
    const { data: existing } = await supabase
      .from('drive_folders')
      .select('drive_folder_id')
      .eq('project_id', project_id)
      .is('gate_number', null)
      .single()

    if (existing) {
      return new Response(JSON.stringify({ success: true, folder_id: existing.drive_folder_id, message: 'already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch project name
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('name')
      .eq('id', project_id)
      .single()

    if (pErr) throw pErr
    if (!project) throw new Error('Project not found')

    const token = await getGoogleAccessToken(DRIVE_SCOPES)

    // Create project root folder
    const projectFolderId = await createDriveFolder(token, project.name, rootFolderId)

    // Save project folder
    const { error: insertErr } = await supabase.from('drive_folders').insert({
      project_id,
      gate_number: null,
      drive_folder_id: projectFolderId,
    })
    if (insertErr) throw insertErr

    // Create 13 gate subfolders sequentially
    const gateFolderInserts = []
    for (let n = 1; n <= 13; n++) {
      const folderName = `Gate ${n} - ${GATE_TITLES[n]}`
      const gateFolderId = await createDriveFolder(token, folderName, projectFolderId)
      gateFolderInserts.push({ project_id, gate_number: n, drive_folder_id: gateFolderId })
    }

    const { error: gateInsertErr } = await supabase.from('drive_folders').insert(gateFolderInserts)
    if (gateInsertErr) throw gateInsertErr

    return new Response(JSON.stringify({ success: true, folder_id: projectFolderId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
