import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { emotionFrequency, winRateByEmotion } from '../lib/stats'
import { labelize } from '../lib/enums'
import BarList from '../components/BarList'
import TradeStatsBlocks from '../components/TradeStatsBlocks'

export default function MyStats() {
  const { profile } = useAuth()
  const [trades, setTrades] = useState(null) // null = loading

  useEffect(() => {
    supabase
      .from('trades')
      .select('pnl, r_multiple, risk_amount, followed_plan, setup_tag, mistake_tag, emotion_before, entry_datetime')
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

      <TradeStatsBlocks trades={trades} />

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
