import { dayKey, formatCompactMoney } from '../lib/format'
import { computeTradeStats } from '../lib/stats'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// win/loss/flat drive the cell's colour wash; a day or week with zero
// trades gets no entry here at all and renders fully blank (see below).
function pnlClass(totalPnl) {
  if (totalPnl > 0) return 'win'
  if (totalPnl < 0) return 'loss'
  return 'flat'
}

export default function CalendarHeatmap({ year, month, trades, timezone, onPrevMonth, onNextMonth }) {
  // Bucket raw trades by local calendar day, then hand each bucket to
  // computeTradeStats so day/week/month totals are all the same reused
  // aggregation logic rather than three hand-rolled sums.
  const tradesByDay = new Map()
  for (const t of trades) {
    const key = dayKey(t.entry_datetime, timezone)
    if (!key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) continue
    const day = Number(key.slice(-2))
    if (!tradesByDay.has(day)) tradesByDay.set(day, [])
    tradesByDay.get(day).push(t)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const monthStats = computeTradeStats(trades)

  // Build week rows: each is 7 day-slots (nulls for the leading/trailing
  // blanks) plus the trades belonging to that row, for the weekly total cell.
  const weeks = []
  let currentDays = []
  let currentTrades = []

  function flushWeek() {
    while (currentDays.length < 7) currentDays.push(null)
    weeks.push({ days: currentDays, trades: currentTrades })
    currentDays = []
    currentTrades = []
  }

  for (let i = 0; i < firstWeekday; i++) currentDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push(d)
    currentTrades.push(...(tradesByDay.get(d) || []))
    if (currentDays.length === 7) flushWeek()
  }
  if (currentDays.length) flushWeek()

  return (
    <div className="panel">
      <div className="cal-header">
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={onPrevMonth}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600 }}>{monthLabel}</div>
          <div className={`cal-month-total ${monthStats.totalTrades ? pnlClass(monthStats.totalPnl) : ''}`}>
            {monthStats.totalTrades
              ? `${formatCompactMoney(monthStats.totalPnl)} · ${monthStats.totalTrades} trade${monthStats.totalTrades === 1 ? '' : 's'}`
              : 'No trades yet'}
          </div>
        </div>
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
        <div className="calendar-week-header" />

        {weeks.map((week, weekIndex) => (
          <WeekRow key={weekIndex} week={week} weekIndex={weekIndex} tradesByDay={tradesByDay} />
        ))}
      </div>
    </div>
  )
}

function WeekRow({ week, weekIndex, tradesByDay }) {
  const weekStats = computeTradeStats(week.trades)

  return (
    <>
      {week.days.map((day, i) =>
        day === null ? (
          <div key={i} />
        ) : (
          <DayCell key={i} day={day} dayTrades={tradesByDay.get(day) || []} />
        ),
      )}
      <WeekTotalCell weekNumber={weekIndex + 1} stats={weekStats} />
    </>
  )
}

function DayCell({ day, dayTrades }) {
  const stats = computeTradeStats(dayTrades)
  const hasTrades = stats.totalTrades > 0

  return (
    <div className={`calendar-cell ${hasTrades ? pnlClass(stats.totalPnl) : ''}`}>
      <div className="date-num">{day}</div>
      {hasTrades && (
        <>
          <div className="cell-pnl">{formatCompactMoney(stats.totalPnl)}</div>
          <div className="cell-count">
            {stats.totalTrades} trade{stats.totalTrades === 1 ? '' : 's'}
          </div>
        </>
      )}
    </div>
  )
}

function WeekTotalCell({ weekNumber, stats }) {
  const hasTrades = stats.totalTrades > 0

  return (
    <div className={`calendar-week-total ${hasTrades ? pnlClass(stats.totalPnl) : ''}`}>
      <div className="date-num">Week {weekNumber}</div>
      {hasTrades && (
        <>
          <div className="cell-pnl">{formatCompactMoney(stats.totalPnl)}</div>
          <div className="cell-count">
            {stats.totalTrades} trade{stats.totalTrades === 1 ? '' : 's'}
          </div>
        </>
      )}
    </div>
  )
}
