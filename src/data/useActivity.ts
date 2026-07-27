import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'
import type { ActivityEvent, ActivityType } from '@/types'

const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  'created',
  'status_changed',
  'priority_changed',
  'due_date_changed',
  'edited',
  'assigned',
  'unassigned',
  'label_added',
  'label_removed',
  'commented',
])

function isActivityType(value: string): value is ActivityType {
  return ACTIVITY_TYPES.has(value)
}

function toMeta(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function useActivity(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.activity(taskId ?? 'none'),
    enabled: taskId !== null && !taskId.startsWith('temp-'),
    queryFn: async (): Promise<ActivityEvent[]> => {
      const { data, error } = await supabase
        .from('task_activity')
        .select('*')
        .eq('task_id', taskId ?? '')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data.flatMap((row) => {
        if (!isActivityType(row.event_type)) return []
        return [
          {
            id: row.id,
            taskId: row.task_id,
            type: row.event_type,
            meta: toMeta(row.meta),
            createdAt: row.created_at,
          },
        ]
      })
    },
  })
}
