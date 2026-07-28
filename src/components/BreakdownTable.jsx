import { formatMoney, formatR } from '../lib/format'

export default function BreakdownTable({ rows }) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>Not enough data yet.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th style={{ textAlign: 'right' }}>Trades</th>
            <th style={{ textAlign: 'right' }}>Win rate</th>
            <th style={{ textAlign: 'right' }}>Avg R</th>
            <th style={{ textAlign: 'right' }}>Total P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td style={{ textTransform: 'capitalize' }}>{r.label.replace(/_/g, ' ')}</td>
              <td style={{ textAlign: 'right' }}>{r.totalTrades}</td>
              <td style={{ textAlign: 'right' }}>{r.winRate === null ? '—' : `${r.winRate.toFixed(0)}%`}</td>
              <td style={{ textAlign: 'right' }}>{formatR(r.avgR)}</td>
              <td
                style={{
                  textAlign: 'right',
                  color: r.totalPnl > 0 ? 'var(--green)' : r.totalPnl < 0 ? 'var(--red)' : 'var(--text)',
                }}
              >
                {formatMoney(r.totalPnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
