export const DIRECTIONS = ['long', 'short']

export const ROADMAP_STAGES = ['foundations', 'strategy', 'prop_setup', 'evaluation', 'funded']

export const STUDENT_TIERS = ['vip', 'alumni']

export const ACCOUNT_TYPES = ['sim', 'evaluation', 'funded']

// Display-only relabel: 'sim' is the real stored/query value (Postgres
// enum trade_account_type, and a live Everyone-feed filter value) — only
// what's shown to the user changes, same approach as the instrument rename.
export const ACCOUNT_TYPE_LABELS = { sim: 'Demo', evaluation: 'Evaluation', funded: 'Funded' }

export const MISTAKE_TAGS = ['none', 'moved_stop', 'early_exit', 'revenge_trade', 'oversized', 'no_setup', 'chased_entry']

export const EMOTIONS = [
  'calm',
  'confident',
  'focused',
  'impatient',
  'anxious',
  'fearful',
  'greedy',
  'frustrated',
  'revengeful',
  'bored',
  'overconfident',
  'numb',
]

export function labelize(value) {
  return value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
