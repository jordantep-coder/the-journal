import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeTradeStats, currentStreak, ruleAdherencePct, consistency30d } from '../lib/stats'
import ScoreboardTable from '../components/ScoreboardTable'

const RANGE_START_YEAR = 2026
const RANGE_START_MONTH = 0 // January, 0-indexed

// Descending list of "YYYY-MM" keys from the current month back to
// RANGE_START_YEAR/RANGE_START_MONTH, inclusive.
function monthOptions() {
  const now = new Date()
  const months = []
  let y = now.getFullYear()
  let m = now.getMonth()
  while (y > RANGE_START_YEAR || (y === RANGE_START_YEAR && m >= RANGE_START_MONTH)) {
    months.push(`${y}-${String(m + 1).padStart(2, '0')}`)
    m -= 1
    if (m < 0) {
      m = 11
      y -= 1
    }
  }
  return months
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function Scoreboard() {
  const [users, setUsers] = useState(null)
  const [trades, setTrades] = useState(null)
  // null until the initial load picks a default; 'all' or a 'YYYY-MM' key after.
  const [selectedMonth, setSelectedMonth] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: users }, { data: trades }] = await Promise.all([
        supabase.from('users').select('id, display_name, avatar_url, role, tier, roadmap_stage, timezone').eq('active', true),
        supabase.from('trades').select('user_id, entry_datetime, pnl, r_multiple, risk_amount, followed_plan, rule_breaches'),
      ])

      setUsers(users || [])
      setTrades(trades || [])

      if (trades?.length) {
        const latest = trades.reduce((max, t) => (t.entry_datetime > max ? t.entry_datetime : max), trades[0].entry_datetime)
        setSelectedMonth(latest.slice(0, 7))
      } else {
        setSelectedMonth('all')
      }
    }
    load()
  }, [])

  // Plan adherence, rule adherence, P&L, trades, win rate, and avg R
  // recalculate for the selected month (or all time). Streak and 30d
  // consistency stay on the full trade history regardless of the month
  // filter — both are inherently "as of right now" behavioral readouts, not
  // period stats, so filtering them to a past month wouldn't mean anything
  // (30d in particular is its own trailing 30-day window, unrelated to
  // whichever calendar month is selected).
  const rows = useMemo(() => {
    if (!users || !trades || selectedMonth === null) return null

    const tradesByUser = new Map()
    for (const t of trades) {
      if (!tradesByUser.has(t.user_id)) tradesByUser.set(t.user_id, [])
      tradesByUser.get(t.user_id).push(t)
    }

    return users.map((u) => {
      const userTrades = tradesByUser.get(u.id) || []
      const periodTrades =
        selectedMonth === 'all' ? userTrades : userTrades.filter((t) => t.entry_datetime.slice(0, 7) === selectedMonth)
      return {
        ...u,
        ...computeTradeStats(periodTrades),
        streak: currentStreak(userTrades),
        ruleAdherence: ruleAdherencePct(periodTrades),
        consistency: consistency30d(userTrades, u.timezone),
      }
    })
  }, [users, trades, selectedMonth])

  const months = useMemo(monthOptions, [])

  if (rows === null) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  // Mentors are never tier 'alumni', so this naturally includes every
  // mentor plus every non-alumni student in one ranked set — no role
  // filter needed.
  const ranked = rows.filter((r) => r.tier !== 'alumni')
  const alumni = rows
    .filter((r) => r.tier === 'alumni')
    .sort((a, b) => a.display_name.localeCompare(b.display_name))

  const sortedRanked = [...ranked].sort((a, b) => {
    const av = a.planAdherencePct
    const bv = b.planAdherencePct
    if (av === null) return 1
    if (bv === null) return -1
    return bv - av
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Scoreboard</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Ranked</h2>
        <select
          className="mini-input"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="all">All time</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>
      <div className="panel" style={{ marginBottom: 32 }}>
        <ScoreboardTable rows={sortedRanked} showRank />
      </div>

      {alumni.length > 0 && (
        <details className="panel">
          <summary style={{ cursor: 'pointer', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em' }}>
            Alumni ({alumni.length})
          </summary>
          <div style={{ marginTop: 16 }}>
            <ScoreboardTable rows={alumni} />
          </div>
        </details>
      )}
    </div>
  )
}
