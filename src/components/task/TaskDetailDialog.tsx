import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { format } from 'date-fns'
import { AlignLeft, CalendarDays, ChevronDown, Tag, Trash2, UsersRound } from 'lucide-react'
import { ActivitySection } from './ActivitySection'
import { CommentsSection } from './CommentsSection'
import {
  DueDatePicker,
  LabelPicker,
  MemberPicker,
  PriorityIcon,
  PriorityMenu,
  StatusMenu,
} from './pickers'
import { MemberAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { LabelPill } from '@/components/ui/misc'
import {
  useDeleteTask,
  useToggleTaskAssignee,
  useToggleTaskLabel,
  useUpdateTask,
} from '@/data/useTasks'
import { COLUMN_DOT } from '@/lib/colors'
import { parseDueDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { PRIORITY_LABEL, STATUS_LABEL, type Label, type Task, type TeamMember } from '@/types'

const MAX_TITLE = 500
const MAX_DESCRIPTION = 20000

interface TaskDetailDialogProps {
  task: Task | null
  members: TeamMember[]
  labels: Label[]
  onClose: () => void
  onManageTeam: () => void
}

export function TaskDetailDialog({
  task,
  members,
  labels,
  onClose,
  onManageTeam,
}: TaskDetailDialogProps) {
  // Escape should cancel an in-progress field edit before closing the dialog.
  // Radix listens for Escape on document in the capture phase, so the guard has
  // to live here; stopPropagation on the inputs would never reach it.
  const escapeGuard = useRef<(() => boolean) | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {task !== null && (
        <DialogContent
          ref={contentRef}
          className="max-w-2xl p-0"
          // The title is the first focusable child, so the default autofocus
          // lands there with the whole title selected and one keystroke would
          // replace it. Focus the dialog itself instead.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          onEscapeKeyDown={(event) => {
            if (escapeGuard.current?.()) event.preventDefault()
          }}
        >
          <TaskDetailBody
            key={task.id}
            task={task}
            members={members}
            labels={labels}
            onClose={onClose}
            onManageTeam={onManageTeam}
            escapeGuard={escapeGuard}
          />
        </DialogContent>
      )}
    </Dialog>
  )
}

function SidebarButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      size="sm"
      className={cn(
        'w-full justify-start gap-2 bg-surface-2 font-normal hover:bg-surface-3',
        className,
      )}
      {...props}
    />
  )
}

interface TaskDetailBodyProps {
  task: Task
  members: TeamMember[]
  labels: Label[]
  onClose: () => void
  onManageTeam: () => void
  escapeGuard: React.RefObject<(() => boolean) | null>
}

