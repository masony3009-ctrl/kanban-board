import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { MemberAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/misc'
import { useAddMember, useRemoveMember } from '@/data/useMembers'
import { isTempId } from '@/data/useTasks'
import { PALETTE } from '@/lib/colors'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types'

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: TeamMember[]
}

export function TeamDialog({ open, onOpenChange, members }: TeamDialogProps) {
  const addMember = useAddMember()
  const removeMember = useRemoveMember()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[5]?.value ?? '#1d4ed8')
  const [pendingRemove, setPendingRemove] = useState<TeamMember | null>(null)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed || addMember.isPending) return
    addMember.mutate({ name: trimmed, color })
    setName('')
    const index = PALETTE.findIndex((option) => option.value === color)
    setColor(PALETTE[(index + 1) % PALETTE.length]?.value ?? color)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-5 sm:p-6">
          <DialogTitle className="pr-8 text-base font-semibold text-ink">Team</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-ink-2">
            Add the people you work with, then assign them to cards. Removing a member unassigns
            them from every card.
          </DialogDescription>

          <div className="mt-4 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {members.length === 0 && (
              <p className="rounded-lg bg-surface-2 px-3 py-4 text-center text-sm text-ink-3">
                No team members yet — add your first one below.
              </p>
            )}
            {members.map((member) => {
              const saving = isTempId(member.id)
              return (
                <div
                  key={member.id}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-2"
                >
                  <MemberAvatar member={member} size={28} />
                  <span className="truncate text-sm font-medium text-ink">{member.name}</span>
                  {saving && <span className="text-xs text-ink-3">Saving…</span>}
                  <button
                    type="button"
                    aria-label={`Remove ${member.name}`}
                    disabled={saving}
                    onClick={() => setPendingRemove(member)}
                    className="focus-ring pointer-events-none ml-auto cursor-pointer rounded-md p-1.5 text-ink-3 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-surface-3 hover:text-danger focus-visible:pointer-events-auto focus-visible:opacity-100 disabled:cursor-not-allowed [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Add a member</p>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <Input
                value={name}
                maxLength={80}
                placeholder="Name"
                aria-label="New member name"
                onChange={(event) => setName(event.target.value)}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={name.trim().length === 0 || addMember.isPending}
              >
                {addMember.isPending && <Spinner size={13} />}
                Add
              </Button>
            </form>
            <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Avatar color">
              {PALETTE.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`${option.name} avatar color`}
                  aria-pressed={color === option.value}
                  style={{ backgroundColor: option.value }}
                  onClick={() => setColor(option.value)}
                  className={cn(
                    'focus-ring h-6 w-6 cursor-pointer rounded-full',
                    color === option.value && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                  )}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingRemove(null)
        }}
        title={`Remove ${pendingRemove?.name ?? 'this member'}?`}
        description="They will be unassigned from every card. This can’t be undone."
        confirmLabel="Remove member"
        destructive
        onConfirm={() => {
          if (pendingRemove) removeMember.mutate(pendingRemove.id)
          setPendingRemove(null)
        }}
      />
    </>
  )
}
