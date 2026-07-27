import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'
import { taskMutationsInFlight } from './useTasks'
import type { Label, Task, TeamMember } from '@/types'

type InvalidationKey = readonly string[]

const TABLE_INVALIDATIONS: Record<string, InvalidationKey[]> = {
  tasks: [queryKeys.tasks],
  task_labels: [queryKeys.tasks],
  task_assignees: [queryKeys.tasks],
  team_members: [queryKeys.members, queryKeys.tasks],
  labels: [queryKeys.labels, queryKeys.tasks],
  comments: [queryKeys.allComments, queryKeys.tasks],
  task_activity: [queryKeys.allActivity],
}

function idOf(record: unknown, key: string): string | null {
  if (typeof record !== 'object' || record === null) return null
  const value = (record as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

// Supabase cannot filter DELETE events (a deleted row cannot be checked against
// a policy), so every subscriber receives other guests' deleted primary keys.
// Ignore the ones that match nothing in this guest's cache.
function deleteAffectsThisGuest(
  queryClient: QueryClient,
  table: string,
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
): boolean {
  const old = payload.old
  const tasks = queryClient.getQueryData<Task[]>(queryKeys.tasks)
  const taskId = idOf(old, 'task_id')

  switch (table) {
    case 'tasks': {
      const id = idOf(old, 'id')
      return id === null || (tasks?.some((task) => task.id === id) ?? true)
    }
    case 'task_labels':
    case 'task_assignees':
    case 'comments':
    case 'task_activity':
      return taskId === null || (tasks?.some((task) => task.id === taskId) ?? true)
    case 'team_members': {
      const id = idOf(old, 'id')
      const members = queryClient.getQueryData<TeamMember[]>(queryKeys.members)
      return id === null || (members?.some((member) => member.id === id) ?? true)
    }
    case 'labels': {
      const id = idOf(old, 'id')
      const labels = queryClient.getQueryData<Label[]>(queryKeys.labels)
      return id === null || (labels?.some((label) => label.id === id) ?? true)
    }
    default:
      return true
  }
}

export function useRealtimeSync(userId: string | null): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel(`board-${userId}`)
    for (const [table, keys] of Object.entries(TABLE_INVALIDATIONS)) {
      channel.on<Record<string, unknown>>(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE' && !deleteAffectsThisGuest(queryClient, table, payload)) {
            return
          }
          if (taskMutationsInFlight(queryClient) > 0) return
          for (const key of keys) {
            void queryClient.invalidateQueries({ queryKey: key })
          }
        },
      )
    }
    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, queryClient])
}
