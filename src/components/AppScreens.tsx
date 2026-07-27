import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BoardMark } from '@/components/ui/logo'
import { Spinner } from '@/components/ui/misc'

export function BootScreen() {
  return (
    <div className="board-bg flex h-full flex-col items-center justify-center gap-4 text-white">
      <BoardMark size={44} />
      <p className="flex items-center gap-2 text-sm font-medium">
        <Spinner size={15} />
        Setting up your guest session…
      </p>
    </div>
  )
}

export function AuthErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="board-bg flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 text-center shadow-2xl">
        <TriangleAlert className="mx-auto text-danger" size={28} aria-hidden />
        <h1 className="mt-3 text-base font-semibold text-ink">Couldn’t start a guest session</h1>
        <p className="mt-1.5 text-sm break-words text-ink-2">{message}</p>
        <Button variant="primary" className="mt-4" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden />
          Try again
        </Button>
      </div>
    </div>
  )
}

export function SetupScreen() {
  return (
    <div className="board-bg flex h-full items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center gap-2.5">
          <BoardMark size={28} />
          <h1 className="text-base font-semibold text-ink">Connect to Supabase</h1>
        </div>
        <p className="mt-2 text-sm text-ink-2">
          Supabase environment variables are missing. Create a{' '}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code> file in the
          project root with:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs leading-relaxed text-ink-2">
          {'VITE_SUPABASE_URL=https://your-project-ref.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-public-key'}
        </pre>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>Create a free project at supabase.com and copy the URL + anon key from Settings → API.</li>
          <li>Enable Authentication → Sign In / Providers → Anonymous.</li>
          <li>
            Run <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">supabase/schema.sql</code>{' '}
            in the SQL Editor.
          </li>
          <li>Restart the dev server.</li>
        </ol>
        <p className="mt-3 text-xs text-ink-3">
          Only the public anon key belongs in this file — never the service role key.
        </p>
      </div>
    </div>
  )
}
