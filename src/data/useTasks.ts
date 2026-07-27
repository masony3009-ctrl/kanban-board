import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'
import { friendlyError } from '@/lib/errors'
import { positionAfter, sequentialPositions } from '@/lib/position'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'
import type { Priority, Status, Task } from '@/types'

interface TaskJoinRow {
  id: string
  user_id: string
  title: string
  description: string
  status: Status
  priority: Priority
  due_date: string | null
  position: number
  created_at: string
  updated_at: string
  task_labels: { label_id: string }[]
  task_assignees: { member_id: string }[]
  comments?: { count: number }[]
}

const TASK_SELECT_WITH_COUNT =
  '*, task_labels(label_id), task_assignees(member_id), comments(count)'
const TASK_SELECT_PLAIN = '*, task_labels(label_id), task_assignees(member_id)'

const TASK_MUTATION_KEY = ['task-mutation'] as const

// Thrown when the task row committed but one of its junction inserts did not,
// so the failure can be reported without discarding a card that exists.
class PartialCreateError extends Error {}

function mapTask(row: TaskJoinRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    labelIds: row.task_labels.map((l) => l.label_id),
    assigneeIds: row.task_assignees.map((a) => a.member_id),
    commentCount: row.comments?.[0]?.count ?? 0,
  }
}

export function isTempId(id: string): boolean {
  return id.startsWith('temp-')
}

function cachedTasks(queryClient: QueryClient): Task[] {
  return queryClient.getQueryData<Task[]>(queryKeys.tasks) ?? []
}

// Optimistic rows count here, so two cards created in quick succession get
// distinct positions instead of colliding on the same value.
function endPosition(tasks: Task[], status: Status, excludeId?: string): number {
  const positions = tasks
    .filter((t) => t.status === status && t.id !== excludeId)
    .map((t) => t.position)
  return positionAfter(positions)
}

async function snapshotTasks(queryClient: QueryClient): Promise<Task[] | undefined> {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks })
  return queryClient.getQueryData<Task[]>(queryKeys.tasks)
}

function patchTasksCache(queryClient: QueryClient, updater: (tasks: Task[]) => Task[]): void {
  queryClient.setQueryData<Task[]>(queryKeys.tasks, (old) => updater(old ?? []))
}

function rollback(queryClient: QueryClient, previous: Task[] | undefined): void {
  if (previous !== undefined) queryClient.setQueryData(queryKeys.tasks, previous)
}

export function taskMutationsInFlight(queryClient: QueryClient): number {
  return queryClient.isMutating({ mutationKey: TASK_MUTATION_KEY })
}

// Refetch only once the last task mutation settles. Invalidating while another
// is still pending lets a response that predates its write overwrite the
// optimistic patch, which shows up as cards jumping back mid-drag.
function settle(queryClient: QueryClient): void {
  // The mutation running this callback still counts as pending.
  if (taskMutationsInFlight(queryClient) > 1) return
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks })
  void queryClient.invalidateQueries({ queryKey: queryKeys.allActivity })
}

export function useTasks() {
  return useQuery({
    queryKey: queryKeys.tasks,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_SELECT_WITH_COUNT)
        .order('position')
        .overrideTypes<TaskJoinRow[], { merge: false }>()

      if (!error) return data.map(mapTask)

      // Embedded aggregates can be disabled per project; the board works
      // without comment counts, so fall back rather than fail outright.
      const { data: plain, error: plainError } = await supabase
        .from('tasks')
        .select(TASK_SELECT_PLAIN)
        .order('position')
        .overrideTypes<TaskJoinRow[], { merge: false }>()
      if (plainError) throw new Error(plainError.message)
      return plain.map(mapTask)
    },
  })
}

export interface CreateTaskInput {
  title: string
  status: Status
  description?: string
  priority?: Priority
  dueDate?: string | null
  labelIds?: string[]
  assigneeIds?: string[]
}

type CreateTaskPayload = CreateTaskInput & { position: number }

