import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useProject() {
  const { projectId } = useParams<{ projectId: string }>()

  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, gates(*, gate_items(*))')
        .eq('id', projectId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}
