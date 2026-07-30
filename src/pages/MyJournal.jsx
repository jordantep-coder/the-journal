import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIER_LABEL, nameColor } from '../lib/tiers'
import CalendarHeatmap from '../components/CalendarHeatmap'
import TradeCard from '../components/TradeCard'

const RECENT_LIMIT = 15

export default function MyJournal() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const flash = location.state?.flash

  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [recentTrades, setRecentTrades] = useState([])
  const [monthTrades, setMonthTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', profile.id)
      .order('entry_datetime', { ascending: false })
      .limit(RECENT_LIMIT)
      .then(({ data }) => {
        setRecentTrades(data || [])
        setLoading(false)
      })
  }, [profile.id])

  useEffect(() => {
    // Widen by a day on each side so no local-timezone day at the month's
    // edges gets clipped by a UTC-boundary query; exact bucketing happens
    // client-side in CalendarHeatmap using the user's timezone.
    const rangeStart = new Date(Date.UTC(year, month, 1) - 24 * 3600 * 1000).toISOString()
    const rangeEnd = new Date(Date.UTC(year, month + 1, 1) + 24 * 3600 * 1000).toISOString()

    supabase
      .from('trades')
      .select('entry_datetime, pnl')
      .eq('user_id', profile.id)
      .gte('entry_datetime', rangeStart)
      .lt('entry_datetime', rangeEnd)
      .then(({ data }) => setMonthTrades(data || []))
  }, [profile.id, year, month])

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>My Journal</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            <strong style={{ color: nameColor(profile), fontFamily: 'var(--font-mono)' }}>
              {profile.display_name}
            </strong>{' '}
            — {TIER_LABEL[profile.tier]}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>

      {flash && <p style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{flash}</p>}

      <Link to="/trades/new" className="btn btn-primary" style={{ width: '100%', margin: '20px 0 28px' }}>
        Log a trade
      </Link>

      <CalendarHeatmap
        year={year}
        month={month}
        trades={monthTrades}
        timezone={profile.timezone}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Recent trades</h2>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : recentTrades.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No trades logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recentTrades.map((t) => (
            <TradeCard key={t.id} trade={t} timezone={profile.timezone} />
          ))}
        </div>
      )}
    </div>
  )
}
