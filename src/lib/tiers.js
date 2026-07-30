export const TIER_LABEL = {
  lead_mentor: '★ LEAD MENTOR',
  mentor: 'MENTOR',
  vip: 'VIP',
  alumni: 'ALUMNI',
}

export const TIER_COLOR = {
  lead_mentor: 'var(--gold)',
  mentor: 'var(--bronze)',
  vip: 'var(--bronze)',
  alumni: 'var(--silver)',
}

export const ROADMAP_STAGE_COLOR = {
  demo: 'var(--stage-demo)',
  evaluation: 'var(--stage-evaluation)',
  funded: 'var(--gold)',
}

// The colour a person's name renders in. Mentors keep their tier colour
// (gold for lead mentor, bronze for mentor) and alumni keep silver — both
// are status signals, not roadmap progress — active students render by
// roadmap_stage instead (gold/blue/purple for funded/evaluation/demo).
export function nameColor(person) {
  if (person.role === 'mentor' || person.tier === 'alumni') return TIER_COLOR[person.tier]
  return ROADMAP_STAGE_COLOR[person.roadmap_stage] || TIER_COLOR[person.tier]
}
