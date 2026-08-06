import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIER_LABEL, nameColor } from '../lib/tiers'
import CalendarHeatmap from '../components/CalendarHeatmap'
import TradeCard from '../components/TradeCard'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'

const RECENT_LIMIT = 15

export default function MyJournal() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const flash = location.state?.flash

  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed

  const [members, setMembers] = useState([profile])
  const [viewedUserId, setViewedUserId] = useState(profile.id)

  const [recentTrades, setRecentTrades] = useState([])
  const [monthTrades, setMonthTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null) // { day, trades } | null

  const isOwner = viewedUserId === profile.id
  // Everyone in the cohort can see everyone's trades (shared trades RLS), so
  // this is purely "whose calendar am I looking at" — falls back to the
  // logged-in profile until the members list loads.
  const viewedProfile = members.find((m) => m.id === viewedUserId) || profile

  useEffect(() => {
    supabase
      .from('users')
      .select('id, display_name, avatar_url, role, tier, roadmap_stage, timezone')
      .eq('active', true)
      .order('display_name')
      .then(({ data }) => {
        if (data?.length) setMembers(data)
      })
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', viewedUserId)
      .order('entry_datetime', { ascending: false })
      .limit(RECENT_LIMIT)
      .then(({ data }) => {
        setRecentTrades(data || [])
        setLoading(false)
      })
  }, [viewedUserId])

  useEffect(() => {
    // Widen by a day on each side so no local-timezone day at the month's
    // edges gets clipped by a UTC-boundary query; exact bucketing happens
    // client-side in CalendarHeatmap using the viewed user's timezone.
    const rangeStart = new Date(Date.UTC(year, month, 1) - 24 * 3600 * 1000).toISOString()
    const rangeEnd = new Date(Date.UTC(year, month + 1, 1) + 24 * 3600 * 1000).toISOString()

    supabase
      .from('trades')
      .select('id, entry_datetime, pnl, r_multiple, risk_amount, instrument, direction, setup_tag, rule_breaches')
      .eq('user_id', viewedUserId)
      .gte('entry_datetime', rangeStart)
      .lt('entry_datetime', rangeEnd)
      .then(({ data }) => setMonthTrades(data || []))
  }, [viewedUserId, year, month])

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

  function openDay(day, trades) {
    // Single trade that day — skip the picker and go straight to the review.
    if (trades.length === 1) {
      navigate(`/trades/${trades[0].id}`)
      return
    }
    setSelectedDay({ day, trades })
  }

  const dayLabel = selectedDay
    ? new Date(year, month, selectedDay.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar url={viewedProfile.avatar_url} name={viewedProfile.display_name} size={40} color={nameColor(viewedProfile)} />
          <div>
            <h1 style={{ marginBottom: 4 }}>{isOwner ? 'My Journal' : `${viewedProfile.display_name}'s Journal`}</h1>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              <strong style={{ color: nameColor(viewedProfile), fontFamily: 'var(--font-mono)' }}>
                {viewedProfile.display_name}
              </strong>{' '}
              — {TIER_LABEL[viewedProfile.tier]}
              {!isOwner && ' · Read-only'}
            </p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>

      {flash && <p style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{flash}</p>}

      <div className="field" style={{ marginTop: 20, marginBottom: isOwner ? 8 : 28, maxWidth: 280 }}>
        <label htmlFor="journal-viewer">Viewing</label>
        <select id="journal-viewer" value={viewedUserId} onChange={(e) => setViewedUserId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === profile.id ? `${m.display_name} (Me)` : m.display_name}
            </option>
          ))}
        </select>
      </div>

      {isOwner && (
        <Link to="/trades/new" className="btn btn-primary" style={{ width: '100%', margin: '20px 0 28px' }}>
          Log a trade
        </Link>
      )}

      <CalendarHeatmap
        year={year}
        month={month}
        trades={monthTrades}
        timezone={viewedProfile.timezone}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onDayClick={openDay}
      />

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>Recent trades</h2>

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : recentTrades.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No trades logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recentTrades.map((t) => (
            <TradeCard key={t.id} trade={t} timezone={viewedProfile.timezone} />
          ))}
        </div>
      )}

      {selectedDay && (
        <Modal title={dayLabel} onClose={() => setSelectedDay(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedDay.trades.map((t) => (
              <TradeCard key={t.id} trade={t} timezone={viewedProfile.timezone} />
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
