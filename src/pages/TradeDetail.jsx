import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatR, formatDateTime } from '../lib/format'
import { effectiveR } from '../lib/stats'
import { labelize, ACCOUNT_TYPE_LABELS } from '../lib/enums'
import { RULES } from '../lib/rules'
import CommentThread from '../components/CommentThread'
import TradeComments from '../components/TradeComments'
import ReactionBar from '../components/ReactionBar'

async function signScreenshotUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from('trade-screenshots').createSignedUrl(path, 600)
  return error ? null : data.signedUrl
}

export default function TradeDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [trade, setTrade] = useState(undefined) // undefined = loading, null = not found
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const [error, setError] = useState('')
  const [screenshotBusy, setScreenshotBusy] = useState(false)
  const [screenshotError, setScreenshotError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error } = await supabase.from('trades').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (error || !data) {
        setError(error?.message || 'Trade not found.')
        setTrade(null)
        return
      }
      setTrade(data)
      const signedUrl = await signScreenshotUrl(data.screenshot_url)
      if (!cancelled) setScreenshotUrl(signedUrl)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const isOwner = trade && profile.id === trade.user_id

  async function handleReplaceScreenshot(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setScreenshotError('')
    setScreenshotBusy(true)

    const oldPath = trade.screenshot_url
    const newPath = `${profile.id}/${crypto.randomUUID()}-${file.name}`

    const { error: uploadError } = await supabase.storage.from('trade-screenshots').upload(newPath, file)
    if (uploadError) {
      setScreenshotBusy(false)
      setScreenshotError(`Upload failed: ${uploadError.message}`)
      return
    }

    const { error: updateError } = await supabase.from('trades').update({ screenshot_url: newPath }).eq('id', trade.id)
    if (updateError) {
      await supabase.storage.from('trade-screenshots').remove([newPath])
      setScreenshotBusy(false)
      setScreenshotError(`Could not save: ${updateError.message}`)
      return
    }

    if (oldPath) {
      const { error: removeError } = await supabase.storage.from('trade-screenshots').remove([oldPath])
      if (removeError) setScreenshotError(`Screenshot updated, but the old file could not be deleted: ${removeError.message}`)
    }

    setTrade((t) => ({ ...t, screenshot_url: newPath }))
    setScreenshotUrl(await signScreenshotUrl(newPath))
    setScreenshotBusy(false)
  }

  if (trade === undefined) {
    return <CenteredNote>Loading…</CenteredNote>
  }
  if (trade === null) {
    return <CenteredNote>{error}</CenteredNote>
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <Link to="/" style={{ color: 'var(--muted)', fontSize: 13 }}>
        ← Back to journal
      </Link>

      <h1 style={{ marginTop: 16 }}>
        {trade.instrument} · {labelize(trade.direction)}
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>{formatDateTime(trade.entry_datetime, profile.timezone)}</p>

      {trade.rule_breaches?.length > 0 && (
        <div className="panel" style={{ borderColor: 'var(--amber)', margin: '16px 0' }}>
          <p style={{ color: 'var(--amber)', fontSize: 13, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            ⚠ Rule breach flagged
          </p>
          {trade.rule_breaches.map((n) => (
            <p key={n} style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0' }}>
              {RULES[n - 1].number} — {RULES[n - 1].title}
            </p>
          ))}
        </div>
      )}

      {screenshotUrl ? (
        <div style={{ position: 'relative', margin: '20px 0' }}>
          <img
            src={screenshotUrl}
            alt="Trade chart screenshot"
            style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }}
          />
          {isOwner && (
            <label
              className="screenshot-edit-btn"
              title="Replace screenshot"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(22, 24, 30, 0.85)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                fontSize: 15,
                cursor: screenshotBusy ? 'default' : 'pointer',
              }}
            >
              {screenshotBusy ? '…' : '✎'}
              <input
                type="file"
                accept="image/*"
                onChange={handleReplaceScreenshot}
                disabled={screenshotBusy}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      ) : (
        isOwner && <p style={{ color: 'var(--muted)', fontSize: 13, margin: '20px 0 0' }}>No screenshot.</p>
      )}
      {screenshotError && <p className="error-text">{screenshotError}</p>}

      <div style={{ margin: '4px 0 24px' }}>
        <ReactionBar tradeId={trade.id} />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <Row label="P&L" value={formatMoney(trade.pnl)} valueColor={trade.pnl > 0 ? 'var(--green)' : trade.pnl < 0 ? 'var(--red)' : undefined} />
        <Row label="R multiple" value={formatR(effectiveR(trade))} />
        <Row label="Followed plan" value={trade.followed_plan ? 'Yes' : 'No'} valueColor={trade.followed_plan ? 'var(--green)' : 'var(--red)'} />
        <Row label="Account type" value={ACCOUNT_TYPE_LABELS[trade.account_type]} />
        <Row label="Setup" value={trade.setup_tag || '—'} />
        <Row label="Mistake" value={labelize(trade.mistake_tag)} />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <Row label="Entry price" value={trade.entry_price} />
        <Row label="Exit price" value={trade.exit_price ?? '—'} />
        <Row label="Stop loss" value={trade.stop_loss} />
        <Row label="Take profit" value={trade.take_profit ?? '—'} />
        <Row label="Size" value={trade.size} />
        <Row label="Exit time" value={trade.exit_datetime ? formatDateTime(trade.exit_datetime, profile.timezone) : '—'} />
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <Row label="Before" value={trade.emotion_before ? labelize(trade.emotion_before) : '—'} />
        <Row label="During" value={trade.emotion_during ? labelize(trade.emotion_during) : '—'} />
        <Row label="After" value={trade.emotion_after ? labelize(trade.emotion_after) : '—'} />
        {trade.emotion_notes && (
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>{trade.emotion_notes}</p>
        )}
      </div>

      {trade.notes && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 0 }}>NOTES</p>
          <p style={{ margin: 0 }}>{trade.notes}</p>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <TradeComments tradeId={trade.id} />
      </div>

      <CommentThread tradeId={trade.id} />
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--muted)', fontSize: 14 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: valueColor || 'var(--text)' }}>{value}</span>
    </div>
  )
}

function CenteredNote({ children }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      {children}
    </div>
  )
}
