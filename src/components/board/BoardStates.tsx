import { Plus, RefreshCw, Sparkles, TriangleAlert, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton, Spinner } from '@/components/ui/misc'
import { cn } from '@/lib/utils'
import { STATUSES } from '@/types'

const SKELETON_CARDS = [3, 2, 2, 1]

export function BoardSkeleton() {
  return (
    <div className="relative h-full" aria-busy="true">
      <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center">
        <span className="flex items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
          <Spinner size={13} />
          Loading your board…
        </span>
      </div>
      <div className="flex h-full gap-3 overflow-hidden p-3">
        {STATUSES.map((status, columnIndex) => (
          <div
            key={status.id}
            className="flex w-[276px] shrink-0 flex-col gap-2 self-start rounded-xl bg-surface-2 p-2 shadow-lg"
          >
            <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: SKELETON_CARDS[columnIndex] ?? 2 }, (_, cardIndex) => (
              <Skeleton
                key={cardIndex}
                className={cn('w-full rounded-lg', cardIndex % 2 === 0 ? 'h-20' : 'h-14')}
              />
            ))}
            <Skeleton className="h-8 w-full rounded-lg opacity-60" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function BoardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-start justify-center p-6 pt-16">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 text-center shadow-2xl">
        <TriangleAlert className="mx-auto text-danger" size={28} aria-hidden />
        <h2 className="mt-3 text-base font-semibold text-ink">Couldn’t load your board</h2>
        <p className="mt-1 text-sm break-words text-ink-2">{message}</p>
        <Button variant="primary" className="mt-4" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden />
          Try again
        </Button>
      </div>
    </div>
  )
}

interface WelcomeCardProps {
  onCreate: () => void
  onSeed: () => void
  seeding: boolean
}

export function WelcomeCard({ onCreate, onSeed, seeding }: WelcomeCardProps) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-6 z-10 flex justify-center">
      <div className="pointer-events-auto w-full max-w-md rounded-xl bg-surface/95 p-5 text-center shadow-2xl backdrop-blur-sm">
        <Sparkles className="mx-auto text-accent" size={24} aria-hidden />
        <h2 className="mt-2 text-base font-semibold text-ink">Welcome to your board</h2>
        <p className="mt-1 text-sm text-ink-2">
          This board is private to your guest session in this browser — open a private window to get
          a separate one. Create your first card, or load a sample board to explore with realistic
          data.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={onCreate}>
            <Plus size={15} aria-hidden />
            Create a card
          </Button>
          <Button onClick={onSeed} disabled={seeding}>
            {seeding ? <Spinner size={14} /> : <Wand2 size={15} aria-hidden />}
            {seeding ? 'Loading sample…' : 'Load sample board'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function NoMatchesBanner({ onClear }: { onClear: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-6 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-surface/95 py-1.5 pr-1.5 pl-4 shadow-xl backdrop-blur-sm">
        <span className="text-sm text-ink-2">No cards match your search or filters.</span>
        <Button size="sm" onClick={onClear}>
          Clear all
        </Button>
      </div>
    </div>
  )
}
