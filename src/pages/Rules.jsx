import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { RULES, RULES_INTRO } from '../lib/rules'

export default function Rules() {
  const { profile } = useAuth()
  const [adherence, setAdherence] = useState(undefined) // undefined = loading, null = no trades

  useEffect(() => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

    supabase
      .from('trades')
      .select('rule_breaches')
      .eq('user_id', profile.id)
      .gte('entry_datetime', since)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setAdherence(null)
          return
        }
        const clean = data.filter((t) => (t.rule_breaches || []).length === 0).length
        setAdherence({ pct: Math.round((clean / data.length) * 100), total: data.length })
      })
  }, [profile.id])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>
      <div className="panel" style={{ textAlign: 'center', marginBottom: 32 }}>
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
          Your rule adherence — last 30 days
        </p>
        {adherence === undefined ? (
          <p style={{ color: 'var(--muted)', margin: '12px 0 0' }}>Loading…</p>
        ) : adherence === null ? (
          <p style={{ color: 'var(--muted)', margin: '12px 0 0' }}>No trades logged in the last 30 days.</p>
        ) : (
          <>
            <p style={{ color: 'var(--gold)', fontFamily: 'var(--font-mono)', fontSize: 48, fontWeight: 700, margin: '8px 0 0' }}>
              {adherence.pct}%
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              breach-free across {adherence.total} trade{adherence.total === 1 ? '' : 's'}
            </p>
          </>
        )}
      </div>

      <h1>The Non-Negotiable Trading Rules</h1>
      <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 32 }}>{RULES_INTRO}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {RULES.map((rule) => (
          <div key={rule.number} className="panel" style={{ display: 'flex', gap: 20 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: 28,
                color: 'var(--gold)',
                flexShrink: 0,
                lineHeight: 1,
              }}
            >
              {rule.number}
            </div>
            <div>
              <h3
                style={{
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '.02em',
                  margin: '0 0 8px',
                }}
              >
                {rule.title}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{rule.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
