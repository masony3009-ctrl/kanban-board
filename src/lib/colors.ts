export interface ColorOption {
  name: string
  value: string
}

// Every value clears 4.5:1 against white text, since labels and avatars render
// as solid chips. Keep new entries dark enough to hold that.
export const PALETTE: ColorOption[] = [
  { name: 'Red', value: '#b91c1c' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Amber', value: '#b45309' },
  { name: 'Green', value: '#15803d' },
  { name: 'Teal', value: '#0f766e' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Indigo', value: '#4338ca' },
  { name: 'Violet', value: '#6d28d9' },
  { name: 'Pink', value: '#be185d' },
  { name: 'Slate', value: '#475569' },
]

export const COLUMN_DOT: Record<import('@/types').Status, string> = {
  todo: 'bg-st-todo',
  in_progress: 'bg-st-progress',
  in_review: 'bg-st-review',
  done: 'bg-st-done',
}

export function randomPaletteColor(): string {
  const pick = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  return pick ? pick.value : '#4338ca'
}
