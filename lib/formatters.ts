/**
 * Format a date string or Date object to a human-readable format.
 * Falls back to a dash if the input is invalid.
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', options)
  } catch {
    return '—'
  }
}

/**
 * Format a date with time.
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a score as "score/max" with color-appropriate class.
 */
export function formatScore(score: number, maxScore: number): string {
  return `${score}/${maxScore}`
}

/**
 * Get a Tailwind color class based on score ratio.
 */
export function getScoreColorClass(score: number, maxScore: number): string {
  if (maxScore <= 0) return 'text-gray-500'
  const ratio = score / maxScore
  if (ratio >= 0.7) return 'text-green-600'
  if (ratio >= 0.4) return 'text-amber-600'
  return 'text-red-600'
}

/**
 * Get a Tailwind background/border class based on score ratio.
 */
export function getScoreBgClass(score: number, maxScore: number): string {
  if (maxScore <= 0) return 'bg-gray-100'
  const ratio = score / maxScore
  if (ratio >= 0.7) return 'bg-green-50 border-green-200'
  if (ratio >= 0.4) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

/**
 * Get a human-readable label for a score ratio.
 */
export function getScoreLabel(score: number, maxScore: number): string {
  if (maxScore <= 0) return 'N/A'
  const ratio = score / maxScore
  if (ratio >= 0.7) return 'Good'
  if (ratio >= 0.4) return 'Needs work'
  return 'Struggling'
}

/**
 * Truncate text to a maximum length, adding an ellipsis if truncated.
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

/**
 * Get a human-readable "time ago" string.
 */
export function getTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return ''

    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSeconds < 5) return 'just now'
    if (diffSeconds < 60) return `${diffSeconds}s ago`
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 5) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return formatDate(date)
  } catch {
    return ''
  }
}