export function useCreateTask() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async (input: CreateTaskPayload): Promise<void> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: input.title.trim(),
          status: input.status,
          description: input.description?.trim() ?? '',
          priority: input.priority ?? 'normal',
          due_date: input.dueDate ?? null,
          position: input.position,
        })
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      const labelIds = (input.labelIds ?? []).filter((id) => !isTempId(id))
      if (labelIds.length > 0) {
        const { error: labelError } = await supabase
          .from('task_labels')
          .insert(labelIds.map((label_id) => ({ task_id: data.id, label_id })))
        if (labelError) throw new PartialCreateError(labelError.message)
      }

      const assigneeIds = (input.assigneeIds ?? []).filter((id) => !isTempId(id))
      if (assigneeIds.length > 0) {
        const { error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assigneeIds.map((member_id) => ({ task_id: data.id, member_id })))
        if (assigneeError) throw new PartialCreateError(assigneeError.message)
      }
    },
    onMutate: async (input) => {
      const previous = await snapshotTasks(queryClient)
      const optimistic: Task = {
        id: `temp-${crypto.randomUUID()}`,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        status: input.status,
        priority: input.priority ?? 'normal',
        dueDate: input.dueDate ?? null,
        position: input.position,
        createdAt: new Date().toISOString(),
        labelIds: input.labelIds ?? [],
        assigneeIds: input.assigneeIds ?? [],
        commentCount: 0,
      }
      patchTasksCache(queryClient, (tasks) => [...tasks, optimistic])
      return { previous }
    },
    onError: (error, _input, context) => {
      if (error instanceof PartialCreateError) {
        toast.error('Card created, but its labels or members could not be attached.')
        return
      }
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not create the card. Please try again.'))
    },
    onSettled: () => settle(queryClient),
  })

  return {
    isPending: mutation.isPending,
    create(input: CreateTaskInput) {
      mutation.mutate({
        ...input,
        position: endPosition(cachedTasks(queryClient), input.status),
      })
    },
  }
}

export interface UpdateTaskInput {
  id: string
  title?: string
  description?: string
  status?: Status
  // Required alongside `status`: distinguishes a real column change from
  // re-picking the status the card already has, which must not move it.
  previousStatus?: Status
  priority?: Priority
  dueDate?: string | null
}

type TaskUpdatePatch = Database['public']['Tables']['tasks']['Update']

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async (input: UpdateTaskInput): Promise<void> => {
      if (isTempId(input.id)) return
      const tasks = cachedTasks(queryClient)
      const patch: TaskUpdatePatch = {}
      if (input.title !== undefined) patch.title = input.title.trim()
      if (input.description !== undefined) patch.description = input.description
      if (input.priority !== undefined) patch.priority = input.priority
      if (input.dueDate !== undefined) patch.due_date = input.dueDate
      if (input.status !== undefined && input.status !== input.previousStatus) {
        patch.status = input.status
        patch.position = endPosition(tasks, input.status, input.id)
      }
      if (Object.keys(patch).length === 0) return
      const { error } = await supabase.from('tasks').update(patch).eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (input) => {
      const previous = await snapshotTasks(queryClient)
      patchTasksCache(queryClient, (tasks) =>
        tasks.map((task) => {
          if (task.id !== input.id) return task
          const nextStatus = input.status ?? task.status
          const statusChanged = nextStatus !== task.status
          return {
            ...task,
            title: input.title !== undefined ? input.title.trim() : task.title,
            description: input.description ?? task.description,
            priority: input.priority ?? task.priority,
            dueDate: input.dueDate !== undefined ? input.dueDate : task.dueDate,
            status: nextStatus,
            position: statusChanged
              ? endPosition(previous ?? [], nextStatus, task.id)
              : task.position,
          }
        }),
      )
      return { previous }
    },
    onError: (error, _input, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not save your changes. Please try again.'))
    },
    onSettled: () => settle(queryClient),
  })
}

export interface MoveTaskInput {
  id: string
  status: Status
  position: number
  // Snapshot taken before the board applied its own optimistic patch, so a
  // failed move can still roll back to the pre-drag state.
  previous?: Task[]
}

export function applyMovePatch(
  queryClient: QueryClient,
  move: { id: string; status: Status; position: number },
): void {
  patchTasksCache(queryClient, (tasks) =>
    tasks.map((task) =>
      task.id === move.id ? { ...task, status: move.status, position: move.position } : task,
    ),
  )
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async (input: MoveTaskInput): Promise<void> => {
      if (isTempId(input.id)) return
      const { error } = await supabase
        .from('tasks')
        .update({ status: input.status, position: input.position })
        .eq('id', input.id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (input) => {
      const previous = input.previous ?? (await snapshotTasks(queryClient))
      applyMovePatch(queryClient, input)
      return { previous }
    },
    onError: (error, _input, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not move the card. It has been put back.'))
    },
    onSettled: () => settle(queryClient),
  })
}

