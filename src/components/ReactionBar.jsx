import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Fixed set — no picker, no custom emoji (see 0009). One reaction per user
// per target: tapping a different emoji switches it, tapping the current
// one removes it.
const EMOJIS = ['🔥', '❤️', '😳', '😭', '😡']

// Reacts to a trade or a comment — exactly one of tradeId/commentId is
// passed, matching the trade_reactions table's target-check constraint.
export default function ReactionBar({ tradeId, commentId }) {
  const { profile } = useAuth()
  const column = tradeId ? 'trade_id' : 'comment_id'
  const targetId = tradeId ?? commentId

  const [rows, setRows] = useState([]) // [{ id, user_id, emoji }]
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('trade_reactions')
      .select('id, user_id, emoji')
      .eq(column, targetId)
      .then(({ data, error }) => {
        if (!cancelled && !error) setRows(data || [])
      })
    return () => {
      cancelled = true
    }
  }, [column, targetId])

  const mine = rows.find((r) => r.user_id === profile.id)

  async function handleClick(emoji) {
    if (busy) return
    setBusy(true)

    if (mine && mine.emoji === emoji) {
      const { error } = await supabase.from('trade_reactions').delete().eq('id', mine.id)
      if (!error) setRows((prev) => prev.filter((r) => r.id !== mine.id))
    } else if (mine) {
      const { error } = await supabase.from('trade_reactions').update({ emoji }).eq('id', mine.id)
      if (!error) setRows((prev) => prev.map((r) => (r.id === mine.id ? { ...r, emoji } : r)))
    } else {
      const { data, error } = await supabase
        .from('trade_reactions')
        .insert({ [column]: targetId, user_id: profile.id, emoji })
        .select('id')
        .single()
      if (!error) setRows((prev) => [...prev, { id: data.id, user_id: profile.id, emoji }])
    }
    setBusy(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {EMOJIS.map((emoji) => {
        const count = rows.filter((r) => r.emoji === emoji).length
        const active = mine?.emoji === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleClick(emoji)}
            disabled={busy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: active ? 'var(--gold-dim)' : 'var(--panel-2)',
              border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 14,
              lineHeight: 1.4,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            <span>{emoji}</span>
            {count > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
