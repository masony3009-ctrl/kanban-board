import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQueryClient } from '@tanstack/react-query'
import { Column } from './Column'
import { TaskCardOverlay, type CardLookups } from './TaskCard'
import { queryKeys } from '@/data/keys'
import { applyMovePatch, useMoveTask, useRenumberColumn } from '@/data/useTasks'
import { needsRenumber, positionBetween } from '@/lib/position'
import { cn } from '@/lib/utils'
import {
  STATUSES,
  STATUS_LABEL,
  taskMatchesFilters,
  type BoardFilters,
  type Label,
  type Status,
  type Task,
  type TeamMember,
} from '@/types'

type ColumnMap = Record<Status, string[]>

const EMPTY_COLUMNS: ColumnMap = { todo: [], in_progress: [], in_review: [], done: [] }

function statusFromId(id: UniqueIdentifier): Status | null {
  const key = String(id)
  return STATUSES.find((s) => s.id === key)?.id ?? null
}

function findColumn(id: UniqueIdentifier, columns: ColumnMap): Status | null {
  const direct = statusFromId(id)
  if (direct) return direct
  const key = String(id)
  for (const { id: status } of STATUSES) {
    if (columns[status].includes(key)) return status
  }
  return null
}

function cloneColumns(columns: ColumnMap): ColumnMap {
  return {
    todo: [...columns.todo],
    in_progress: [...columns.in_progress],
    in_review: [...columns.in_review],
    done: [...columns.done],
  }
}

function byPosition(a: Task, b: Task): number {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt)
}

interface BoardProps {
  tasks: Task[]
  filters: BoardFilters
  labels: Label[]
  members: TeamMember[]
  onOpenTask: (id: string) => void
}

