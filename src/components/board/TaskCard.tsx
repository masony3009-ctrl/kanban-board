import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlignLeft, ArrowDown, Check, Clock, Flag, MessageSquare, Pencil } from 'lucide-react'
import { AvatarStack } from '@/components/ui/avatar'
import { LabelPill } from '@/components/ui/misc'
import { isTempId } from '@/data/useTasks'
import { dueInfo, type DueInfo } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Label, Task, TeamMember } from '@/types'

export interface CardLookups {
  labelById: Map<string, Label>
  memberById: Map<string, TeamMember>
}

function DueBadge({ due, done }: { due: DueInfo; done: boolean }) {
  const tone = done
    ? 'bg-ok/15 text-ok-ink'
    : due.urgency === 'overdue'
      ? 'bg-danger/15 text-danger-ink'
      : due.urgency === 'today' || due.urgency === 'soon'
        ? 'bg-warn/15 text-warn-ink'
        : 'text-ink-2'
  const title = done
    ? 'Completed'
    : due.urgency === 'overdue'
      ? 'Overdue'
      : due.urgency === 'today'
        ? 'Due today'
        : due.urgency === 'soon'
          ? 'Due soon'
          : 'Due date'
  const Icon = done ? Check : Clock
  return (
    <span
      title={title}
      className={cn('flex items-center gap-1 rounded-sm px-1 py-0.5 text-xs font-medium', tone)}
    >
      <Icon size={12} aria-hidden />
      {due.label}
    </span>
  )
}

export function TaskCardContent({ task, lookups }: { task: Task; lookups: CardLookups }) {
  const labels = task.labelIds.flatMap((id) => {
    const label = lookups.labelById.get(id)
    return label ? [label] : []
  })
  const assignees = task.assigneeIds.flatMap((id) => {
    const member = lookups.memberById.get(id)
    return member ? [member] : []
  })
  const due = dueInfo(task.dueDate)
  const hasMetaRow =
    due !== null ||
    task.priority !== 'normal' ||
    task.description.length > 0 ||
    task.commentCount > 0 ||
    assignees.length > 0

  return (
    <>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <LabelPill key={label.id} name={label.name} color={label.color} />
          ))}
        </div>
      )}
      <p className="pr-5 text-sm leading-snug break-words text-ink">{task.title}</p>
      {hasMetaRow && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {due && <DueBadge due={due} done={task.status === 'done'} />}
          {task.priority === 'high' && (
            <Flag size={12} className="text-danger" fill="currentColor" aria-label="High priority" />
          )}
          {task.priority === 'low' && (
            <ArrowDown size={13} className="text-ink-3" aria-label="Low priority" />
          )}
          {task.description.length > 0 && (
            <AlignLeft size={13} className="text-ink-3" aria-label="Has description" />
          )}
          {task.commentCount > 0 && (
            <span
              className="flex items-center gap-1 text-xs text-ink-3"
              aria-label={`${task.commentCount} comments`}
            >
              <MessageSquare size={12} aria-hidden />
              {task.commentCount}
            </span>
          )}
          <span className="flex-1" aria-hidden />
          <AvatarStack members={assignees} size={22} ringClassName="ring-card" />
        </div>
      )}
    </>
  )
}

interface TaskCardProps {
  task: Task
  lookups: CardLookups
  onOpen: (id: string) => void
}

export const TaskCard = memo(function TaskCard({ task, lookups, onOpen }: TaskCardProps) {
  const temp = isTempId(task.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', status: task.status },
    disabled: temp,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!temp) onOpen(task.id)
      }}
      className={cn(
        'card-shadow group relative flex cursor-pointer flex-col gap-1.5 rounded-lg bg-card p-2.5 hover:ring-2 hover:ring-accent/50',
        isDragging && 'opacity-40',
        temp && 'opacity-60',
      )}
    >
      <TaskCardContent task={task} lookups={lookups} />
      {!temp && (
        <button
          type="button"
          aria-label={`Open card: ${task.title}`}
          onClick={(event) => {
            event.stopPropagation()
            onOpen(task.id)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className="focus-ring pointer-events-none absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-md bg-card/95 text-ink-3 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-surface-3 hover:text-ink focus-visible:pointer-events-auto focus-visible:opacity-100"
        >
          <Pencil size={12} aria-hidden />
        </button>
      )}
    </div>
  )
})

export function TaskCardOverlay({ task, lookups }: { task: Task; lookups: CardLookups }) {
  return (
    <div className="card-shadow flex w-[260px] rotate-3 cursor-grabbing flex-col gap-1.5 rounded-lg bg-card p-2.5 shadow-xl ring-2 ring-accent/40">
      <TaskCardContent task={task} lookups={lookups} />
    </div>
  )
}
