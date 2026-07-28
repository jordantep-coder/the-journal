// Horizontal magnitude bars for a fixed category set (one hue, sequential —
// not identity/categorical, so no multi-hue palette or CVD check applies).
export default function BarList({ items, color = 'var(--gold)', trackColor = 'var(--gold-dim)' }) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => (
        <div
          key={item.label}
          tabIndex={0}
          aria-label={`${item.label}: ${item.display}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '6px 8px',
            borderRadius: 6,
          }}
          className="bar-row"
        >
          <span
            style={{
              width: 96,
              flexShrink: 0,
              fontSize: 13,
              color: 'var(--muted)',
              textTransform: 'capitalize',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </span>
          <div style={{ flex: 1, height: 18, background: trackColor, borderRadius: 4, overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.max((item.value / max) * 100, 3)}%`,
                height: '100%',
                background: color,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
              }}
            />
          </div>
          <span style={{ width: 52, flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', textAlign: 'right' }}>
            {item.display}
          </span>
        </div>
      ))}
    </div>
  )
}
