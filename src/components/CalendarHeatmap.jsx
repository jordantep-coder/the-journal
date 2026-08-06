import { dayKey, formatCompactMoney } from '../lib/format'
import { computeTradeStats } from '../lib/stats'

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F']

// win/loss/flat drive the cell's colour wash; a day or week with zero
// trades gets no entry here at all and renders fully blank (see below).
function pnlClass(totalPnl) {
  if (totalPnl > 0) return 'win'
  if (totalPnl < 0) return 'loss'
  return 'flat'
}

// Sunday folds into the following Monday (CME futures' Sunday-evening
// open is conventionally the start of Monday's trading week); Saturday
// folds into the preceding Friday (a late Friday session can roll past
// midnight ET into Saturday for timezones far ahead of ET). Clamped so a
// weekend day at the very edge of the month always folds into a weekday
// that's still inside the displayed month, rather than a day that would
// belong to the adjacent month's grid.
function weekendFoldTarget(day, dow, daysInMonth) {
  if (dow === 0) return day === daysInMonth ? daysInMonth - 2 : day + 1
  return day === 1 ? 3 : day - 1
}

export default function CalendarHeatmap({ year, month, trades, timezone, onPrevMonth, onNextMonth, onDayClick }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const monthStats = computeTradeStats(trades)

  // Raw trades bucketed by actual calendar day (still includes weekends —
  // this is what weekend-fold merging reads from).
  const tradesByDay = new Map()
  for (const t of trades) {
    const key = dayKey(t.entry_datetime, timezone)
    if (!key.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) continue
    const day = Number(key.slice(-2))
    if (!tradesByDay.has(day)) tradesByDay.set(day, [])
    tradesByDay.get(day).push(t)
  }

  // Display buckets: weekday day-numbers only, each pre-seeded with its own
  // trades, then weekend days merged in via the fold rule. This is what
  // actually renders and what weekly totals sum — so a folded trade counts
  // toward the weekday cell's total and its week's total, never dropped.
  const displayTradesByDay = new Map()
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow >= 1 && dow <= 5) displayTradesByDay.set(d, [...(tradesByDay.get(d) || [])])
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow !== 0 && dow !== 6) continue
    const weekendTrades = tradesByDay.get(d)
    if (!weekendTrades?.length) continue
    const target = weekendFoldTarget(d, dow, daysInMonth)
    displayTradesByDay.get(target).push(...weekendTrades)
  }

  // Row layout: walk weekdays in order, starting a new row at each Monday
  // (Mon..Fri columns), so leading/trailing partial weeks land in the
  // correct columns rather than just chunking every 5 days.
  const weeks = []
  let currentRow = new Array(5).fill(null)
  let rowHasContent = false
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow < 1 || dow > 5) continue
    const col = dow - 1
    if (col === 0 && rowHasContent) {
      weeks.push(currentRow)
      currentRow = new Array(5).fill(null)
    }
    currentRow[col] = d
    rowHasContent = true
  }
  if (rowHasContent) weeks.push(currentRow)

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

        {weeks.map((days, weekIndex) => (
          <WeekRow key={weekIndex} days={days} weekIndex={weekIndex} displayTradesByDay={displayTradesByDay} onDayClick={onDayClick} />
        ))}
      </div>
    </div>
  )
}

function WeekRow({ days, weekIndex, displayTradesByDay, onDayClick }) {
  const weekTrades = days.flatMap((d) => (d === null ? [] : displayTradesByDay.get(d) || []))
  const weekStats = computeTradeStats(weekTrades)

  return (
    <>
      {days.map((day, i) =>
        day === null ? (
          <div key={i} />
        ) : (
          <DayCell key={i} day={day} dayTrades={displayTradesByDay.get(day) || []} onDayClick={onDayClick} />
        ),
      )}
      <WeekTotalCell weekNumber={weekIndex + 1} stats={weekStats} />
    </>
  )
}

function DayCell({ day, dayTrades, onDayClick }) {
  const stats = computeTradeStats(dayTrades)
  const hasTrades = stats.totalTrades > 0

  return (
    <div
      className={`calendar-cell ${hasTrades ? pnlClass(stats.totalPnl) : ''}`}
      onClick={hasTrades ? () => onDayClick(day, dayTrades) : undefined}
      role={hasTrades ? 'button' : undefined}
      tabIndex={hasTrades ? 0 : undefined}
      onKeyDown={hasTrades ? (e) => (e.key === 'Enter' || e.key === ' ') && onDayClick(day, dayTrades) : undefined}
      style={hasTrades ? { cursor: 'pointer' } : undefined}
    >
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
