import type { ReactNode } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'
import { PriorityIcon } from '@/components/task/pickers'
import { MemberAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LabelPill } from '@/components/ui/misc'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  countActiveFilters,
  PRIORITIES,
  type BoardFilters,
  type Label,
  type Priority,
  type TeamMember,
} from '@/types'

function toggleValue<T>(values: T[], value: T, active: boolean): T[] {
  return active ? [...values, value] : values.filter((item) => item !== value)
}

function FilterRow({
  active,
  onToggle,
  children,
}: {
  active: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={cn(
        'focus-ring flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-ink hover:bg-surface-3',
        active && 'bg-accent/8',
      )}
    >
      {children}
      {active && <Check size={14} className="ml-auto shrink-0 text-accent" aria-hidden />}
    </button>
  )
}

interface FilterPopoverProps {
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
  members: TeamMember[]
  labels: Label[]
}

export function FilterPopover({ filters, onChange, members, labels }: FilterPopoverProps) {
  const activeCount = countActiveFilters(filters)

  function setPriority(priority: Priority, active: boolean) {
    onChange({ ...filters, priorities: toggleValue(filters.priorities, priority, active) })
  }
  function setAssignee(memberId: string, active: boolean) {
    onChange({ ...filters, assigneeIds: toggleValue(filters.assigneeIds, memberId, active) })
  }
  function setLabel(labelId: string, active: boolean) {
    onChange({ ...filters, labelIds: toggleValue(filters.labelIds, labelId, active) })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="onGradient" size="sm">
          <SlidersHorizontal size={14} aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-accent">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="flex items-center justify-between px-1.5 pt-1 pb-1.5">
          <p className="text-xs font-semibold text-ink-2">Filter cards</p>
          {(activeCount > 0 || filters.search !== '') && (
            <button
              type="button"
              onClick={() =>
                onChange({ search: '', priorities: [], assigneeIds: [], labelIds: [] })
              }
              className="focus-ring cursor-pointer rounded text-xs font-medium text-accent hover:underline"
            >
              {filters.search !== '' && activeCount === 0 ? 'Clear search' : 'Clear all'}
            </button>
          )}
        </div>

        <p className="px-1.5 pt-1 pb-0.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          Priority
        </p>
        {PRIORITIES.map((priority) => (
          <FilterRow
            key={priority.id}
            active={filters.priorities.includes(priority.id)}
            onToggle={() => setPriority(priority.id, !filters.priorities.includes(priority.id))}
          >
            <PriorityIcon priority={priority.id} />
            {priority.label}
          </FilterRow>
        ))}

        <p className="px-1.5 pt-2.5 pb-0.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          Assignee
        </p>
        {members.length === 0 && (
          <p className="px-1.5 py-1 text-sm text-ink-3">Add team members to filter by assignee.</p>
        )}
        {members.map((member) => (
          <FilterRow
            key={member.id}
            active={filters.assigneeIds.includes(member.id)}
            onToggle={() => setAssignee(member.id, !filters.assigneeIds.includes(member.id))}
          >
            <MemberAvatar member={member} size={22} />
            <span className="truncate">{member.name}</span>
          </FilterRow>
        ))}

        <p className="px-1.5 pt-2.5 pb-0.5 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          Label
        </p>
        {labels.length === 0 && (
          <p className="px-1.5 py-1 text-sm text-ink-3">Create labels to filter by them.</p>
        )}
        {labels.map((label) => (
          <FilterRow
            key={label.id}
            active={filters.labelIds.includes(label.id)}
            onToggle={() => setLabel(label.id, !filters.labelIds.includes(label.id))}
          >
            <LabelPill name={label.name} color={label.color} className="h-5" />
          </FilterRow>
        ))}
      </PopoverContent>
    </Popover>
  )
}
