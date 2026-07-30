import { EMOTIONS } from './enums'
import { dayKey } from './format'

const isClosed = (t) => t.pnl !== null && t.pnl !== undefined

export function computeTradeStats(trades) {
  const closed = trades.filter(isClosed)
  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl < 0)
  // Break-even (pnl === 0) trades count toward closedTrades but are excluded
  // from win/loss entirely — not a win, not a loss, and not diluting either rate.
  const decided = wins.length + losses.length
  const withR = trades.filter((t) => t.r_multiple !== null && t.r_multiple !== undefined && t.pnl !== 0)

  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = losses.reduce((s, t) => s + t.pnl, 0) // negative

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: decided ? (wins.length / decided) * 100 : null,
    avgR: withR.length ? withR.reduce((s, t) => s + t.r_multiple, 0) / withR.length : null,
    expectancy: closed.length ? closed.reduce((s, t) => s + t.pnl, 0) / closed.length : null,
    profitFactor: grossLoss < 0 ? grossWin / Math.abs(grossLoss) : grossWin > 0 ? Infinity : null,
    totalPnl: closed.length ? grossWin + grossLoss : null,
    planAdherencePct: trades.length
      ? (trades.filter((t) => t.followed_plan).length / trades.length) * 100
      : null,
  }
}

// Groups by an arbitrary trade field (e.g. setup_tag, mistake_tag) and returns
// per-group performance, sorted by trade count descending.
export function groupPerformance(trades, key, { emptyLabel = 'Unspecified' } = {}) {
  const groups = new Map()
  for (const t of trades) {
    const label = t[key] || emptyLabel
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(t)
  }
  return Array.from(groups.entries())
    .map(([label, groupTrades]) => ({ label, ...computeTradeStats(groupTrades) }))
    .sort((a, b) => b.totalTrades - a.totalTrades)
}

// Fixed emotion order so the chart shape is stable across visits, sorted by count.
export function emotionFrequency(trades, field = 'emotion_before') {
  const counts = new Map(EMOTIONS.map((e) => [e, 0]))
  for (const t of trades) {
    if (t[field] && counts.has(t[field])) counts.set(t[field], counts.get(t[field]) + 1)
  }
  return Array.from(counts.entries())
    .map(([emotion, count]) => ({ emotion, count }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
}

// Most recent consecutive followed_plan=true trades, walking back from today.
export function currentStreak(trades) {
  const sorted = [...trades].sort((a, b) => new Date(b.entry_datetime) - new Date(a.entry_datetime))
  let streak = 0
  for (const t of sorted) {
    if (!t.followed_plan) break
    streak++
  }
  return streak
}

// % of trades with zero flagged rule breaches — distinct from followed_plan:
// a trade can follow the written plan and still breach a mechanical rule.
export function ruleAdherencePct(trades) {
  if (!trades.length) return null
  const clean = trades.filter((t) => (t.rule_breaches || []).length === 0).length
  return (clean / trades.length) * 100
}

// Distinct calendar days (in the given timezone) with at least one trade
// logged in the last 30 days — the "consistency" scoreboard metric.
export function consistency30d(trades, timezone) {
  const since = Date.now() - 30 * 24 * 3600 * 1000
  const days = new Set()
  for (const t of trades) {
    if (new Date(t.entry_datetime).getTime() >= since) {
      days.add(dayKey(t.entry_datetime, timezone))
    }
  }
  return days.size
}

export function winRateByEmotion(trades, field = 'emotion_before') {
  const byEmotion = new Map()
  for (const t of trades) {
    if (!t[field] || t.pnl === null || t.pnl === undefined) continue
    if (!byEmotion.has(t[field])) byEmotion.set(t[field], [])
    byEmotion.get(t[field]).push(t)
  }
  return Array.from(byEmotion.entries())
    .map(([emotion, group]) => {
      // Same break-even exclusion as computeTradeStats: pnl === 0 counts
      // toward this emotion's trade count but not toward its win rate.
      const decided = group.filter((t) => t.pnl !== 0)
      return {
        emotion,
        winRate: decided.length ? (decided.filter((t) => t.pnl > 0).length / decided.length) * 100 : null,
        count: group.length,
      }
    })
    .filter((e) => e.winRate !== null)
    .sort((a, b) => b.winRate - a.winRate)
}
