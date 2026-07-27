import { format, formatDistanceToNow } from 'date-fns'
import { History } from 'lucide-react'
import { Skeleton } from '@/components/ui/misc'
import { useActivity } from '@/data/useActivity'
import { parseDueDate } from '@/lib/dates'
import { PRIORITY_LABEL, STATUS_LABEL, type ActivityEvent } from '@/types'

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function statusName(value: string | null): string {
  if (value !== null && value in STATUS_LABEL) return STATUS_LABEL[value as keyof typeof STATUS_LABEL]
  return value ?? 'unknown'
}

function formatDueMeta(value: string | null): string | null {
  if (value === null) return null
  const date = parseDueDate(value)
  if (Number.isNaN(date.getTime())) return null
  return format(date, 'MMM d, yyyy')
}

function describeActivity(event: ActivityEvent): string {
  const { meta } = event
  switch (event.type) {
    case 'created':
      return 'created this card'
    case 'status_changed':
      return `moved this card from ${statusName(metaString(meta, 'from'))} to ${statusName(metaString(meta, 'to'))}`
    case 'priority_changed': {
      const to = metaString(meta, 'to')
      const label = to !== null && to in PRIORITY_LABEL ? PRIORITY_LABEL[to as keyof typeof PRIORITY_LABEL] : to
      return `set the priority to ${label ?? 'unknown'}`
    }
    case 'due_date_changed': {
      const to = formatDueMeta(metaString(meta, 'to'))
      const from = formatDueMeta(metaString(meta, 'from'))
      if (to === null) return 'removed the due date'
      if (from === null) return `set the due date to ${to}`
      return `changed the due date to ${to}`
    }
    case 'edited':
      return `updated the ${metaString(meta, 'field') ?? 'card'}`
    case 'assigned':
      return `assigned ${metaString(meta, 'member_name') ?? 'a member'}`
    case 'unassigned':
      return `removed ${metaString(meta, 'member_name') ?? 'a member'}`
    case 'label_added':
      return `added the “${metaString(meta, 'label_name') ?? 'unknown'}” label`
    case 'label_removed':
      return `removed the “${metaString(meta, 'label_name') ?? 'unknown'}” label`
    case 'commented': {
      const excerpt = metaString(meta, 'excerpt')
      return excerpt ? `commented: “${excerpt}”` : 'commented'
    }
  }
}

export function ActivitySection({ taskId }: { taskId: string }) {
  const activityQuery = useActivity(taskId)
  const events = activityQuery.data ?? []

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <History size={15} aria-hidden />
        Activity
      </h3>
      <div className="mt-3 flex flex-col gap-2.5">
        {activityQuery.isPending && (
          <>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </>
        )}
        {activityQuery.isError && (
          <p className="text-sm text-danger">
            Couldn’t load activity.{' '}
            <button
              type="button"
              onClick={() => void activityQuery.refetch()}
              className="focus-ring cursor-pointer rounded font-medium underline"
            >
              Try again
            </button>
          </p>
        )}
        {activityQuery.isSuccess && events.length === 0 && (
          <p className="text-sm text-ink-3">No activity recorded yet.</p>
        )}
        {events.map((event) => (
          <div key={event.id} className="flex items-baseline gap-2.5">
            <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-ink-3/60" aria-hidden />
            <p className="min-w-0 text-sm break-words text-ink-2">
              <span className="font-semibold text-ink">You</span> {describeActivity(event)}{' '}
              <span className="text-xs whitespace-nowrap text-ink-3">
                · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
