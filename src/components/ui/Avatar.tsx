import React from 'react'
import { getInitials, getAvatarColor } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string
  userId?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'idle' | 'dnd' | 'offline' | null
  className?: string
  onClick?: () => void
}

const SIZE_MAP = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-2 h-2 border' },
  sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2.5 h-2.5 border' },
  md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-3 h-3 border-2' },
  lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3.5 h-3.5 border-2' },
  xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-4 h-4 border-2' },
}

const STATUS_COLORS = {
  online: 'bg-online',
  idle: 'bg-idle',
  dnd: 'bg-dnd',
  offline: 'bg-offline',
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '?',
  userId,
  size = 'md',
  status,
  className = '',
  onClick,
}) => {
  const sizes = SIZE_MAP[size]
  const bgColor = userId ? getAvatarColor(userId) : '#7c6cf2'
  const initials = getInitials(name)

  return (
    <div
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div
        className={`${sizes.container} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white select-none ring-2 ring-transparent transition-all ${onClick ? 'hover:ring-brand-500' : ''}`}
        style={{ backgroundColor: src ? undefined : bgColor }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className={sizes.text}>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sizes.status} rounded-full border-bg-primary ${STATUS_COLORS[status]}`}
        />
      )}
    </div>
  )
}

export default Avatar