function TaskDetailBody({
  task,
  members,
  labels,
  onClose,
  onManageTeam,
  escapeGuard,
}: TaskDetailBodyProps) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const toggleLabel = useToggleTaskLabel()
  const toggleAssignee = useToggleTaskAssignee()

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [editingDescription, setEditingDescription] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Realtime keeps `task` fresh while the dialog is open. Adopt an incoming
  // title unless it is being edited, or blurring an untouched field would
  // overwrite the newer value with a stale one.
  useEffect(() => {
    if (document.activeElement !== titleRef.current) setTitle(task.title)
  }, [task.title])

  useEffect(() => {
    if (!editingDescription) setDescription(task.description)
  }, [task.description, editingDescription])

  useEffect(() => {
    escapeGuard.current = () => {
      if (document.activeElement === titleRef.current) {
        setTitle(task.title)
        titleRef.current?.blur()
        return true
      }
      if (editingDescription) {
        setDescription(task.description)
        setEditingDescription(false)
        return true
      }
      return false
    }
    return () => {
      escapeGuard.current = null
    }
  }, [escapeGuard, task.title, task.description, editingDescription])

  const assignedMembers = members.filter((member) => task.assigneeIds.includes(member.id))
  const appliedLabels = labels.filter((label) => task.labelIds.includes(label.id))

  function commitTitle() {
    const trimmed = title.trim()
    if (trimmed.length === 0) {
      setTitle(task.title)
      return
    }
    if (trimmed !== task.title) {
      updateTask.mutate({ id: task.id, title: trimmed })
    }
  }

  function commitDescription() {
    setEditingDescription(false)
    if (description !== task.description) {
      updateTask.mutate({ id: task.id, description })
    }
  }

  return (
    <div className="nice-scroll max-h-[85vh] overflow-x-hidden overflow-y-auto rounded-xl">
      <DialogTitle className="sr-only">Card: {task.title}</DialogTitle>
      <DialogDescription className="sr-only">
        Edit this card’s details, comments, and activity.
      </DialogDescription>
      <div className="p-5 pr-12 sm:p-6 sm:pr-14">
        <input
          ref={titleRef}
          value={title}
          maxLength={MAX_TITLE}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          aria-label="Card title"
          className="focus-ring -mx-1 w-full rounded-md bg-transparent px-1 text-lg leading-snug font-semibold text-ink"
        />
        <p className="mt-0.5 px-0 text-xs text-ink-3">
          in {STATUS_LABEL[task.status]} · created {format(new Date(task.createdAt), 'MMM d, yyyy')}
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(0,1fr)_190px]">
          <aside className="flex flex-col gap-1.5 sm:order-2">
            <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Details</p>

            <StatusMenu
              value={task.status}
              onChange={(status) =>
                updateTask.mutate({ id: task.id, status, previousStatus: task.status })
              }
            >
              <SidebarButton aria-label={`Status: ${STATUS_LABEL[task.status]}`}>
                <span className={cn('h-2 w-2 rounded-full', COLUMN_DOT[task.status])} aria-hidden />
                {STATUS_LABEL[task.status]}
                <ChevronDown size={14} className="ml-auto text-ink-3" aria-hidden />
              </SidebarButton>
            </StatusMenu>

            <PriorityMenu
              value={task.priority}
              onChange={(priority) => updateTask.mutate({ id: task.id, priority })}
            >
              <SidebarButton aria-label={`Priority: ${PRIORITY_LABEL[task.priority]}`}>
                <PriorityIcon priority={task.priority} />
                {PRIORITY_LABEL[task.priority]} priority
                <ChevronDown size={14} className="ml-auto text-ink-3" aria-hidden />
              </SidebarButton>
            </PriorityMenu>

            <DueDatePicker
              value={task.dueDate}
              onChange={(dueDate) => updateTask.mutate({ id: task.id, dueDate })}
            >
              <SidebarButton>
                <CalendarDays size={14} aria-hidden />
                {task.dueDate !== null
                  ? format(parseDueDate(task.dueDate), 'MMM d, yyyy')
                  : 'Set due date'}
              </SidebarButton>
            </DueDatePicker>

            <MemberPicker
              members={members}
              selectedIds={task.assigneeIds}
              onToggle={(memberId, active) =>
                toggleAssignee.mutate({ taskId: task.id, targetId: memberId, active })
              }
              onManageTeam={onManageTeam}
            >
              <SidebarButton>
                <UsersRound size={14} aria-hidden />
                Members
                {assignedMembers.length > 0 && ` (${assignedMembers.length})`}
              </SidebarButton>
            </MemberPicker>
            {assignedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1 py-0.5">
                {assignedMembers.map((member) => (
                  <MemberAvatar key={member.id} member={member} size={26} />
                ))}
              </div>
            )}

            <LabelPicker
              labels={labels}
              selectedIds={task.labelIds}
              onToggle={(labelId, active) =>
                toggleLabel.mutate({ taskId: task.id, targetId: labelId, active })
              }
            >
              <SidebarButton>
                <Tag size={14} aria-hidden />
                Labels
                {appliedLabels.length > 0 && ` (${appliedLabels.length})`}
              </SidebarButton>
            </LabelPicker>
            {appliedLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 py-0.5">
                {appliedLabels.map((label) => (
                  <LabelPill key={label.id} name={label.name} color={label.color} className="h-5" />
                ))}
              </div>
            )}

            <div className="my-1.5 h-px bg-line" aria-hidden />
            <Button
              variant="danger"
              size="sm"
              className="w-full justify-start"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} aria-hidden />
              Delete card
            </Button>
          </aside>

          <div className="min-w-0 sm:order-1">
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <AlignLeft size={15} aria-hidden />
                Description
              </h3>
              {editingDescription ? (
                <div className="mt-2">
                  <Textarea
                    autoFocus
                    rows={4}
                    value={description}
                    maxLength={MAX_DESCRIPTION}
                    onChange={(event) => setDescription(event.target.value)}
                    aria-label="Card description"
                    placeholder="Add a more detailed description…"
                  />
                  <div className="mt-1.5 flex gap-1.5">
                    <Button variant="primary" size="sm" onClick={commitDescription}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDescription(task.description)
                        setEditingDescription(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : task.description.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="focus-ring mt-2 w-full cursor-text rounded-md px-2.5 py-2 text-left text-sm break-words whitespace-pre-wrap text-ink-2 hover:bg-surface-2"
                >
                  {task.description}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="focus-ring mt-2 w-full cursor-pointer rounded-md bg-surface-2 px-2.5 pt-2 pb-6 text-left text-sm text-ink-3 hover:bg-surface-3"
                >
                  Add a more detailed description…
                </button>
              )}
            </section>

            <CommentsSection taskId={task.id} />
            <ActivitySection taskId={task.id} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this card?"
        description={`“${task.title}” and its comments and history will be permanently deleted.`}
        confirmLabel="Delete card"
        destructive
        onConfirm={() => {
          deleteTask.mutate(task.id)
          onClose()
        }}
      />
    </div>
  )
}
