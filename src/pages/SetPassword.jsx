import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function SetPassword() {
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    window.history.replaceState(null, '', window.location.pathname)
    setDone(true)
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            THE FREEDOM ELITE
          </span>
          <h1 style={{ marginTop: 16, fontSize: 26 }}>Set Your Password</h1>
        </div>

        {done ? (
          <div className="panel" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--green)', marginTop: 0 }}>Password set.</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.location.assign('/')}>
              Continue to the journal
            </button>
          </div>
        ) : loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>Loading…</p>
        ) : !session ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center' }}>
            This invite link is invalid or has expired — ask a mentor to send a new one.
          </p>
        ) : (
          <form className="panel" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Saving…' : 'Set password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
