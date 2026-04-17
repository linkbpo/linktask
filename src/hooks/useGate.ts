import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function useGate() {
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useQuery({
    queryKey: ['gate', projectId, gateNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gates')
        .select('*, gate_items(*), tasks(*)')
        .eq('project_id', projectId!)
        .eq('number', Number(gateNumber))
        .single()
      if (error) throw error
      return data
    },
    enabled: !!projectId && !!gateNumber,
  })
}

export function useToggleGateItem() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { error } = await supabase
        .from('gate_items')
        .update({ checked })
        .eq('id', itemId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useRequestApproval() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async (gateId: string) => {
      const { error } = await supabase
        .from('gates')
        .update({ status: 'pending_approval' })
        .eq('id', gateId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] }),
  })
}

export function useApproveGate() {
  const queryClient = useQueryClient()
  const { projectId, gateNumber } = useParams<{ projectId: string; gateNumber: string }>()

  return useMutation({
    mutationFn: async ({ gateId, projectId: pid, nextGateNumber }: { gateId: string; projectId: string; nextGateNumber: number }) => {
      await supabase.from('gates').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', gateId)
      if (nextGateNumber <= 13) {
        await supabase.from('gates').update({ status: 'open' }).eq('project_id', pid).eq('number', nextGateNumber)
        await supabase.from('projects').update({ current_gate: nextGateNumber }).eq('id', pid)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gate', projectId, gateNumber] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
