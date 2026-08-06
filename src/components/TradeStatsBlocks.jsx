import { computeTradeStats, groupPerformance } from '../lib/stats'
import { formatR } from '../lib/format'
import StatTile from './StatTile'
import EquityCurve from './EquityCurve'
import BreakdownTable from './BreakdownTable'

// The stat blocks shared between My Stats (own page) and a cohort member's
// read-only profile. Plan adherence/equity curve/win rate/avg R/profit
// factor always show; Expectancy and the by-setup/by-mistake breakdowns are
// optional since the profile page drops them in favor of emotion sections.
export default function TradeStatsBlocks({ trades, showExpectancy = true, showBreakdowns = true }) {
  const stats = computeTradeStats(trades)

  const equityPoints = (() => {
    let cum = 0
    return trades
      .filter((t) => t.pnl !== null && t.pnl !== undefined)
      .map((t) => {
        cum += t.pnl
        return { x: new Date(t.entry_datetime).getTime(), value: cum }
      })
  })()

  const bySetup = showBreakdowns ? groupPerformance(trades, 'setup_tag') : null
  const byMistake = showBreakdowns ? groupPerformance(trades, 'mistake_tag', { emptyLabel: 'none' }) : null

  return (
    <>
      <div className="panel" style={{ textAlign: 'center', margin: '20px 0 28px' }}>
        <p
          style={{
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            margin: 0,
          }}
        >
          Plan adherence
        </p>
        <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 56, margin: '8px 0 0' }}>
          {stats.planAdherencePct === null ? '—' : `${stats.planAdherencePct.toFixed(0)}%`}
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
          {stats.totalTrades} trade{stats.totalTrades === 1 ? '' : 's'} logged
        </p>
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Equity curve</h2>
      <div className="panel" style={{ marginBottom: 28 }}>
        <EquityCurve points={equityPoints} />
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <StatTile label="Win rate" value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(0)}%`} />
        <StatTile label="Avg R" value={formatR(stats.avgR)} />
        {showExpectancy && (
          <StatTile
            label="Expectancy"
            value={stats.expectancy === null ? '—' : stats.expectancy.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            color={stats.expectancy > 0 ? 'var(--green)' : stats.expectancy < 0 ? 'var(--red)' : 'var(--text)'}
          />
        )}
        <StatTile
          label="Profit factor"
          value={stats.profitFactor === null ? '—' : stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
        />
      </div>

      {showBreakdowns && (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>By setup</h2>
          <div className="panel" style={{ marginBottom: 28 }}>
            <BreakdownTable rows={bySetup} />
          </div>

          <h2 style={{ fontSize: 16, marginBottom: 12 }}>By mistake</h2>
          <div className="panel" style={{ marginBottom: 28 }}>
            <BreakdownTable rows={byMistake} />
          </div>
        </>
      )}
    </>
  )
}
