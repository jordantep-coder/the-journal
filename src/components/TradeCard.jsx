import { Link } from 'react-router-dom'
import { formatMoney, formatR, formatDateTime } from '../lib/format'
import { TIER_LABEL, TIER_COLOR } from '../lib/tiers'

export default function TradeCard({ trade, timezone, owner }) {
  const edgeColor =
    trade.rule_breaches?.length > 0
      ? 'var(--amber)'
      : trade.pnl > 0
        ? 'var(--green)'
        : trade.pnl < 0
          ? 'var(--red)'
          : 'var(--border)'

  return (
    <Link
      to={`/trades/${trade.id}`}
      className="panel"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '18px 20px',
        borderLeft: `3px solid ${edgeColor}`,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div>
        {owner && (
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: TIER_COLOR[owner.tier], fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {owner.display_name}
            </span>{' '}
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{TIER_LABEL[owner.tier]}</span>
          </div>
        )}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          {trade.instrument} · {trade.direction === 'long' ? 'Long' : 'Short'}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>
          {formatDateTime(trade.entry_datetime, timezone)}
          {trade.setup_tag ? ` · ${trade.setup_tag}` : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
        <div style={{ color: trade.pnl > 0 ? 'var(--green)' : trade.pnl < 0 ? 'var(--red)' : 'var(--text)' }}>
          {formatMoney(trade.pnl)}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{formatR(trade.r_multiple)}</div>
      </div>
    </Link>
  )
}
