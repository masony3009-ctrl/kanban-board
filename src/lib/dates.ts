import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from 'date-fns'

export type DueUrgency = 'overdue' | 'today' | 'soon' | 'upcoming'

export interface DueInfo {
  label: string
  urgency: DueUrgency
}

export function parseDueDate(dueDate: string): Date {
  return new Date(`${dueDate}T00:00:00`)
}

export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function dueInfo(dueDate: string | null): DueInfo | null {
  if (!dueDate) return null
  const date = parseDueDate(dueDate)
  if (Number.isNaN(date.getTime())) return null

  const daysAway = differenceInCalendarDays(date, new Date())
  let label: string
  if (isToday(date)) label = 'Today'
  else if (isTomorrow(date)) label = 'Tomorrow'
  else if (isYesterday(date)) label = 'Yesterday'
  else label = format(date, date.getFullYear() === new Date().getFullYear() ? 'MMM d' : 'MMM d, yyyy')

  let urgency: DueUrgency
  if (daysAway < 0) urgency = 'overdue'
  else if (daysAway === 0) urgency = 'today'
  else if (daysAway <= 2) urgency = 'soon'
  else urgency = 'upcoming'

  return { label, urgency }
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const date = parseDueDate(dueDate)
  if (Number.isNaN(date.getTime())) return false
  return differenceInCalendarDays(date, new Date()) < 0
}
