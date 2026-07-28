import { useRef, useState } from 'react'
import { formatMoney } from '../lib/format'

const WIDTH = 600
const HEIGHT = 200
const PAD_TOP = 14
const PAD_BOTTOM = 28
const PAD_X = 10

const GREEN = 'var(--green)'
const RED = 'var(--red)'

// Splits a polyline into runs above/below zero, inserting the exact
// zero-crossing point where a segment changes sign, so each drawn piece can
// carry the correct P&L color (green above the baseline, red below it) —
// this is the "line vs. baseline" / diverging job, not a single trend hue.
function buildSegments(points, xScale, yScale) {
  const segments = []
  let current = null

  function push(p0, p1, sign) {
    const color = sign >= 0 ? GREEN : RED
    if (current && current.color === color) {
      current.d += ` L ${xScale(p1.x)} ${yScale(p1.value)}`
    } else {
      if (current) segments.push(current)
      current = { color, d: `M ${xScale(p0.x)} ${yScale(p0.value)} L ${xScale(p1.x)} ${yScale(p1.value)}` }
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const sameSign = (p0.value >= 0) === (p1.value >= 0)
    if (sameSign) {
      push(p0, p1, p1.value)
    } else {
      const t = p0.value / (p0.value - p1.value)
      const crossing = { x: p0.x + t * (p1.x - p0.x), value: 0 }
      push(p0, crossing, p0.value)
      push(crossing, p1, p1.value)
    }
  }
  if (current) segments.push(current)
  return segments
}

export default function EquityCurve({ points }) {
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  if (points.length === 0) {
    return <p style={{ color: 'var(--muted)' }}>No trades yet.</p>
  }

  const xs = points.map((p) => p.x)
  const values = points.map((p) => p.value)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(0, ...values)
  const yMax = Math.max(0, ...values)
  const yRange = yMax - yMin || 1

  const xScale = (x) => PAD_X + ((x - xMin) / (xMax - xMin || 1)) * (WIDTH - PAD_X * 2)
  const yScale = (v) => PAD_TOP + (1 - (v - yMin) / yRange) * (HEIGHT - PAD_TOP - PAD_BOTTOM)

  const segments = buildSegments(points, xScale, yScale)
  const zeroY = yScale(0)
  const netColor = values[values.length - 1] >= 0 ? GREEN : RED

  function handleMove(e) {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())
    let nearest = 0
    let best = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(xScale(p.x) - svgPt.x)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <line x1={PAD_X} y1={zeroY} x2={WIDTH - PAD_X} y2={zeroY} stroke="var(--border)" strokeWidth="1" />
        <text x={PAD_X} y={zeroY - 4} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">
          $0
        </text>

        {segments.map((seg, i) => (
          <path key={i} d={seg.d} stroke={seg.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        <text x={PAD_X} y={HEIGHT - 8} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">
          {new Date(xMin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 8} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)" textAnchor="end">
          {new Date(xMax).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>

        {hovered && (
          <g>
            <line
              x1={xScale(hovered.x)}
              y1={PAD_TOP}
              x2={xScale(hovered.x)}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--border)"
              strokeWidth="1"
            />
            <circle cx={xScale(hovered.x)} cy={yScale(hovered.value)} r="4" fill={netColor} stroke="var(--panel)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ color: 'var(--muted)', fontSize: 11 }}>
            {new Date(hovered.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: hovered.value >= 0 ? GREEN : RED }}>
            {formatMoney(hovered.value)}
          </div>
        </div>
      )}
    </div>
  )
}
