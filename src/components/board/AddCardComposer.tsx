import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { useCreateCard } from '@/hooks/useCreateCard'
import type { Status } from '@/types'

const MAX_TITLE = 500

export function AddCardComposer({ status }: { status: Status }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const createCard = useCreateCard()

  function close() {
    setOpen(false)
    setTitle('')
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    createCard.create({ title: trimmed, status })
    setTitle('')
    textareaRef.current?.focus()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <Plus size={15} aria-hidden />
        Add a card
      </button>
    )
  }

  return (
    <form
      className="px-2 pb-2"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <Textarea
        ref={textareaRef}
        autoFocus
        rows={2}
        value={title}
        maxLength={MAX_TITLE}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
          if (event.key === 'Escape') close()
        }}
        placeholder="Enter a title for this card…"
        aria-label="New card title"
        className="card-shadow border-transparent bg-card"
      />
      <div className="mt-1.5 flex items-center gap-1.5">
        <Button type="submit" variant="primary" size="sm" disabled={title.trim().length === 0}>
          Add card
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Close composer" onClick={close}>
          <X size={15} aria-hidden />
        </Button>
      </div>
    </form>
  )
}
