import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatR, formatDateTime } from '../lib/format'
import { labelize } from '../lib/enums'
import { RULES } from '../lib/rules'
import CommentThread from '../components/CommentThread'

export default function TradeDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [trade, setTrade] = useState(undefined) // undefined = loading, null = not found
  const [screenshotUrl, setScreenshotUrl] = useState(null)
  const [error, setError] = useState('')

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

      const { data: signed, error: signError } = await supabase.storage
        .from('trade-screenshots')
        .createSignedUrl(data.screenshot_url, 600)
      if (!cancelled && !signError) setScreenshotUrl(signed.signedUrl)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

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
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>{formatDateTime(trade.entry_datetime, profile.timezone)}</p>

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

      {screenshotUrl && (
        <img
          src={screenshotUrl}
          alt="Trade chart screenshot"
          style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', margin: '20px 0' }}
        />
      )}

      <div className="panel" style={{ marginBottom: 20 }}>
        <Row label="P&L" value={formatMoney(trade.pnl)} valueColor={trade.pnl > 0 ? 'var(--green)' : trade.pnl < 0 ? 'var(--red)' : undefined} />
        <Row label="R multiple" value={formatR(trade.r_multiple)} />
        <Row label="Followed plan" value={trade.followed_plan ? 'Yes' : 'No'} valueColor={trade.followed_plan ? 'var(--green)' : 'var(--red)'} />
        <Row label="Account type" value={labelize(trade.account_type)} />
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
