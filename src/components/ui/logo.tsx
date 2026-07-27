import { useId } from 'react'

export function BoardMark({ size = 22 }: { size?: number }) {
  const gradientId = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b83f6" />
          <stop offset="1" stopColor="#5b5bd6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradientId})`} />
      <rect x="12" y="14" width="11" height="36" rx="3.5" fill="#fff" opacity=".95" />
      <rect x="26.5" y="14" width="11" height="22" rx="3.5" fill="#fff" opacity=".78" />
      <rect x="41" y="14" width="11" height="29" rx="3.5" fill="#fff" opacity=".6" />
    </svg>
  )
}
