// Renders a person's profile picture, or an initial-letter fallback in the
// same circle if they haven't set one — used everywhere a display_name shows.
export default function Avatar({ url, name, size = 28, color }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'

  const baseStyle = {
    width: size,
    height: size,
    minWidth: size,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    flexShrink: 0,
  }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={{ ...baseStyle, objectFit: 'cover', background: 'var(--panel-2)' }}
      />
    )
  }

  return (
    <span
      style={{
        ...baseStyle,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--panel-2)',
        color: color || 'var(--muted)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: size * 0.42,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  )
}
