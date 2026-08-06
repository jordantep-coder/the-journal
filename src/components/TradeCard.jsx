import { Link, useNavigate } from 'react-router-dom'
import { formatMoney, formatR, formatDateTime } from '../lib/format'
import { effectiveR } from '../lib/stats'
import { TIER_LABEL, nameColor } from '../lib/tiers'
import Avatar from './Avatar'

export default function TradeCard({ trade, timezone, owner }) {
  const navigate = useNavigate()
  const edgeColor =
    trade.rule_breaches?.length > 0
      ? 'var(--amber)'
      : trade.pnl > 0
        ? 'var(--green)'
        : trade.pnl < 0
          ? 'var(--red)'
          : 'var(--border)'

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/trades/${trade.id}`)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/trades/${trade.id}`)}
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
        cursor: 'pointer',
      }}
    >
      <div>
        {owner && (
          <Link
            to={`/profile/${owner.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, width: 'fit-content', textDecoration: 'none' }}
          >
            <Avatar url={owner.avatar_url} name={owner.display_name} size={18} color={nameColor(owner)} />
            <span style={{ color: nameColor(owner), fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {owner.display_name}
            </span>{' '}
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{TIER_LABEL[owner.tier]}</span>
          </Link>
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
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{formatR(effectiveR(trade))}</div>
      </div>
    </div>
  )
}
