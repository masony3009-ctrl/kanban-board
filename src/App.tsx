import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { toast, Toaster } from 'sonner'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/authContext'
import { AuthErrorScreen, BootScreen, SetupScreen } from '@/components/AppScreens'
import { Board } from '@/components/board/Board'
import {
  BoardError,
  BoardSkeleton,
  NoMatchesBanner,
  WelcomeCard,
} from '@/components/board/BoardStates'
import { AppHeader } from '@/components/layout/AppHeader'
import { BoardToolbar } from '@/components/layout/BoardToolbar'
import { CreateCardDialog } from '@/components/task/CreateCardDialog'
import { TaskDetailDialog } from '@/components/task/TaskDetailDialog'
import { TeamDialog } from '@/components/team/TeamDialog'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryKeys } from '@/data/keys'
import { seedSampleBoard } from '@/data/sample'
import { useLabels } from '@/data/useLabels'
import { useMembers } from '@/data/useMembers'
import { useRealtimeSync } from '@/data/useRealtime'
import { useTasks } from '@/data/useTasks'
import { useBoardFilters } from '@/hooks/boardFiltersContext'
import { BoardFiltersProvider } from '@/hooks/useBoardFilters'
import { useTheme } from '@/hooks/useTheme'
import { friendlyError } from '@/lib/errors'
import { isSupabaseConfigured } from '@/lib/supabase'
import { taskMatchesFilters } from '@/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function BoardScreen() {
  const { userId, resetGuest } = useAuth()
  useRealtimeSync(userId)
  const { theme, toggleTheme } = useTheme()
  const client = useQueryClient()
  const { filters, setFilters, clearFilters } = useBoardFilters()

  const tasksQuery = useTasks()
  const membersQuery = useMembers()
  const labelsQuery = useLabels()

  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const labels = useMemo(() => labelsQuery.data ?? [], [labelsQuery.data])

  useEffect(() => {
    if (!membersQuery.isSuccess && !labelsQuery.isSuccess) return
    const memberIds = new Set(members.map((member) => member.id))
    const labelIds = new Set(labels.map((label) => label.id))
    const assigneeIds = filters.assigneeIds.filter((id) => memberIds.has(id))
    const keptLabelIds = filters.labelIds.filter((id) => labelIds.has(id))
    if (
      assigneeIds.length !== filters.assigneeIds.length ||
      keptLabelIds.length !== filters.labelIds.length
    ) {
      setFilters({ ...filters, assigneeIds, labelIds: keptLabelIds })
    }
  }, [members, labels, filters, setFilters, membersQuery.isSuccess, labelsQuery.isSuccess])

  const openTask = openTaskId !== null ? (tasks.find((t) => t.id === openTaskId) ?? null) : null
  const visibleCount = useMemo(
    () => tasks.filter((task) => taskMatchesFilters(task, filters)).length,
    [tasks, filters],
  )

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedSampleBoard()
      await Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.tasks }),
        client.invalidateQueries({ queryKey: queryKeys.members }),
        client.invalidateQueries({ queryKey: queryKeys.labels }),
      ])
      toast.success('Sample board loaded — drag some cards around!')
    } catch (error) {
      toast.error(friendlyError(error, 'Could not load the sample board.'))
    } finally {
      setSeeding(false)
    }
  }

  const boardReady = tasksQuery.isSuccess

  return (
    <div className="board-bg flex h-full flex-col">
      <AppHeader theme={theme} onToggleTheme={toggleTheme} onResetGuest={resetGuest} />
      <BoardToolbar
        tasks={tasks}
        members={members}
        labels={labels}
        filters={filters}
        onFiltersChange={setFilters}
        onOpenTeam={() => setTeamOpen(true)}
        onNewCard={() => setCreateOpen(true)}
      />

      <main className="relative min-h-0 flex-1">
        {tasksQuery.isPending && <BoardSkeleton />}
        {tasksQuery.isError && (
          <BoardError
            message={friendlyError(
              tasksQuery.error,
              'An unexpected error interrupted the request.',
            )}
            onRetry={() => {
              void tasksQuery.refetch()
            }}
          />
        )}
        {boardReady && (
          <Board
            tasks={tasks}
            filters={filters}
            labels={labels}
            members={members}
            onOpenTask={setOpenTaskId}
          />
        )}
        {boardReady && tasks.length === 0 && (
          <WelcomeCard
            onCreate={() => setCreateOpen(true)}
            onSeed={() => void handleSeed()}
            seeding={seeding}
          />
        )}
        {boardReady && tasks.length > 0 && visibleCount === 0 && (
          <NoMatchesBanner onClear={clearFilters} />
        )}
      </main>

      <TaskDetailDialog
        task={openTask}
        members={members}
        labels={labels}
        onClose={() => setOpenTaskId(null)}
        onManageTeam={() => setTeamOpen(true)}
      />
      <CreateCardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members}
        labels={labels}
      />
      <TeamDialog open={teamOpen} onOpenChange={setTeamOpen} members={members} />
      <Toaster theme={theme} richColors position="bottom-right" />
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={350}>
        <AuthProvider
          loadingFallback={<BootScreen />}
          renderError={(message, retry) => <AuthErrorScreen message={message} onRetry={retry} />}
        >
          <BoardFiltersProvider>
            <BoardScreen />
          </BoardFiltersProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
