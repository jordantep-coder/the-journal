import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { TIER_LABEL, nameColor } from '../lib/tiers'
import { emotionFrequency, winRateByEmotion } from '../lib/stats'
import { labelize } from '../lib/enums'
import Avatar from '../components/Avatar'
import BarList from '../components/BarList'
import TradeStatsBlocks from '../components/TradeStatsBlocks'

// Read-only view of another cohort member's stats: plan adherence, equity
// curve, win rate/avg R/profit factor, then emotion sections (before/
// during/after) in place of Expectancy and the by-setup/by-mistake
// breakdowns, which stay on the trader's own My Stats page.
export default function UserStats() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(undefined) // undefined = loading, null = not found
  const [trades, setTrades] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('users')
      .select('id, display_name, avatar_url, role, tier, roadmap_stage')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProfile(data ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    supabase
      .from('trades')
      .select('pnl, r_multiple, risk_amount, followed_plan, setup_tag, mistake_tag, emotion_before, emotion_during, emotion_after, entry_datetime')
      .eq('user_id', id)
      .order('entry_datetime', { ascending: true })
      .then(({ data }) => setTrades(data || []))
  }, [id])

  if (profile === undefined || trades === null) {
    return <CenteredNote>Loading…</CenteredNote>
  }
  if (profile === null) {
    return <CenteredNote>User not found.</CenteredNote>
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <button type="button" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '20px 0 8px' }}>
        <Avatar url={profile.avatar_url} name={profile.display_name} size={96} color={nameColor(profile)} />
        <div>
          <h1 style={{ marginBottom: 4 }}>{profile.display_name}</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {TIER_LABEL[profile.tier]} · Read-only
          </p>
        </div>
      </div>

      <TradeStatsBlocks trades={trades} showExpectancy={false} showBreakdowns={false} />

      <EmotionSection trades={trades} field="emotion_before" label="before entry" />
      <EmotionSection trades={trades} field="emotion_during" label="during trade" />
      <EmotionSection trades={trades} field="emotion_after" label="after exit" />
    </div>
  )
}

function EmotionSection({ trades, field, label }) {
  const freq = emotionFrequency(trades, field).map((e) => ({ label: labelize(e.emotion), value: e.count, display: String(e.count) }))
  const winRate = winRateByEmotion(trades, field).map((e) => ({ label: labelize(e.emotion), value: e.winRate, display: `${e.winRate.toFixed(0)}%` }))

  return (
    <>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Emotion frequency ({label})</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        {freq.length === 0 ? <p style={{ color: 'var(--muted)', margin: 0 }}>No emotion data logged yet.</p> : <BarList items={freq} />}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Win rate by emotion ({label})</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        {winRate.length === 0 ? <p style={{ color: 'var(--muted)', margin: 0 }}>No emotion data logged yet.</p> : <BarList items={winRate} />}
      </div>
    </>
  )
}

function CenteredNote({ children }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      {children}
    </div>
  )
}
