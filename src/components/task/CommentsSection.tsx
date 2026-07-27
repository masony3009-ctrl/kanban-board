import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { useAddComment, useComments, useDeleteComment } from '@/data/useComments'
import { isTempId } from '@/data/useTasks'

const MAX_COMMENT = 5000

function GuestAvatar() {
  return (
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
      <UserRound size={14} aria-hidden />
    </span>
  )
}

export function CommentsSection({ taskId }: { taskId: string }) {
  const commentsQuery = useComments(taskId)
  const addComment = useAddComment()
  const deleteComment = useDeleteComment()
  const [body, setBody] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  function submit() {
    const trimmed = body.trim()
    if (!trimmed) return
    addComment.mutate({ taskId, body: trimmed })
    setBody('')
  }

  const comments = commentsQuery.data ?? []

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <MessageSquare size={15} aria-hidden />
        Comments
        {comments.length > 0 && (
          <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-xs font-medium text-ink-2">
            {comments.length}
          </span>
        )}
      </h3>

      <div className="mt-3 flex items-start gap-2.5">
        <GuestAvatar />
        <div className="flex-1">
          <Textarea
            rows={2}
            value={body}
            maxLength={MAX_COMMENT}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                submit()
              }
            }}
            className="bg-surface-2 focus:bg-surface"
          />
          {body.trim().length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={submit}>
                Post comment
              </Button>
              {body.length > MAX_COMMENT - 250 && (
                <span className="text-xs text-ink-3">
                  {MAX_COMMENT - body.length} characters left
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {commentsQuery.isPending && (
          <>
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-4/5 rounded-lg" />
          </>
        )}
        {commentsQuery.isError && (
          <p className="text-sm text-danger">
            Couldn’t load comments.{' '}
            <button
              type="button"
              onClick={() => void commentsQuery.refetch()}
              className="focus-ring cursor-pointer rounded font-medium underline"
            >
              Try again
            </button>
          </p>
        )}
        {commentsQuery.isSuccess && comments.length === 0 && (
          <p className="text-sm text-ink-3">No comments yet. Start the conversation.</p>
        )}
        {comments.map((comment) => {
          const saving = isTempId(comment.id)
          return (
            <div key={comment.id} className="group flex items-start gap-2.5">
              <GuestAvatar />
              <div className="min-w-0 flex-1 rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-xs text-ink-3">
                  <span className="font-semibold text-ink">You</span>
                  {' · '}
                  {saving
                    ? 'Sending…'
                    : formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-wrap text-ink">
                  {comment.body}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete comment"
                disabled={saving}
                onClick={() => setPendingDelete(comment.id)}
                className="focus-ring pointer-events-none mt-1 cursor-pointer rounded-md p-1.5 text-ink-3 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-surface-3 hover:text-danger focus-visible:pointer-events-auto focus-visible:opacity-100 disabled:cursor-not-allowed [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100"
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title="Delete this comment?"
        description="The comment will be permanently removed from this card."
        confirmLabel="Delete comment"
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteComment.mutate({ taskId, commentId: pendingDelete })
          setPendingDelete(null)
        }}
      />
    </section>
  )
}
