import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AddCardComposer } from './AddCardComposer'
import { TaskCard, type CardLookups } from './TaskCard'
import { COLUMN_DOT } from '@/lib/colors'
import { cn } from '@/lib/utils'
import { STATUS_LABEL, type Status, type Task } from '@/types'

interface ColumnProps {
  status: Status
  tasks: Task[]
  lookups: CardLookups
  onOpenTask: (id: string) => void
  isDropTarget: boolean
}

export function Column({ status, tasks, lookups, onOpenTask, isDropTarget }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: 'column' } })
  const label = STATUS_LABEL[status]

  return (
    <section
      aria-label={`${label} column, ${tasks.length} ${tasks.length === 1 ? 'card' : 'cards'}`}
      className={cn(
        'flex max-h-full w-[276px] shrink-0 snap-start flex-col self-start rounded-xl bg-surface-2 shadow-lg transition-shadow',
        isDropTarget && 'ring-2 ring-white/70 dark:ring-accent/70',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className={cn('h-2 w-2 rounded-full', COLUMN_DOT[status])} aria-hidden />
        <h2 className="text-sm font-semibold text-ink">{label}</h2>
        <span className="ml-auto rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">
          {tasks.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className="nice-scroll flex flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2 pt-1.5"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} lookups={lookups} onOpen={onOpenTask} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div
            className={cn(
              'rounded-lg border-2 border-dashed border-line px-3 py-6 text-center text-xs font-medium text-ink-3 transition-colors',
              isOver && 'border-accent/70 text-accent',
            )}
          >
            {isOver ? 'Release to drop' : 'No cards yet'}
          </div>
        )}
      </div>
      <AddCardComposer status={status} />
    </section>
  )
}
