import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ROADMAP_STAGES, STUDENT_TIERS, labelize } from '../lib/enums'
import { nameColor } from '../lib/tiers'

const WEEK_MS = 7 * 24 * 3600 * 1000
const MONTH_MS = 30 * 24 * 3600 * 1000

export default function MentorAdmin() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Mentor Admin</h1>
      <CreateUserPanel />
      <StudentsPanel />
      <BlackoutDatesPanel />
    </div>
  )
}

// ------------------------------------------------------------------
// Create user — invites a new account. Auth account creation needs the
// service role key, which never reaches the browser, so this calls the
// create-user Edge Function instead of writing to the tables directly.
// ------------------------------------------------------------------
function CreateUserPanel() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [tier, setTier] = useState('vip')
  const [roadmapStage, setRoadmapStage] = useState('demo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, display_name: displayName, tier, roadmap_stage: roadmapStage },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setError(data?.error || error.message)
      return
    }

    setSuccess(`Invite sent to ${email}.`)
    setEmail('')
    setDisplayName('')
    setTier('vip')
    setRoadmapStage('demo')
  }

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Create user</h2>
      <form className="panel" onSubmit={handleSubmit}>
        <div className="two-col">
          <div className="field">
            <label htmlFor="new-email">Email</label>
            <input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="new-name">Name</label>
            <input id="new-name" type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </div>
        <div className="two-col">
          <div className="field">
            <label htmlFor="new-tier">Tier</label>
            <select id="new-tier" value={tier} onChange={(e) => setTier(e.target.value)}>
              {STUDENT_TIERS.map((t) => (
                <option key={t} value={t}>
                  {labelize(t)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-stage">Roadmap stage</label>
            <select id="new-stage" value={roadmapStage} onChange={(e) => setRoadmapStage(e.target.value)}>
              {ROADMAP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p style={{ color: 'var(--green)', fontSize: 14 }}>{success}</p>}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending invite…' : 'Create user & send invite'}
        </button>
      </form>
    </section>
  )
}

// ------------------------------------------------------------------
// Manage students — tier/stage/active are direct table updates (RLS
// already restricts writes to active mentors); the two right-hand columns
// are the "who's logged this week / who has open breaches" overview.
// ------------------------------------------------------------------
function StudentsPanel() {
  const [rows, setRows] = useState(null) // null = loading
  const [error, setError] = useState('')

  async function load() {
    const [{ data: users }, { data: trades }] = await Promise.all([
      supabase.from('users').select('*').eq('role', 'student').order('display_name'),
      supabase.from('trades').select('user_id, entry_datetime, rule_breaches'),
    ])

    const tradesByUser = new Map()
    for (const t of trades || []) {
      if (!tradesByUser.has(t.user_id)) tradesByUser.set(t.user_id, [])
      tradesByUser.get(t.user_id).push(t)
    }

    const now = Date.now()
    const computed = (users || []).map((u) => {
      const userTrades = tradesByUser.get(u.id) || []
      const tradesThisWeek = userTrades.filter((t) => now - new Date(t.entry_datetime).getTime() < WEEK_MS).length
      const openBreaches = userTrades.filter(
        (t) => now - new Date(t.entry_datetime).getTime() < MONTH_MS && (t.rule_breaches || []).length > 0,
      ).length
      return { ...u, tradesThisWeek, openBreaches }
    })

    setRows(computed)
  }

  useEffect(() => {
    load()
  }, [])

  async function updateField(id, field, value) {
    setError('')
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
    const { error } = await supabase.from('users').update({ [field]: value }).eq('id', id)
    if (error) {
      setError(`Could not update: ${error.message}`)
      load() // revert to server state
    }
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Students</h2>
      {error && <p className="error-text">{error}</p>}
      <div className="panel">
        {rows === null ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No students yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Tier</th>
                  <th>Stage</th>
                  <th>Account size</th>
                  <th>Timezone</th>
                  <th style={{ textAlign: 'right' }}>This week</th>
                  <th style={{ textAlign: 'right' }}>Open breaches (30d)</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: nameColor(r), fontWeight: 700 }}>{r.display_name}</td>
                    <td>
                      <select className="mini-input" value={r.tier} onChange={(e) => updateField(r.id, 'tier', e.target.value)}>
                        {STUDENT_TIERS.map((t) => (
                          <option key={t} value={t}>
                            {labelize(t)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="mini-input"
                        value={r.roadmap_stage}
                        onChange={(e) => updateField(r.id, 'roadmap_stage', e.target.value)}
                      >
                        {ROADMAP_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {labelize(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="mini-input"
                        type="number"
                        min="0"
                        step="any"
                        style={{ width: 90 }}
                        defaultValue={r.account_size}
                        onBlur={(e) => {
                          const v = Number(e.target.value)
                          if (v !== r.account_size) updateField(r.id, 'account_size', v)
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="mini-input"
                        type="text"
                        style={{ width: 140 }}
                        defaultValue={r.timezone}
                        onBlur={(e) => {
                          if (e.target.value !== r.timezone) updateField(r.id, 'timezone', e.target.value)
                        }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.tradesThisWeek}</td>
                    <td style={{ textAlign: 'right', color: r.openBreaches > 0 ? 'var(--amber)' : 'var(--text)' }}>
                      {r.openBreaches}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: 12 }}
                        onClick={() => updateField(r.id, 'active', !r.active)}
                      >
                        {r.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
        Account size and timezone drive the 1% risk and no-Friday rule checks — set them here so those checks are
        accurate for each student.
      </p>
    </section>
  )
}

// ------------------------------------------------------------------
// Blackout dates — mentor-maintained NFP weeks / bank holidays / declared
// no-news Mondays, the v1 data source for rules 04/05.
// ------------------------------------------------------------------
function BlackoutDatesPanel() {
  const { profile } = useAuth()
  const [dates, setDates] = useState(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('blackout_dates').select('*').order('date')
    setDates(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    if (!date || !reason.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('blackout_dates').insert({ date, reason: reason.trim(), created_by: profile.id })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDate('')
    setReason('')
    load()
  }

  async function handleDelete(id) {
    setDates((prev) => prev.filter((d) => d.id !== id))
    const { error } = await supabase.from('blackout_dates').delete().eq('id', id)
    if (error) load()
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Blackout dates</h2>
      <div className="panel">
        <form onSubmit={handleAdd} className="two-col" style={{ alignItems: 'end', marginBottom: 20 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bd-date">Date</label>
            <input id="bd-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bd-reason">Reason</label>
            <input
              id="bd-reason"
              type="text"
              placeholder="e.g. NFP week"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add blackout date'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        {dates === null ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : dates.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No blackout dates yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d.id}>
                  <td>{d.date}</td>
                  <td>{d.reason}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => handleDelete(d.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
