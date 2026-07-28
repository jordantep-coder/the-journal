import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { ACCOUNT_TYPES, labelize } from '../lib/enums'
import TradeCard from '../components/TradeCard'

const FEED_LIMIT = 100
const SETUP_DEBOUNCE_MS = 300

export default function Feed() {
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState('')
  const [setupInput, setSetupInput] = useState('')
  const [setupQuery, setSetupQuery] = useState('')
  const [accountType, setAccountType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [trades, setTrades] = useState(null) // null = loading

  useEffect(() => {
    supabase
      .from('users')
      .select('id, display_name')
      .eq('active', true)
      .order('display_name')
      .then(({ data }) => setStudents(data || []))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setSetupQuery(setupInput.trim()), SETUP_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [setupInput])

  useEffect(() => {
    let query = supabase
      .from('trades')
      .select('*, owner:users(display_name, tier, timezone)')
      .order('entry_datetime', { ascending: false })
      .limit(FEED_LIMIT)

    if (studentId) query = query.eq('user_id', studentId)
    if (setupQuery) query = query.ilike('setup_tag', `%${setupQuery}%`)
    if (accountType) query = query.eq('account_type', accountType)
    if (dateFrom) query = query.gte('entry_datetime', new Date(dateFrom).toISOString())
    if (dateTo) query = query.lt('entry_datetime', new Date(new Date(dateTo).getTime() + 24 * 3600 * 1000).toISOString())

    let cancelled = false
    query.then(({ data, error }) => {
      if (cancelled) return
      setTrades(error ? [] : data || [])
    })
    return () => {
      cancelled = true
    }
  }, [studentId, setupQuery, accountType, dateFrom, dateTo])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Everyone</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>Every student's trades, newest first.</p>

      <div className="panel" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
          <label htmlFor="filter-student">Student</label>
          <select id="filter-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
          <label htmlFor="filter-setup">Setup</label>
          <input
            id="filter-setup"
            type="text"
            placeholder="Search setup…"
            value={setupInput}
            onChange={(e) => setSetupInput(e.target.value)}
          />
        </div>

        <div className="field" style={{ flex: '1 1 120px', marginBottom: 0 }}>
          <label htmlFor="filter-account">Account type</label>
          <select id="filter-account" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="">All</option>
            {ACCOUNT_TYPES.map((a) => (
              <option key={a} value={a}>
                {labelize(a)}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: '1 1 130px', marginBottom: 0 }}>
          <label htmlFor="filter-from">From</label>
          <input id="filter-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>

        <div className="field" style={{ flex: '1 1 130px', marginBottom: 0 }}>
          <label htmlFor="filter-to">To</label>
          <input id="filter-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {trades === null ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : trades.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No trades match these filters.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trades.map((t) => (
            <TradeCard key={t.id} trade={t} owner={t.owner} timezone={t.owner?.timezone || 'UTC'} />
          ))}
        </div>
      )}
    </div>
  )
}
