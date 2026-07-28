import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { computeTradeStats, groupPerformance, emotionFrequency, winRateByEmotion } from '../lib/stats'
import { formatR } from '../lib/format'
import { labelize } from '../lib/enums'
import StatTile from '../components/StatTile'
import EquityCurve from '../components/EquityCurve'
import BarList from '../components/BarList'
import BreakdownTable from '../components/BreakdownTable'

export default function MyStats() {
  const { profile } = useAuth()
  const [trades, setTrades] = useState(null) // null = loading

  useEffect(() => {
    supabase
      .from('trades')
      .select('pnl, r_multiple, followed_plan, setup_tag, mistake_tag, emotion_before, entry_datetime')
      .eq('user_id', profile.id)
      .order('entry_datetime', { ascending: true })
      .then(({ data }) => setTrades(data || []))
  }, [profile.id])

  if (trades === null) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const stats = computeTradeStats(trades)

  const equityPoints = (() => {
    let cum = 0
    return trades
      .filter((t) => t.pnl !== null && t.pnl !== undefined)
      .map((t) => {
        cum += t.pnl
        return { x: new Date(t.entry_datetime).getTime(), value: cum }
      })
  })()

  const bySetup = groupPerformance(trades, 'setup_tag')
  const byMistake = groupPerformance(trades, 'mistake_tag', { emptyLabel: 'none' })

  const emotionFreq = emotionFrequency(trades).map((e) => ({
    label: labelize(e.emotion),
    value: e.count,
    display: String(e.count),
  }))
  const emotionWinRate = winRateByEmotion(trades).map((e) => ({
    label: labelize(e.emotion),
    value: e.winRate,
    display: `${e.winRate.toFixed(0)}%`,
  }))

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>My Stats</h1>

      <div className="panel" style={{ textAlign: 'center', margin: '20px 0 28px' }}>
        <p
          style={{
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            margin: 0,
          }}
        >
          Plan adherence
        </p>
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 56, margin: '8px 0 0' }}>
          {stats.planAdherencePct === null ? '—' : `${stats.planAdherencePct.toFixed(0)}%`}
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
          {stats.totalTrades} trade{stats.totalTrades === 1 ? '' : 's'} logged
        </p>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Equity curve</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        <EquityCurve points={equityPoints} />
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <StatTile label="Win rate" value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(0)}%`} />
        <StatTile label="Avg R" value={formatR(stats.avgR)} />
        <StatTile
          label="Expectancy"
          value={stats.expectancy === null ? '—' : stats.expectancy.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          color={stats.expectancy > 0 ? 'var(--green)' : stats.expectancy < 0 ? 'var(--red)' : 'var(--text)'}
        />
        <StatTile
          label="Profit factor"
          value={stats.profitFactor === null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
        />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>By setup</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        <BreakdownTable rows={bySetup} />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>By mistake</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        <BreakdownTable rows={byMistake} />
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Emotion frequency (before entry)</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        {emotionFreq.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No emotion data logged yet.</p>
        ) : (
          <BarList items={emotionFreq} />
        )}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Win rate by emotion (before entry)</h2>
      <div className="panel">
        {emotionWinRate.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No emotion data logged yet.</p>
        ) : (
          <BarList items={emotionWinRate} />
        )}
      </div>
    </div>
  )
}
