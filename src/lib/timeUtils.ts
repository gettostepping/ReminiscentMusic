export function formatLastActive(lastActiveAt: string | Date): string {
  const now = new Date()
  const lastActive = new Date(lastActiveAt)
  const diffMs = now.getTime() - lastActive.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Now'
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  
  return lastActive.toLocaleDateString()
}

export function isCurrentlyActive(lastActiveAt: string | Date): boolean {
  const now = new Date()
  const lastActive = new Date(lastActiveAt)
  const diffMs = now.getTime() - lastActive.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  
  return diffMinutes < 5
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'Just now'
  }
  
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  
  if (diffDays < 7) {
    return `${diffDays}d ago`
  }
  
  return target.toLocaleDateString()
}

