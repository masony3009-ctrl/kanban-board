import { cn, initials } from '@/lib/utils'
import type { TeamMember } from '@/types'

interface MemberAvatarProps {
  member: TeamMember
  size?: number
  className?: string
}

export function MemberAvatar({ member, size = 26, className }: MemberAvatarProps) {
  return (
    <span
      title={member.name}
      style={{ width: size, height: size, backgroundColor: member.color, fontSize: Math.round(size * 0.38) }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        className,
      )}
    >
      {initials(member.name)}
    </span>
  )
}

interface AvatarStackProps {
  members: TeamMember[]
  size?: number
  max?: number
  ringClassName?: string
}

export function AvatarStack({ members, size = 26, max = 4, ringClassName = 'ring-card' }: AvatarStackProps) {
  if (members.length === 0) return null
  const visible = members.slice(0, max)
  const overflow = members.length - visible.length
  return (
    <span className="flex items-center -space-x-1.5">
      {visible.map((member) => (
        <MemberAvatar
          key={member.id}
          member={member}
          size={size}
          className={cn('ring-2', ringClassName)}
        />
      ))}
      {overflow > 0 && (
        <span
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-ink-2 ring-2 select-none',
            ringClassName,
          )}
        >
          +{overflow}
        </span>
      )}
    </span>
  )
}
