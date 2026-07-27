import { useState } from 'react'
import { Moon, MoreHorizontal, RotateCcw, Sun, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm'
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown'
import { BoardMark } from '@/components/ui/logo'
import { SimpleTooltip } from '@/components/ui/tooltip'

interface AppHeaderProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onResetGuest: () => Promise<void>
}

export function AppHeader({ theme, onToggleTheme, onResetGuest }: AppHeaderProps) {
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-white/10 bg-black/15 px-3 text-white backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <BoardMark size={22} />
          <span className="text-[15px] font-bold tracking-tight">Kanban Board</span>
        </div>

        <SimpleTooltip label="Your board is private to this guest session in this browser. Open a private window to get a separate guest board.">
          <span
            tabIndex={0}
            aria-label="Guest session. Your board is private to this guest session in this browser. Open a private window to get a separate guest board."
            className="focus-ring-on-gradient hidden cursor-default items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1 text-xs font-medium sm:flex"
          >
            <UserRound size={12} aria-hidden />
            Guest session
          </span>
        </SimpleTooltip>

        <div className="ml-auto flex items-center gap-1">
          <SimpleTooltip label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <Button
              variant="onGradient"
              size="iconSm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={onToggleTheme}
            >
              {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
            </Button>
          </SimpleTooltip>
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="onGradient" size="iconSm" aria-label="More options">
                <MoreHorizontal size={15} aria-hidden />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={() => setConfirmReset(true)}>
                <RotateCcw size={14} aria-hidden />
                Start a fresh guest session
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </header>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Start a fresh guest session?"
        description="You’ll get a brand-new empty board. The current guest board won’t be accessible from this browser anymore."
        confirmLabel="Start fresh"
        onConfirm={() => void onResetGuest()}
      />
    </>
  )
}
