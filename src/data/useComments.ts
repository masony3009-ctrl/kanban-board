import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { friendlyError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'
import { isTempId } from './useTasks'
import type { Task, TaskComment } from '@/types'

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.comments(taskId ?? 'none'),
    enabled: taskId !== null && !isTempId(taskId),
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('task_id', taskId ?? '')
        .order('created_at')
      if (error) throw new Error(error.message)
      return data.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        body: row.body,
        createdAt: row.created_at,
      }))
    },
  })
}

function bumpCommentCount(tasks: Task[], taskId: string, delta: number): Task[] {
  return tasks.map((task) =>
    task.id === taskId ? { ...task, commentCount: Math.max(0, task.commentCount + delta) } : task,
  )
}

interface CommentContext {
  previousComments: TaskComment[] | undefined
  previousTasks: Task[] | undefined
}

async function snapshot(
  queryClient: QueryClient,
  taskId: string,
): Promise<CommentContext> {
  const key = queryKeys.comments(taskId)
  await queryClient.cancelQueries({ queryKey: key })
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks })
  return {
    previousComments: queryClient.getQueryData<TaskComment[]>(key),
    previousTasks: queryClient.getQueryData<Task[]>(queryKeys.tasks),
  }
}

function restore(queryClient: QueryClient, taskId: string, context: CommentContext | undefined) {
  if (!context) return
  if (context.previousComments !== undefined) {
    queryClient.setQueryData(queryKeys.comments(taskId), context.previousComments)
  }
  if (context.previousTasks !== undefined) {
    queryClient.setQueryData(queryKeys.tasks, context.previousTasks)
  }
}

function settle(queryClient: QueryClient, taskId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
  void queryClient.invalidateQueries({ queryKey: queryKeys.allActivity })
}

export function useAddComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; body: string }): Promise<void> => {
      const { error } = await supabase
        .from('comments')
        .insert({ task_id: input.taskId, body: input.body.trim() })
      if (error) throw new Error(error.message)
    },
    onMutate: async (input) => {
      const context = await snapshot(queryClient, input.taskId)
      const optimistic: TaskComment = {
        id: `temp-${crypto.randomUUID()}`,
        taskId: input.taskId,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<TaskComment[]>(queryKeys.comments(input.taskId), (old) => [
        ...(old ?? []),
        optimistic,
      ])
      queryClient.setQueryData<Task[]>(queryKeys.tasks, (old) =>
        bumpCommentCount(old ?? [], input.taskId, 1),
      )
      return context
    },
    onError: (error, input, context) => {
      restore(queryClient, input.taskId, context)
      toast.error(friendlyError(error, 'Could not post the comment. Please try again.'))
    },
    onSettled: (_data, _error, input) => settle(queryClient, input.taskId),
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; commentId: string }): Promise<void> => {
      if (isTempId(input.commentId)) {
        throw new Error('That comment is still being saved. Try again in a moment.')
      }
      const { error } = await supabase.from('comments').delete().eq('id', input.commentId)
      if (error) throw new Error(error.message)
    },
    onMutate: async (input) => {
      const context = await snapshot(queryClient, input.taskId)
      queryClient.setQueryData<TaskComment[]>(queryKeys.comments(input.taskId), (old) =>
        (old ?? []).filter((comment) => comment.id !== input.commentId),
      )
      queryClient.setQueryData<Task[]>(queryKeys.tasks, (old) =>
        bumpCommentCount(old ?? [], input.taskId, -1),
      )
      return context
    },
    onError: (error, input, context) => {
      restore(queryClient, input.taskId, context)
      toast.error(friendlyError(error, 'Could not delete the comment. Please try again.'))
    },
    onSettled: (_data, _error, input) => settle(queryClient, input.taskId),
  })
}
