export const DIRECTIONS = ['long', 'short']

export const ROADMAP_STAGES = ['foundations', 'strategy', 'prop_setup', 'evaluation', 'funded']

export const STUDENT_TIERS = ['vip', 'alumni']

export const ACCOUNT_TYPES = ['sim', 'evaluation', 'funded']

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
