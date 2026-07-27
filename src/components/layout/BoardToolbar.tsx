import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Layers, Plus, Search, UsersRound, X } from 'lucide-react'
import { FilterPopover } from './FilterPopover'
import { AvatarStack } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SimpleTooltip } from '@/components/ui/tooltip'
import { isOverdue } from '@/lib/dates'
import { cn, pluralize } from '@/lib/utils'
import type { BoardFilters, Label, Task, TeamMember } from '@/types'

function StatPill({
  icon,
  label,
  tooltip,
  tone = 'default',
}: {
  icon: ReactNode
  label: string
  tooltip: string
  tone?: 'default' | 'danger'
}) {
  return (
    <SimpleTooltip label={tooltip}>
      <span
        tabIndex={0}
        aria-label={`${label}. ${tooltip}`}
        className={cn(
          'focus-ring-on-gradient flex cursor-default items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white',
          tone === 'danger' ? 'bg-rose-600' : 'bg-black/25',
        )}
      >
        {icon}
        {label}
      </span>
    </SimpleTooltip>
  )
}

interface BoardToolbarProps {
  tasks: Task[]
  members: TeamMember[]
  labels: Label[]
  filters: BoardFilters
  onFiltersChange: (filters: BoardFilters) => void
  onOpenTeam: () => void
  onNewCard: () => void
}

export function BoardToolbar({
  tasks,
  members,
  labels,
  filters,
  onFiltersChange,
  onOpenTeam,
  onNewCard,
}: BoardToolbarProps) {
  const total = tasks.length
  const done = tasks.filter((task) => task.status === 'done').length
  const overdue = tasks.filter((task) => task.status !== 'done' && isOverdue(task.dueDate)).length

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3">
      <h1 className="text-base font-bold text-white drop-shadow-sm sm:text-lg">Team Board</h1>

      <div className="flex items-center gap-1.5">
        <StatPill
          icon={<Layers size={12} aria-hidden />}
          label={`${total} ${pluralize(total, 'card')}`}
          tooltip="Total cards on this board"
        />
        <StatPill
          icon={<CircleCheck size={12} aria-hidden />}
          label={`${done} done`}
          tooltip="Cards in the Done column"
        />
        {overdue > 0 && (
          <StatPill
            tone="danger"
            icon={<CircleAlert size={12} aria-hidden />}
            label={`${overdue} overdue`}
            tooltip="Cards past their due date and not done"
          />
        )}
      </div>

      <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
        <div className="relative w-full min-w-44 flex-1 sm:w-56 sm:flex-none">
          <Search
            size={14}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 text-white/85"
            aria-hidden
          />
          <input
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Search cards…"
            aria-label="Search cards by title"
            className="focus-ring-on-gradient h-8 w-full rounded-md bg-black/25 pr-8 pl-8 text-sm text-white transition-colors placeholder:text-white/80 focus:bg-black/35"
          />
          {filters.search !== '' && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onFiltersChange({ ...filters, search: '' })}
              className="focus-ring-on-gradient absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded p-1 text-white/85 hover:bg-white/20 hover:text-white"
            >
              <X size={13} aria-hidden />
            </button>
          )}
        </div>

        <FilterPopover
          filters={filters}
          onChange={onFiltersChange}
          members={members}
          labels={labels}
        />

        {members.length > 0 ? (
          <SimpleTooltip label="Manage team">
            <button
              type="button"
              aria-label={`Manage team (${members.length} ${pluralize(members.length, 'member')})`}
              onClick={onOpenTeam}
              className="focus-ring-on-gradient cursor-pointer rounded-full"
            >
              <AvatarStack members={members} size={28} max={4} ringClassName="ring-white/50" />
            </button>
          </SimpleTooltip>
        ) : (
          <Button variant="onGradient" size="sm" onClick={onOpenTeam}>
            <UsersRound size={14} aria-hidden />
            Team
          </Button>
        )}

        <Button
          size="sm"
          onClick={onNewCard}
          className="focus-ring-on-gradient bg-white text-ink shadow-sm hover:bg-white/90"
        >
          <Plus size={15} aria-hidden />
          New card
        </Button>
      </div>
    </div>
  )
}
