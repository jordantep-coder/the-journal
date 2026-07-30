export function formatMoney(value) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
}

// Compact whole-dollar form for tight spaces (calendar cells) — full cent
// precision doesn't fit at that size. formatMoney() stays the precise form
// used everywhere else (trade cards, stats, scoreboard).
export function formatCompactMoney(value) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`
}

export function formatR(value) {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}R`
}

// Local calendar date (YYYY-MM-DD) for an ISO timestamp, in the given IANA timezone.
export function dayKey(isoString, timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoString))
}

export function formatDateTime(isoString, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoString))
}
