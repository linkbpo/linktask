import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useTasks(gateId: string) {
  return useQuery({
    queryKey: ['tasks', gateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('gate_id', gateId)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!gateId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ gateId, projectId, title }: { gateId: string; projectId: string; title: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ gate_id: gateId, project_id: projectId, title })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['tasks', variables.gateId] }),
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, status, gateId }: { taskId: string; status: string; gateId: string }) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
      if (error) throw error
      return { gateId }
    },
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['tasks', variables.gateId] }),
  })
}
