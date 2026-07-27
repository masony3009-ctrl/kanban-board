export const STATUSES = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'in_review', label: 'In Review' },
  { id: 'done', label: 'Done' },
] as const

export type Status = (typeof STATUSES)[number]['id']

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

export const PRIORITIES = [
  { id: 'high', label: 'High' },
  { id: 'normal', label: 'Normal' },
  { id: 'low', label: 'Low' },
] as const

export type Priority = (typeof PRIORITIES)[number]['id']

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  dueDate: string | null
  position: number
  createdAt: string
  labelIds: string[]
  assigneeIds: string[]
  commentCount: number
}

export interface TeamMember {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Label {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface TaskComment {
  id: string
  taskId: string
  body: string
  createdAt: string
}

export type ActivityType =
  | 'created'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'edited'
  | 'assigned'
  | 'unassigned'
  | 'label_added'
  | 'label_removed'
  | 'commented'

export interface ActivityEvent {
  id: string
  taskId: string
  type: ActivityType
  meta: Record<string, unknown>
  createdAt: string
}

export interface BoardFilters {
  search: string
  priorities: Priority[]
  assigneeIds: string[]
  labelIds: string[]
}

export const EMPTY_FILTERS: BoardFilters = {
  search: '',
  priorities: [],
  assigneeIds: [],
  labelIds: [],
}

export function countActiveFilters(filters: BoardFilters): number {
  return (
    (filters.priorities.length > 0 ? 1 : 0) +
    (filters.assigneeIds.length > 0 ? 1 : 0) +
    (filters.labelIds.length > 0 ? 1 : 0)
  )
}

export function hasAnyFilter(filters: BoardFilters): boolean {
  return filters.search.trim().length > 0 || countActiveFilters(filters) > 0
}

export function taskMatchesFilters(task: Task, filters: BoardFilters): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search && !task.title.toLowerCase().includes(search)) return false
  if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false
  if (
    filters.assigneeIds.length > 0 &&
    !filters.assigneeIds.some((id) => task.assigneeIds.includes(id))
  ) {
    return false
  }
  if (filters.labelIds.length > 0 && !filters.labelIds.some((id) => task.labelIds.includes(id))) {
    return false
  }
  return true
}
