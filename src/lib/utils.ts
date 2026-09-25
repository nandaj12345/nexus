import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, boolean>

// ─── Class Name Merging ───────────────────────────────────────────────────────
export function cn(...args: ClassValue[]): string {
  return args
    .flat()
    .filter(x => typeof x === 'string' || (typeof x === 'object' && x !== null))
    .map(x => {
      if (typeof x === 'string') return x
      if (typeof x === 'object' && x !== null && !Array.isArray(x)) {
        return Object.entries(x as Record<string, boolean>)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(' ')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
export function formatMessageTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'h:mm a')
}

export function formatMessageDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMMM d, yyyy')
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatFullDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'PPpp')
}

// ─── String Helpers ───────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function generateInviteCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ─── File Helpers ─────────────────────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageFile(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export function getFileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType.startsWith('video/')) return '🎬'
  if (contentType.startsWith('audio/')) return '🎵'
  if (contentType.includes('pdf')) return '📄'
  if (contentType.includes('zip') || contentType.includes('tar')) return '🗜️'
  if (contentType.includes('text')) return '📝'
  return '📎'
}

// ─── Color Helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#7c6cf2', '#e07ab5', '#5ba4ef', '#3bce6f',
  '#f0a733', '#f04747', '#43b581', '#faa61a',
]

export function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Mention Parsing ──────────────────────────────────────────────────────────
export function parseMentions(content: string): string[] {
  const matches = content.match(/@(\w+)/g)
  return matches ? matches.map(m => m.slice(1)) : []
}

export function renderMentions(content: string, currentUserId?: string): string {
  return content.replace(/@(\w+)/g, (match, username) => {
    return `<span class="mention" data-username="${username}">${match}</span>`
  })
}

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}
