import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { computeTradeStats, currentStreak, ruleAdherencePct, consistency30d } from '../lib/stats'
import ScoreboardTable from '../components/ScoreboardTable'

export default function Scoreboard() {
  const [rows, setRows] = useState(null) // null = loading
  const [sortBy, setSortBy] = useState('adherence') // 'adherence' | 'pnl'

  useEffect(() => {
    async function load() {
      const [{ data: users }, { data: trades }] = await Promise.all([
        supabase.from('users').select('id, display_name, role, tier, roadmap_stage, timezone').eq('active', true),
        supabase.from('trades').select('user_id, entry_datetime, pnl, r_multiple, followed_plan, rule_breaches'),
      ])

      const tradesByUser = new Map()
      for (const t of trades || []) {
        if (!tradesByUser.has(t.user_id)) tradesByUser.set(t.user_id, [])
        tradesByUser.get(t.user_id).push(t)
      }

      const computed = (users || []).map((u) => {
        const userTrades = tradesByUser.get(u.id) || []
        return {
          ...u,
          ...computeTradeStats(userTrades),
          streak: currentStreak(userTrades),
          ruleAdherence: ruleAdherencePct(userTrades),
          consistency: consistency30d(userTrades, u.timezone),
        }
      })

      setRows(computed)
    }
    load()
  }, [])

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
    const key = sortBy === 'pnl' ? 'totalPnl' : 'planAdherencePct'
    const av = a[key]
    const bv = b[key]
    if (av === null) return 1
    if (bv === null) return -1
    return bv - av
  })

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Scoreboard</h1>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Ranked</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: sortBy === 'adherence' ? 'var(--gold)' : 'var(--panel)',
              color: sortBy === 'adherence' ? '#16181e' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setSortBy('adherence')}
          >
            Plan adherence
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: sortBy === 'pnl' ? 'var(--gold)' : 'var(--panel)',
              color: sortBy === 'pnl' ? '#16181e' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setSortBy('pnl')}
          >
            P&amp;L
          </button>
        </div>
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
