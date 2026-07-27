import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { isTempId } from './useTasks'
import { queryKeys } from './keys'
import type { Task, TeamMember } from '@/types'

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at')
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

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; color: string }): Promise<void> => {
      const { error } = await supabase
        .from('team_members')
        .insert({ name: input.name.trim(), color: input.color })
      if (error) throw new Error(error.message)
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members })
      const previous = queryClient.getQueryData<TeamMember[]>(queryKeys.members)
      const optimistic: TeamMember = {
        id: `temp-${crypto.randomUUID()}`,
        name: input.name.trim(),
        color: input.color,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<TeamMember[]>(queryKeys.members, (old) => [
        ...(old ?? []),
        optimistic,
      ])
      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.members, context.previous)
      }
      toast.error(friendlyError(error, 'Could not add the team member. Please try again.'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isTempId(id)) {
        throw new Error('That member is still being saved. Try again in a moment.')
      }
      const { error } = await supabase.from('team_members').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.members })
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks })
      const previousMembers = queryClient.getQueryData<TeamMember[]>(queryKeys.members)
      const previousTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks)
      queryClient.setQueryData<TeamMember[]>(queryKeys.members, (old) =>
        (old ?? []).filter((member) => member.id !== id),
      )
      queryClient.setQueryData<Task[]>(queryKeys.tasks, (old) =>
        (old ?? []).map((task) =>
          task.assigneeIds.includes(id)
            ? { ...task, assigneeIds: task.assigneeIds.filter((a) => a !== id) }
            : task,
        ),
      )
      return { previousMembers, previousTasks }
    },
    onError: (error, _id, context) => {
      if (context?.previousMembers !== undefined) {
        queryClient.setQueryData(queryKeys.members, context.previousMembers)
      }
      if (context?.previousTasks !== undefined) {
        queryClient.setQueryData(queryKeys.tasks, context.previousTasks)
      }
      toast.error(friendlyError(error, 'Could not remove the team member. Please try again.'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members })
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
      void queryClient.invalidateQueries({ queryKey: queryKeys.allActivity })
    },
  })
}