export function Board({ tasks, filters, labels, members, onOpenTask }: BoardProps) {
  const queryClient = useQueryClient()
  const moveTask = useMoveTask()
  const renumberColumn = useRenumberColumn()

  const lookups: CardLookups = useMemo(
    () => ({
      labelById: new Map(labels.map((label) => [label.id, label])),
      memberById: new Map(members.map((member) => [member.id, member])),
    }),
    [labels, members],
  )

  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  const ordered = useMemo(() => [...tasks].sort(byPosition), [tasks])

  const fullColumns: ColumnMap = useMemo(() => {
    const columns = cloneColumns(EMPTY_COLUMNS)
    for (const task of ordered) columns[task.status].push(task.id)
    return columns
  }, [ordered])

  const baseColumns: ColumnMap = useMemo(() => {
    const columns = cloneColumns(EMPTY_COLUMNS)
    for (const task of ordered) {
      if (taskMatchesFilters(task, filters)) columns[task.status].push(task.id)
    }
    return columns
  }, [ordered, filters])

  const [dragColumns, setDragColumns] = useState<ColumnMap | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dropColumn, setDropColumn] = useState<Status | null>(null)

  const columns = dragColumns ?? baseColumns
  const activeTask = activeId ? (taskById.get(activeId) ?? null) : null

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      const hits = pointerWithin(args)
      const collisions = hits.length > 0 ? hits : rectIntersection(args)
      const first = collisions[0]
      if (!first) return collisions

      const status = statusFromId(first.id)
      if (!status) return collisions

      const cardIds = new Set(columns[status])
      const cardContainers = args.droppableContainers.filter((container) =>
        cardIds.has(String(container.id)),
      )
      if (cardContainers.length === 0) return collisions
      const nearest = closestCenter({ ...args, droppableContainers: cardContainers })
      return nearest.length > 0 ? nearest : collisions
    },
    [columns],
  )

  function finishDrag() {
    setActiveId(null)
    setDragColumns(null)
    setDropColumn(null)
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    setActiveId(id)
    setDropColumn(findColumn(id, baseColumns))
    setDragColumns(cloneColumns(baseColumns))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const current = dragColumns ?? baseColumns
    const activeColumn = findColumn(active.id, current)
    const overColumn = findColumn(over.id, current)
    if (!activeColumn || !overColumn) return
    setDropColumn(overColumn)
    if (activeColumn === overColumn) return

    const id = String(active.id)
    const activeItems = current[activeColumn].filter((item) => item !== id)
    const overItems = current[overColumn].filter((item) => item !== id)

    let insertIndex = overItems.length
    if (!statusFromId(over.id)) {
      const overIndex = overItems.indexOf(String(over.id))
      if (overIndex >= 0) {
        const isBelowOverItem =
          active.rect.current.translated !== null &&
          active.rect.current.translated.top > over.rect.top + over.rect.height
        insertIndex = overIndex + (isBelowOverItem ? 1 : 0)
      }
    }

    setDragColumns({
      ...current,
      [activeColumn]: activeItems,
      [overColumn]: [...overItems.slice(0, insertIndex), id, ...overItems.slice(insertIndex)],
    })
  }

  function resolveNeighbors(
    targetColumn: Status,
    visibleIds: string[],
    id: string,
  ): { before: number | undefined; after: number | undefined; fullOrder: string[] } {
    const full = fullColumns[targetColumn].filter((item) => item !== id)
    const visibleIndex = visibleIds.indexOf(id)
    const prevVisible = visibleIndex > 0 ? visibleIds[visibleIndex - 1] : undefined
    const nextVisible =
      visibleIndex >= 0 && visibleIndex < visibleIds.length - 1
        ? visibleIds[visibleIndex + 1]
        : undefined

    let insertAt: number
    if (prevVisible !== undefined) {
      insertAt = full.indexOf(prevVisible) + 1
    } else if (nextVisible !== undefined) {
      insertAt = Math.max(0, full.indexOf(nextVisible))
    } else {
      insertAt = full.length
    }

    const beforeId = insertAt > 0 ? full[insertAt - 1] : undefined
    const afterId = insertAt < full.length ? full[insertAt] : undefined
    const fullOrder = [...full.slice(0, insertAt), id, ...full.slice(insertAt)]
    return {
      before: beforeId !== undefined ? taskById.get(beforeId)?.position : undefined,
      after: afterId !== undefined ? taskById.get(afterId)?.position : undefined,
      fullOrder,
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const current = dragColumns ?? baseColumns
    const id = String(active.id)
    const task = taskById.get(id)
    const targetColumn = over ? findColumn(id, current) : null

    if (!over || !targetColumn || !task) {
      finishDrag()
      return
    }

    let visibleIds = [...current[targetColumn]]
    if (!statusFromId(over.id)) {
      const activeIndex = visibleIds.indexOf(id)
      const overIndex = visibleIds.indexOf(String(over.id))
      if (activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex) {
        visibleIds = arrayMove(visibleIds, activeIndex, overIndex)
      }
    }

    const columnChanged = task.status !== targetColumn
    const indexChanged = baseColumns[targetColumn].indexOf(id) !== visibleIds.indexOf(id)
    if (!columnChanged && !indexChanged) {
      finishDrag()
      return
    }

    const { before, after, fullOrder } = resolveNeighbors(targetColumn, visibleIds, id)
    const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks)

    if (needsRenumber(before, after)) {
      renumberColumn.mutate({ orderedIds: fullOrder, previous })
      finishDrag()
      return
    }

    const move = { id, status: targetColumn, position: positionBetween(before, after) }
    applyMovePatch(queryClient, move)
    moveTask.mutate({ ...move, previous })
    finishDrag()
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const task = taskById.get(String(active.id))
      return task ? `Picked up card "${task.title}".` : 'Picked up card.'
    },
    onDragOver({ over }) {
      if (!over) return undefined
      const column = findColumn(over.id, columns)
      return column ? `Card is over the ${STATUS_LABEL[column]} column.` : undefined
    },
    onDragEnd({ over }) {
      if (!over) return 'Card dropped.'
      const column = findColumn(over.id, columns)
      return column ? `Card dropped into the ${STATUS_LABEL[column]} column.` : 'Card dropped.'
    },
    onDragCancel() {
      return 'Dragging cancelled. Card returned to its original position.'
    },
  }

  function columnTasks(status: Status): Task[] {
    return columns[status].flatMap((id) => {
      const task = taskById.get(id)
      return task ? [task] : []
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={finishDrag}
      accessibility={{ announcements }}
    >
      <div
        className={cn(
          'on-gradient-scroll flex h-full gap-3 overflow-x-auto overflow-y-hidden p-3',
          activeId === null && 'snap-x snap-mandatory sm:snap-none',
        )}
      >
        {STATUSES.map(({ id }) => (
          <Column
            key={id}
            status={id}
            tasks={columnTasks(id)}
            lookups={lookups}
            onOpenTask={onOpenTask}
            isDropTarget={activeId !== null && dropColumn === id}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? <TaskCardOverlay task={activeTask} lookups={lookups} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
