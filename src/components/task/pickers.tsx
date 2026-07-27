import { useState, type ReactNode } from 'react'
import { ArrowDown, Check, Flag, Minus, Trash2, UsersRound } from 'lucide-react'
import { MemberAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown'
import { Input } from '@/components/ui/input'
import { LabelPill, Spinner } from '@/components/ui/misc'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAddLabel, useRemoveLabel } from '@/data/useLabels'
import { COLUMN_DOT, PALETTE } from '@/lib/colors'
import { cn } from '@/lib/utils'
import {
  PRIORITIES,
  STATUSES,
  type Label,
  type Priority,
  type Status,
  type TeamMember,
} from '@/types'

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  if (priority === 'high') {
    return <Flag size={size} className="text-danger" fill="currentColor" aria-hidden />
  }
  if (priority === 'low') return <ArrowDown size={size} className="text-ink-3" aria-hidden />
  return <Minus size={size} className="text-ink-3" aria-hidden />
}

interface StatusMenuProps {
  value: Status
  onChange: (status: Status) => void
  children: ReactNode
}

export function StatusMenu({ value, onChange, children }: StatusMenuProps) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>{children}</DropdownTrigger>
      <DropdownContent align="start">
        {STATUSES.map((status) => (
          <DropdownItem key={status.id} onSelect={() => onChange(status.id)}>
            <span className={cn('h-2 w-2 rounded-full', COLUMN_DOT[status.id])} aria-hidden />
            {status.label}
            {value === status.id && <Check size={14} className="ml-auto text-accent" aria-hidden />}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}

interface PriorityMenuProps {
  value: Priority
  onChange: (priority: Priority) => void
  children: ReactNode
}

export function PriorityMenu({ value, onChange, children }: PriorityMenuProps) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>{children}</DropdownTrigger>
      <DropdownContent align="start">
        {PRIORITIES.map((priority) => (
          <DropdownItem key={priority.id} onSelect={() => onChange(priority.id)}>
            <PriorityIcon priority={priority.id} />
            {priority.label}
            {value === priority.id && (
              <Check size={14} className="ml-auto text-accent" aria-hidden />
            )}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  )
}

interface DueDatePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  children: ReactNode
}

export function DueDatePicker({ value, onChange, children }: DueDatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="mb-2 text-xs font-semibold text-ink-2">Due date</p>
        <Input
          type="date"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
          aria-label="Due date"
          className="h-8"
        />
        {value !== null && (
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => onChange(null)}>
            Remove due date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface MemberPickerProps {
  members: TeamMember[]
  selectedIds: string[]
  onToggle: (memberId: string, active: boolean) => void
  onManageTeam?: () => void
  children: ReactNode
}

export function MemberPicker({
  members,
  selectedIds,
  onToggle,
  onManageTeam,
  children,
}: MemberPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <p className="mb-1 px-1.5 pt-1 text-xs font-semibold text-ink-2">Members</p>
        {members.length === 0 && (
          <p className="px-1.5 py-1.5 text-sm text-ink-3">
            No team members yet. Add some to start assigning cards.
          </p>
        )}
        {members.map((member) => {
          const selected = selectedIds.includes(member.id)
          return (
            <button
              key={member.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggle(member.id, !selected)}
              className="focus-ring flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-3"
            >
              <MemberAvatar member={member} size={24} />
              <span className="truncate text-sm text-ink">{member.name}</span>
              {selected && <Check size={14} className="ml-auto shrink-0 text-accent" aria-hidden />}
            </button>
          )
        })}
        {onManageTeam && (
          <>
            <div className="my-1.5 h-px bg-line" aria-hidden />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onManageTeam}
            >
              <UsersRound size={14} aria-hidden />
              Manage team…
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

interface LabelPickerProps {
  labels: Label[]
  selectedIds: string[]
  onToggle: (labelId: string, active: boolean) => void
  children: ReactNode
}

export function LabelPicker({ labels, selectedIds, onToggle, children }: LabelPickerProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[6]?.value ?? '#4338ca')
  const [pendingDelete, setPendingDelete] = useState<Label | null>(null)
  const addLabel = useAddLabel()
  const removeLabel = useRemoveLabel()

  async function createLabel() {
    const trimmed = name.trim()
    if (!trimmed || addLabel.isPending) return
    try {
      const created = await addLabel.mutateAsync({ name: trimmed, color })
      onToggle(created.id, true)
      setName('')
    } catch {}
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <p className="mb-1 px-1.5 pt-1 text-xs font-semibold text-ink-2">Labels</p>
          {labels.length === 0 && (
            <p className="px-1.5 py-1.5 text-sm text-ink-3">No labels yet — create one below.</p>
          )}
          {labels.map((label) => {
            const selected = selectedIds.includes(label.id)
            return (
              <div key={label.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggle(label.id, !selected)}
                  className="focus-ring flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-3"
                >
                  <LabelPill
                    name={label.name}
                    color={label.color}
                    className="h-6 flex-1 rounded-md"
                  />
                  {selected && <Check size={14} className="shrink-0 text-accent" aria-hidden />}
                </button>
                <button
                  type="button"
                  aria-label={`Delete the ${label.name} label`}
                  onClick={() => setPendingDelete(label)}
                  className="focus-ring pointer-events-none shrink-0 cursor-pointer rounded-md p-1.5 text-ink-3 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-surface-3 hover:text-danger focus-visible:pointer-events-auto focus-visible:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
              </div>
            )
          })}
          <div className="my-1.5 h-px bg-line" aria-hidden />
          <div className="px-1.5 pb-1">
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Create a label</p>
            <Input
              value={name}
              maxLength={40}
              placeholder="Label name"
              aria-label="New label name"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void createLabel()
                }
              }}
              className="h-8"
            />
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Label color">
              {PALETTE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`${option.name} label color`}
                  aria-pressed={color === option.value}
                  style={{ backgroundColor: option.value }}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    'focus-ring h-6 w-6 cursor-pointer rounded-md',
                    color === option.value &&
                      'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                  )}
                />
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-2"
              disabled={name.trim().length === 0 || addLabel.isPending}
              onClick={() => void createLabel()}
            >
              {addLabel.isPending && <Spinner size={13} />}
              Add label
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={`Delete the “${pendingDelete?.name ?? ''}” label?`}
        description="It will be removed from every card that uses it. This can’t be undone."
        confirmLabel="Delete label"
        destructive
        onConfirm={() => {
          if (pendingDelete) removeLabel.mutate(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}
