import { Link } from 'react-router-dom'
import { TIER_LABEL, nameColor } from '../lib/tiers'
import { formatMoney, formatR } from '../lib/format'
import { labelize } from '../lib/enums'
import Avatar from './Avatar'

export default function ScoreboardTable({ rows, showRank = false }) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>Nobody here yet.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {showRank && <th>#</th>}
            <th>Student</th>
            <th style={{ textAlign: 'right' }}>Plan adherence</th>
            <th style={{ textAlign: 'right' }}>Rule adherence</th>
            <th style={{ textAlign: 'right' }}>P&amp;L</th>
            <th style={{ textAlign: 'right' }}>Trades</th>
            <th style={{ textAlign: 'right' }}>Win rate</th>
            <th style={{ textAlign: 'right' }}>Avg R</th>
            <th style={{ textAlign: 'right' }}>Streak</th>
            <th style={{ textAlign: 'right' }}>30d</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              {showRank && <td>{i + 1}</td>}
              <td>
                <Link to={`/profile/${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                  <Avatar url={r.avatar_url} name={r.display_name} size={22} color={nameColor(r)} />
                  <span>
                    <span style={{ color: nameColor(r), fontWeight: 700 }}>{r.display_name}</span>{' '}
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{TIER_LABEL[r.tier]}</span>
                  </span>
                </Link>
              </td>
              <td style={{ textAlign: 'right', color: 'var(--gold)', fontWeight: 700 }}>
                {r.planAdherencePct === null ? '—' : `${r.planAdherencePct.toFixed(0)}%`}
              </td>
              <td style={{ textAlign: 'right' }}>{r.ruleAdherence === null ? '—' : `${r.ruleAdherence.toFixed(0)}%`}</td>
              <td style={{ textAlign: 'right', color: r.totalPnl > 0 ? 'var(--green)' : r.totalPnl < 0 ? 'var(--red)' : 'var(--text)' }}>
                {formatMoney(r.totalPnl)}
              </td>
              <td style={{ textAlign: 'right' }}>{r.totalTrades}</td>
              <td style={{ textAlign: 'right' }}>{r.winRate === null ? '—' : `${r.winRate.toFixed(0)}%`}</td>
              <td style={{ textAlign: 'right' }}>{formatR(r.avgR)}</td>
              <td style={{ textAlign: 'right' }}>{r.streak}</td>
              <td style={{ textAlign: 'right' }}>{r.consistency}/30</td>
              <td>{r.role === 'mentor' ? '—' : labelize(r.roadmap_stage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
