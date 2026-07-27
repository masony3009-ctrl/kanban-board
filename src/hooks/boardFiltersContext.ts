import { createContext, useContext } from 'react'
import type { BoardFilters } from '@/types'

export interface BoardFiltersValue {
  filters: BoardFilters
  setFilters: (filters: BoardFilters) => void
  clearFilters: () => void
}

export const BoardFiltersContext = createContext<BoardFiltersValue | null>(null)

export function useBoardFilters(): BoardFiltersValue {
  const value = useContext(BoardFiltersContext)
  if (!value) throw new Error('useBoardFilters must be used inside <BoardFiltersProvider>')
  return value
}
