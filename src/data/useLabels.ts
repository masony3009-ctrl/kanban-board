import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { queryKeys } from './keys'
import type { Label, Task } from '@/types'

export function useLabels() {
  return useQuery({
    queryKey: queryKeys.labels,
    queryFn: async (): Promise<Label[]> => {
      const { data, error } = await supabase.from('labels').select('*').order('created_at')
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        createdAt: row.created_at,
      }))
    },
  })
}

export function useAddLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; color: string }): Promise<Label> => {
      const { data, error } = await supabase
        .from('labels')
        .insert({ name: input.name.trim(), color: input.color })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return { id: data.id, name: data.name, color: data.color, createdAt: data.created_at }
    },
    onError: (error) => {
      toast.error(friendlyError(error,'Could not create the label. Please try again.'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels })
    },
  })
}

export function useRemoveLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('labels').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks })
      const previousLabels = queryClient.getQueryData<Label[]>(queryKeys.labels)
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks)
      queryClient.setQueryData<Label[]>(queryKeys.labels, (old) =>
        (old ?? []).filter((label) => label.id !== id),
      )
      queryClient.setQueryData<Task[]>(queryKeys.tasks, (old) =>
        (old ?? []).map((task) =>
          task.labelIds.includes(id)
            ? { ...task, labelIds: task.labelIds.filter((l) => l !== id) }
            : task,
        ),
      )
      return { previousLabels, previousTasks }
    },
    onError: (error, _id, context) => {
      if (context?.previousLabels !== undefined) {
        queryClient.setQueryData(queryKeys.labels, context.previousLabels)
      }
      if (context?.previousTasks !== undefined) {
        queryClient.setQueryData(queryKeys.tasks, context.previousTasks)
      }
      toast.error(friendlyError(error,'Could not delete the label. Please try again.'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      void queryClient.invalidateQueries({ queryKey: queryKeys.allActivity })
    },
  })
}
