import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function usePushSheets() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('push-sheets')
      if (error) throw error
      return data
    },
  })
}

export function useSyncDrive() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke('sync-drive', {
        body: { project_id: projectId },
      })
      if (error) throw error
      return data
    },
  })
}
