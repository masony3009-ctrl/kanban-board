export const POSITION_STEP = 1024

// Below this gap, halving again risks rounding to one of the bounds and
// producing duplicate positions, so the column is renumbered instead.
export const MIN_POSITION_GAP = 1e-3

export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before !== undefined && after !== undefined) return (before + after) / 2
  if (before !== undefined) return before + POSITION_STEP
  if (after !== undefined) return after - POSITION_STEP
  return POSITION_STEP
}

export function needsRenumber(before: number | undefined, after: number | undefined): boolean {
  if (before === undefined || after === undefined) return false
  return Math.abs(after - before) < MIN_POSITION_GAP
}

export function positionAfter(positions: number[]): number {
  if (positions.length === 0) return POSITION_STEP
  return Math.max(...positions) + POSITION_STEP
}

export function sequentialPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * POSITION_STEP)
}
