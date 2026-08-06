import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const LINK_STYLE = { color: 'var(--muted)', fontSize: 14, textDecoration: 'none' }
const ACTIVE_STYLE = { color: 'var(--gold)' }

export default function AppNav() {
  const { profile } = useAuth()

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      <span className="eyebrow">
        <span className="eyebrow-dot" />
        THE FREEDOM ELITE
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <NavLink to="/" end style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
          My Journal
        </NavLink>
        <NavLink to="/stats" style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
          My Stats
        </NavLink>
        <NavLink to="/feed" style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
          Team Stats
        </NavLink>
        <NavLink to="/scoreboard" style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
          Scoreboard
        </NavLink>
        <NavLink to="/rules" style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
          The Rules
        </NavLink>
        {profile.role === 'mentor' && (
          <NavLink to="/admin" style={({ isActive }) => (isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE)}>
            Admin
          </NavLink>
        )}
        <NavLink
          to="/settings"
          aria-label="Settings"
          style={({ isActive }) => ({
            ...(isActive ? { ...LINK_STYLE, ...ACTIVE_STYLE } : LINK_STYLE),
            fontSize: 21,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
          })}
        >
          ⚙
        </NavLink>
      </div>
    </nav>
  )
}