export interface RenumberInput {
  orderedIds: string[]
  previous?: Task[]
}

// Only needed when repeated midpoint splits shrink a gap past float precision.
export function useRenumberColumn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async ({ orderedIds }: RenumberInput): Promise<void> => {
      const positions = sequentialPositions(orderedIds.length)
      const updates = orderedIds.flatMap((id, index) => {
        const position = positions[index]
        if (isTempId(id) || position === undefined) return []
        return [supabase.from('tasks').update({ position }).eq('id', id)]
      })
      const results = await Promise.all(updates)
      const failed = results.find((result) => result.error)
      if (failed?.error) throw new Error(failed.error.message)
    },
    onMutate: async ({ orderedIds, previous }) => {
      const snapshot = previous ?? (await snapshotTasks(queryClient))
      const positions = sequentialPositions(orderedIds.length)
      const positionById = new Map(orderedIds.map((id, index) => [id, positions[index]]))
      patchTasksCache(queryClient, (tasks) =>
        tasks.map((task) => {
          const position = positionById.get(task.id)
          return position === undefined ? task : { ...task, position }
        }),
      )
      return { previous: snapshot }
    },
    onError: (error, _input, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not reorder the column. Please try again.'))
    },
    onSettled: () => settle(queryClient),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async (id: string): Promise<void> => {
      if (isTempId(id)) throw new Error('This card is still being saved. Try again in a moment.')
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      const previous = await snapshotTasks(queryClient)
      patchTasksCache(queryClient, (tasks) => tasks.filter((task) => task.id !== id))
      return { previous }
    },
    onError: (error, _id, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not delete the card. Please try again.'))
    },
    onSuccess: () => {
      toast.success('Card deleted')
    },
    onSettled: () => settle(queryClient),
  })
}

export interface ToggleInput {
  taskId: string
  targetId: string
  active: boolean
}

export function useToggleTaskLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async ({ taskId, targetId, active }: ToggleInput): Promise<void> => {
      if (isTempId(taskId) || isTempId(targetId)) return
      if (active) {
        const { error } = await supabase
          .from('task_labels')
          .insert({ task_id: taskId, label_id: targetId })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('task_labels')
          .delete()
          .eq('task_id', taskId)
          .eq('label_id', targetId)
        if (error) throw new Error(error.message)
      }
    },
    onMutate: async ({ taskId, targetId, active }) => {
      const previous = await snapshotTasks(queryClient)
      patchTasksCache(queryClient, (tasks) =>
        tasks.map((task) => {
          if (task.id !== taskId) return task
          const labelIds = active
            ? [...task.labelIds, targetId]
            : task.labelIds.filter((id) => id !== targetId)
          return { ...task, labelIds }
        }),
      )
      return { previous }
    },
    onError: (error, _input, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not update labels. Please try again.'))
    },
    onSettled: () => settle(queryClient),
  })
}

export function useToggleTaskAssignee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TASK_MUTATION_KEY,
    mutationFn: async ({ taskId, targetId, active }: ToggleInput): Promise<void> => {
      if (isTempId(taskId) || isTempId(targetId)) return
      if (active) {
        const { error } = await supabase
          .from('task_assignees')
          .insert({ task_id: taskId, member_id: targetId })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', taskId)
          .eq('member_id', targetId)
        if (error) throw new Error(error.message)
      }
    },
    onMutate: async ({ taskId, targetId, active }) => {
      const previous = await snapshotTasks(queryClient)
      patchTasksCache(queryClient, (tasks) =>
        tasks.map((task) => {
          if (task.id !== taskId) return task
          const assigneeIds = active
            ? [...task.assigneeIds, targetId]
            : task.assigneeIds.filter((id) => id !== targetId)
          return { ...task, assigneeIds }
        }),
      )
      return { previous }
    },
    onError: (error, _input, context) => {
      rollback(queryClient, context?.previous)
      toast.error(friendlyError(error, 'Could not update assignees. Please try again.'))
    },
    onSettled: () => settle(queryClient),
  })
}
