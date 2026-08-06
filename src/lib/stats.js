import { EMOTIONS } from './enums'
import { dayKey } from './format'

const isClosed = (t) => t.pnl !== null && t.pnl !== undefined

// Win rate treats any trade with 0 <= pnl <= this as neutral (neither win
// nor loss, excluded from both sides of the rate) — separate from `wins`
// below, which is any pnl > 0 and feeds profitFactor/totalPnl and is
// deliberately NOT narrowed by this band. Losses have no floor: any
// pnl < 0 counts as a loss regardless of size.
const BREAKEVEN_MAX = 100

// r_multiple is only meaningful relative to risk_amount, its basis (pnl /
// risk_amount — see LogTrade.jsx). Trades logged before that column existed
// still have a stored r_multiple from the old entry/stop/size formula, so
// checking r_multiple alone isn't enough — risk_amount is the real gate.
// Every caller that reads R (here and in TradeCard/TradeDetail) goes
// through this instead of trade.r_multiple directly.
export function effectiveR(trade) {
  return trade.risk_amount === null || trade.risk_amount === undefined ? null : trade.r_multiple
}

export function computeTradeStats(trades) {
  const closed = trades.filter(isClosed)
  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl < 0)
  const withR = trades.filter((t) => effectiveR(t) !== null && effectiveR(t) !== undefined && t.pnl !== 0)

  // Separate from `wins` — win rate's numerator excludes the $0–$100
  // neutral band entirely, but profitFactor/totalPnl below still use the
  // unfiltered `wins`/`losses` (this is a win-rate-only reclassification).
  const winRateWins = closed.filter((t) => t.pnl > BREAKEVEN_MAX)
  const winRateDecided = winRateWins.length + losses.length

  const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = losses.reduce((s, t) => s + t.pnl, 0) // negative

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: winRateDecided ? (winRateWins.length / winRateDecided) * 100 : null,
    avgR: withR.length ? withR.reduce((s, t) => s + effectiveR(t), 0) / withR.length : null,
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
      // Same $0–$100 neutral band as computeTradeStats' win rate — those
      // trades count toward this emotion's total but not toward its win rate.
      const wins = group.filter((t) => t.pnl > BREAKEVEN_MAX)
      const losses = group.filter((t) => t.pnl < 0)
      const decided = wins.length + losses.length
      return {
        emotion,
        winRate: decided ? (wins.length / decided) * 100 : null,
        count: group.length,
      }
    })
    .filter((e) => e.winRate !== null)
    .sort((a, b) => b.winRate - a.winRate)
}
