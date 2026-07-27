import { useEffect, useState } from 'react'
import { ChevronDown, Tag, UsersRound } from 'lucide-react'
import { LabelPicker, MemberPicker, PriorityMenu, StatusMenu, PriorityIcon } from './pickers'
import { COLUMN_DOT } from '@/lib/colors'
import { MemberAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { LabelPill } from '@/components/ui/misc'
import { useCreateCard } from '@/hooks/useCreateCard'
import { cn } from '@/lib/utils'
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Label,
  type Priority,
  type Status,
  type TeamMember,
} from '@/types'

interface CreateCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TeamMember[]
  labels: Label[]
  initialStatus?: Status
}

export function CreateCardDialog({
  open,
  onOpenChange,
  members,
  labels,
  initialStatus = 'todo',
}: CreateCardDialogProps) {
  const createCard = useCreateCard()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>(initialStatus)
  const [priority, setPriority] = useState<Priority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setStatus(initialStatus)
      setPriority('normal')
      setDueDate('')
      setLabelIds([])
      setAssigneeIds([])
    }
  }, [open, initialStatus])

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    createCard.create({
      title: trimmed,
      status,
      description,
      priority,
      dueDate: dueDate === '' ? null : dueDate,
      labelIds,
      assigneeIds,
    })
    onOpenChange(false)
  }

  const selectedLabels = labels.filter((label) => labelIds.includes(label.id))
  const selectedMembers = members.filter((member) => assigneeIds.includes(member.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 sm:p-6">
        <DialogTitle className="pr-8 text-base font-semibold text-ink">Create card</DialogTitle>
        <DialogDescription className="sr-only">
          Add a new card with a title and optional details.
        </DialogDescription>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div>
            <label htmlFor="new-card-title" className="mb-1 block text-xs font-medium text-ink-2">
              Title
            </label>
            <Input
              id="new-card-title"
              autoFocus
              value={title}
              maxLength={500}
              placeholder="What needs doing?"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="new-card-description"
              className="mb-1 block text-xs font-medium text-ink-2"
            >
              Description <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <Textarea
              id="new-card-description"
              rows={3}
              value={description}
              maxLength={20000}
              placeholder="Add any helpful context…"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusMenu value={status} onChange={setStatus}>
              <Button size="sm" aria-label={`Column: ${STATUS_LABEL[status]}`}>
                <span className={cn('h-2 w-2 rounded-full', COLUMN_DOT[status])} aria-hidden />
                {STATUS_LABEL[status]}
                <ChevronDown size={14} className="text-ink-3" aria-hidden />
              </Button>
            </StatusMenu>
            <PriorityMenu value={priority} onChange={setPriority}>
              <Button size="sm" aria-label={`Priority: ${PRIORITY_LABEL[priority]}`}>
                <PriorityIcon priority={priority} />
                {PRIORITY_LABEL[priority]}
                <ChevronDown size={14} className="text-ink-3" aria-hidden />
              </Button>
            </PriorityMenu>
            <div>
              <Input
                type="date"
                value={dueDate}
                aria-label="Due date (optional)"
                onChange={(event) => setDueDate(event.target.value)}
                className="h-8 w-auto text-[13px]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MemberPicker
              members={members}
              selectedIds={assigneeIds}
              onToggle={(memberId, active) =>
                setAssigneeIds((prev) =>
                  active ? [...prev, memberId] : prev.filter((id) => id !== memberId),
                )
              }
            >
              <Button size="sm">
                <UsersRound size={14} aria-hidden />
                Assign
                {selectedMembers.length > 0 && ` (${selectedMembers.length})`}
              </Button>
            </MemberPicker>
            {selectedMembers.map((member) => (
              <MemberAvatar key={member.id} member={member} size={24} />
            ))}
            <LabelPicker
              labels={labels}
              selectedIds={labelIds}
              onToggle={(labelId, active) =>
                setLabelIds((prev) =>
                  active ? [...prev, labelId] : prev.filter((id) => id !== labelId),
                )
              }
            >
              <Button size="sm">
                <Tag size={14} aria-hidden />
                Labels
                {selectedLabels.length > 0 && ` (${selectedLabels.length})`}
              </Button>
            </LabelPicker>
            {selectedLabels.map((label) => (
              <LabelPill key={label.id} name={label.name} color={label.color} />
            ))}
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={title.trim().length === 0}>
              Create card
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
