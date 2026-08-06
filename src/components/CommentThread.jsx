import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { TIER_COLOR, TIER_LABEL } from '../lib/tiers'
import { formatDateTime } from '../lib/format'

export default function CommentThread({ tradeId }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState(null) // null = loading
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('mentor_comments')
      .select('*, mentor:users(id, display_name, tier)')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })
    setComments(error ? [] : data || [])
  }

  useEffect(() => {
    load()
  }, [tradeId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    setPosting(true)
    setError('')

    const { error } = await supabase
      .from('mentor_comments')
      .insert({ trade_id: tradeId, mentor_id: profile.id, body: body.trim() })

    if (error) {
      setError('Could not post comment.')
    } else {
      setBody('')
      await load()
    }
    setPosting(false)
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Mentor comments</h2>

      <div className="panel">
        {comments === null ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>Loading…</p>
        ) : comments.length === 0 ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No comments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map((c) => (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <Link to={`/profile/${c.mentor.id}`} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, textDecoration: 'none' }}>
                    <span style={{ color: TIER_COLOR[c.mentor.tier], fontWeight: 700, fontSize: 14 }}>{c.mentor.display_name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{TIER_LABEL[c.mentor.tier]}</span>
                  </Link>
                  <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {formatDateTime(c.created_at, profile.timezone)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{c.body}</p>
              </div>
            ))}
          </div>
        )}

        {profile.role === 'mentor' && (
          <form onSubmit={handleSubmit} style={{ marginTop: comments?.length ? 20 : 0, borderTop: comments?.length ? '1px solid var(--border)' : 'none', paddingTop: comments?.length ? 16 : 0 }}>
            <div className="field" style={{ marginBottom: 10 }}>
              <textarea
                rows={3}
                placeholder="Leave feedback on this trade…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={posting || !body.trim()}>
              {posting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
