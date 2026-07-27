import { toast } from 'sonner'
import { useCreateTask, type CreateTaskInput } from '@/data/useTasks'
import { useBoardFilters } from './boardFiltersContext'
import { hasAnyFilter, taskMatchesFilters, type Task } from '@/types'

// Creating a card while a filter is active can produce one that is immediately
// hidden, which reads as "nothing happened". Warn instead, with a way out.
export function useCreateCard() {
  const { filters, clearFilters } = useBoardFilters()
  const createTask = useCreateTask()

  return {
    isPending: createTask.isPending,
    create(input: CreateTaskInput) {
      createTask.create(input)
      if (!hasAnyFilter(filters)) return

      const preview: Task = {
        id: 'preview',
        title: input.title,
        description: input.description ?? '',
        status: input.status,
        priority: input.priority ?? 'normal',
        dueDate: input.dueDate ?? null,
        position: 0,
        createdAt: new Date().toISOString(),
        labelIds: input.labelIds ?? [],
        assigneeIds: input.assigneeIds ?? [],
        commentCount: 0,
      }
      if (taskMatchesFilters(preview, filters)) return

      toast.info('Card created, but your filters are hiding it.', {
        action: { label: 'Clear filters', onClick: clearFilters },
      })
    },
  }
}
