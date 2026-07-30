import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { DIRECTIONS, ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, MISTAKE_TAGS, EMOTIONS, labelize } from '../lib/enums'

const EMPTY_FORM = {
  instrument: 'NQ',
  direction: 'long',
  entry_datetime: '',
  exit_datetime: '',
  entry_price: '',
  exit_price: '',
  stop_loss: '',
  take_profit: '',
  size: '',
  pnl: '',
  breakEven: false,
  account_type: 'sim',
  setup_tag: '',
  followed_plan: null,
  mistake_tag: 'none',
  emotion_before: '',
  emotion_during: '',
  emotion_after: '',
  notes: '',
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function computeRMultiple({ pnl, entry_price, stop_loss, size, pointValue }) {
  if (pnl === null || entry_price === null || stop_loss === null || size === null || !pointValue) return null
  const risk = Math.abs(entry_price - stop_loss)
  if (risk === 0 || size === 0) return null
  return pnl / (risk * size * pointValue)
}

export default function LogTrade() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [instruments, setInstruments] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [screenshot, setScreenshot] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('instrument_point_values')
      .select('instrument, point_value')
      .then(({ data, error }) => {
        if (!error && data) setInstruments(data)
      })
  }, [])

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!screenshot) {
      setError('A chart screenshot is required.')
      return
    }
    if (form.followed_plan === null) {
      setError('Did you follow your plan? Choose yes or no.')
      return
    }

    setSubmitting(true)

    const path = `${profile.id}/${crypto.randomUUID()}-${screenshot.name}`
    const { error: uploadError } = await supabase.storage.from('trade-screenshots').upload(path, screenshot)
    if (uploadError) {
      setError(`Screenshot upload failed: ${uploadError.message}`)
      setSubmitting(false)
      return
    }

    const pointValue = instruments.find((i) => i.instrument === form.instrument)?.point_value ?? null
    const entry_price = toNumberOrNull(form.entry_price)
    const stop_loss = toNumberOrNull(form.stop_loss)
    const size = toNumberOrNull(form.size)
    const pnl = toNumberOrNull(form.pnl)

    const payload = {
      user_id: profile.id,
      instrument: form.instrument,
      direction: form.direction,
      entry_datetime: form.entry_datetime ? new Date(form.entry_datetime).toISOString() : null,
      exit_datetime: form.exit_datetime ? new Date(form.exit_datetime).toISOString() : null,
      entry_price,
      exit_price: toNumberOrNull(form.exit_price),
      stop_loss,
      take_profit: toNumberOrNull(form.take_profit),
      size,
      pnl,
      r_multiple: computeRMultiple({ pnl, entry_price, stop_loss, size, pointValue }),
      account_type: form.account_type,
      setup_tag: form.setup_tag || null,
      followed_plan: form.followed_plan,
      mistake_tag: form.mistake_tag,
      emotion_before: form.emotion_before || null,
      emotion_during: form.emotion_during || null,
      emotion_after: form.emotion_after || null,
      screenshot_url: path,
      notes: form.notes || null,
    }

    const { error: insertError } = await supabase.from('trades').insert(payload)
    if (insertError) {
      await supabase.storage.from('trade-screenshots').remove([path])
      setError(`Could not save trade: ${insertError.message}`)
      setSubmitting(false)
      return
    }

    navigate('/', { state: { flash: 'Trade logged.' } })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1>Log a Trade</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
        Before you open the charts: are you here to trade, or to feel something? If it's the second one, close the
        laptop.
      </p>

      <form onSubmit={handleSubmit}>
        <FollowedPlanToggle value={form.followed_plan} onChange={(v) => setForm((f) => ({ ...f, followed_plan: v }))} />

        <div className="panel" style={{ display: 'grid', gap: 0 }}>
          <div className="field">
            <label>Market</label>
            <div
              style={{
                background: 'var(--panel-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px 14px',
                color: 'var(--text)',
                fontSize: 15,
              }}
            >
              NQ
            </div>
          </div>

          <div className="field">
            <label htmlFor="direction">Direction</label>
            <select id="direction" value={form.direction} onChange={set('direction')}>
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {labelize(d)}
                </option>
              ))}
            </select>
          </div>

          <TwoCol>
            <div className="field">
              <label htmlFor="entry_datetime">Entry time</label>
              <input id="entry_datetime" type="datetime-local" required value={form.entry_datetime} onChange={set('entry_datetime')} />
            </div>
            <div className="field">
              <label htmlFor="exit_datetime">Exit time</label>
              <input id="exit_datetime" type="datetime-local" value={form.exit_datetime} onChange={set('exit_datetime')} />
            </div>
          </TwoCol>

          <TwoCol>
            <div className="field">
              <label htmlFor="entry_price">Entry price</label>
              <input id="entry_price" type="number" step="any" required value={form.entry_price} onChange={set('entry_price')} />
            </div>
            <div className="field">
              <label htmlFor="exit_price">Exit price</label>
              <input id="exit_price" type="number" step="any" value={form.exit_price} onChange={set('exit_price')} />
            </div>
          </TwoCol>

          <TwoCol>
            <div className="field">
              <label htmlFor="stop_loss">Stop loss</label>
              <input id="stop_loss" type="number" step="any" required value={form.stop_loss} onChange={set('stop_loss')} />
            </div>
            <div className="field">
              <label htmlFor="take_profit">Take profit</label>
              <input id="take_profit" type="number" step="any" value={form.take_profit} onChange={set('take_profit')} />
            </div>
          </TwoCol>

          <TwoCol>
            <div className="field">
              <label htmlFor="size">Size (contracts)</label>
              <input id="size" type="number" min="1" step="1" required value={form.size} onChange={set('size')} />
            </div>
            <div className="field">
              <label htmlFor="pnl">P&amp;L</label>
              <input id="pnl" type="number" step="any" value={form.pnl} onChange={set('pnl')} />
            </div>
          </TwoCol>

          <label
            htmlFor="break_even"
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}
          >
            <input
              id="break_even"
              type="checkbox"
              checked={form.breakEven}
              onChange={(e) => {
                const checked = e.target.checked
                setForm((f) => ({ ...f, breakEven: checked, pnl: checked ? '0' : f.pnl }))
              }}
            />
            <span style={{ fontSize: 14, color: 'var(--text)' }}>Break even</span>
          </label>

          <div className="field">
            <label htmlFor="account_type">Account type</label>
            <select id="account_type" value={form.account_type} onChange={set('account_type')}>
              {ACCOUNT_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ACCOUNT_TYPE_LABELS[a]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="setup_tag">Setup</label>
            <input id="setup_tag" type="text" placeholder="e.g. AM range breakout" value={form.setup_tag} onChange={set('setup_tag')} />
          </div>

          <div className="field">
            <label htmlFor="mistake_tag">Mistake</label>
            <select id="mistake_tag" value={form.mistake_tag} onChange={set('mistake_tag')}>
              {MISTAKE_TAGS.map((m) => (
                <option key={m} value={m}>
                  {labelize(m)}
                </option>
              ))}
            </select>
          </div>

          <TwoCol>
            <EmotionSelect id="emotion_before" label="Emotion before" value={form.emotion_before} onChange={set('emotion_before')} />
            <EmotionSelect id="emotion_during" label="Emotion during" value={form.emotion_during} onChange={set('emotion_during')} />
          </TwoCol>
          <EmotionSelect id="emotion_after" label="Emotion after" value={form.emotion_after} onChange={set('emotion_after')} />

          <div className="field">
            <label htmlFor="screenshot">Chart screenshot (required)</label>
            <input
              id="screenshot"
              type="file"
              accept="image/*"
              required
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={4} value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save trade'}
        </button>
      </form>
    </div>
  )
}

function TwoCol({ children }) {
  return <div className="two-col">{children}</div>
}

function EmotionSelect({ id, label, value, onChange }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={onChange}>
        <option value="">—</option>
        {EMOTIONS.map((e) => (
          <option key={e} value={e}>
            {labelize(e)}
          </option>
        ))}
      </select>
    </div>
  )
}

function FollowedPlanToggle({ value, onChange }) {
  return (
    <div className="field" style={{ marginBottom: 20 }}>
      <label>Followed your plan?</label>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1,
            background: value === true ? 'var(--gold)' : 'var(--panel)',
            color: value === true ? '#16181e' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className="btn"
          style={{
            flex: 1,
            background: value === false ? 'var(--gold)' : 'var(--panel)',
            color: value === false ? '#16181e' : 'var(--text)',
            border: '1px solid var(--border)',
          }}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  )
}
