import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { nameColor } from '../lib/tiers'
import { formatDateTime } from '../lib/format'
import Avatar from './Avatar'
import ReactionBar from './ReactionBar'

const ACTION_BTN_STYLE = { background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', padding: 0 }

// Cohort-wide comments (any active user can read/post; author-only edit or
// delete), separate from the mentor-only CommentThread's official feedback.
export default function TradeComments({ tradeId }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState(null) // null = loading
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editBody, setEditBody] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('trade_comments')
      .select('*, author:users(id, display_name, avatar_url, tier, role, roadmap_stage)')
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

    const { error } = await supabase.from('trade_comments').insert({ trade_id: tradeId, user_id: profile.id, body: body.trim() })

    if (error) {
      setError('Could not post comment.')
    } else {
      setBody('')
      await load()
    }
    setPosting(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this comment?')) return
    setComments((prev) => prev.filter((c) => c.id !== id))
    const { error } = await supabase.from('trade_comments').delete().eq('id', id)
    if (error) load()
  }

  function startEdit(c) {
    setEditingId(c.id)
    setEditBody(c.body)
  }

  async function saveEdit(id) {
    if (!editBody.trim()) return
    const { error } = await supabase.from('trade_comments').update({ body: editBody.trim() }).eq('id', id)
    if (!error) {
      setEditingId(null)
      await load()
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Comments</h2>

      <div className="panel">
        {comments === null ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>Loading…</p>
        ) : comments.length === 0 ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No comments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {comments.map((c) => (
              <div key={c.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Link to={`/profile/${c.author.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <Avatar url={c.author.avatar_url} name={c.author.display_name} size={22} color={nameColor(c.author)} />
                    <span style={{ color: nameColor(c.author), fontWeight: 700, fontSize: 14 }}>{c.author.display_name}</span>
                  </Link>
                  <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    {formatDateTime(c.created_at, profile.timezone)}
                  </span>
                </div>

                {editingId === c.id ? (
                  <div style={{ margin: '4px 0 6px' }}>
                    <textarea
                      rows={2}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--panel-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text)',
                        padding: '8px 10px',
                        fontFamily: 'inherit',
                        fontSize: 14,
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button type="button" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => saveEdit(c.id)}>
                        Save
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6 }}>{c.body}</p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <ReactionBar commentId={c.id} />
                  {c.user_id === profile.id && editingId !== c.id && (
                    <>
                      <button type="button" style={ACTION_BTN_STYLE} onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button type="button" style={ACTION_BTN_STYLE} onClick={() => handleDelete(c.id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: comments?.length ? 20 : 0,
            borderTop: comments?.length ? '1px solid var(--border)' : 'none',
            paddingTop: comments?.length ? 16 : 0,
          }}
        >
          <div className="field" style={{ marginBottom: 10 }}>
            <textarea rows={3} placeholder="Add a comment…" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={posting || !body.trim()}>
            {posting ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      </div>
    </div>
  )
}
