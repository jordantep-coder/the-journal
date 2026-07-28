import { dayKey } from '../lib/format'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarHeatmap({ year, month, trades, timezone, onPrevMonth, onNextMonth }) {
  const pnlByDay = new Map()
  for (const t of trades) {
    const key = dayKey(t.entry_datetime, timezone)
    if (!key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) continue
    pnlByDay.set(key, (pnlByDay.get(key) || 0) + Number(t.pnl || 0))
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, pnl: pnlByDay.has(key) ? pnlByDay.get(key) : null })
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={onPrevMonth}>
          ‹
        </button>
        <h3 style={{ margin: 0, color: 'var(--text)', textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
          {monthLabel}
        </h3>
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={onNextMonth}>
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((cell, i) =>
          cell === null ? (
            <div key={i} />
          ) : (
            <div
              key={i}
              className="calendar-cell"
              style={{
                background: cell.pnl > 0 ? 'rgba(53,197,106,.16)' : cell.pnl < 0 ? 'rgba(226,73,60,.16)' : 'var(--panel-2)',
                borderColor: cell.pnl > 0 ? 'var(--green)' : cell.pnl < 0 ? 'var(--red)' : 'var(--border)',
              }}
              title={cell.pnl !== null ? `${cell.pnl >= 0 ? '+' : ''}${cell.pnl.toFixed(2)}` : undefined}
            >
              {cell.day}
            </div>
          ),
        )}
      </div>
    </div>
  )
}
