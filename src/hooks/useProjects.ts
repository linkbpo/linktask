import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*, gates(id, number, status)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .single()
      if (!profile?.tenant_id) throw new Error('Usuário sem tenant configurado')

      const { data, error } = await supabase
        .from('projects')
        .insert({ name, description, tenant_id: profile.tenant_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}
