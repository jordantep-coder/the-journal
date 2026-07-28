export default function StatTile({ label, value, color = 'var(--text)', size = 22 }) {
  return (
    <div className="panel" style={{ padding: '18px 20px' }}>
      <div
        style={{
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
        }}
      >
        {label}
      </div>
      <div style={{ color, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: size, marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}
