import { useMemo, useState, type ReactNode } from 'react'
import { BoardFiltersContext, type BoardFiltersValue } from './boardFiltersContext'
import { EMPTY_FILTERS, type BoardFilters } from '@/types'

export function BoardFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS)
  const value = useMemo<BoardFiltersValue>(
    () => ({ filters, setFilters, clearFilters: () => setFilters(EMPTY_FILTERS) }),
    [filters],
  )
  return <BoardFiltersContext.Provider value={value}>{children}</BoardFiltersContext.Provider>
}
