# The Freedom Elite — Trading Journal App

Build spec. Hand this to Claude Code as the starting brief.

---

## What this is

A shared trading journal for The Freedom Elite mentorship programme. Students log every trade, tag whether they followed their plan, record how they felt, and attach a screenshot. Mentors (Jordan and Anton) review everything. Students can see each other's journals and stats.

The point is **not** to be another Tradezella. The point is that this journal knows the TFE curriculum — it tracks plan adherence and roadmap stage, which a generic journal can't.

---

## Scale and access

- **Under 10 users**, mostly students plus 2 mentors
- **Free for members** — no payments, no billing, no subscription logic anywhere
- Accounts are **created manually by a mentor**. No public sign-up page.
- When someone leaves the programme, a mentor sets their account inactive
- **Do not build a Whop integration.** TFE is moving off Whop; don't couple to it.

---

## Roles

**Student**
- Full CRUD on their own trades and daily reviews
- Read-only view of other students' trades, reviews, and stats
- Sees the scoreboard

**Mentor** (Jordan, Anton)
- Everything a student can do
- Create, deactivate, and edit user accounts
- Leave feedback comments on any student's trade
- Filter/search across all students

---

## Tiers

`tier` is cosmetic status — it drives name colour, badge, and scoreboard grouping. It does **not** control permissions (that's `role`) or access (that's `active`).

| tier | who | colour | badge |
|---|---|---|---|
| `lead_mentor` | Anton | `--gold` `#f3b62f` | ★ LEAD MENTOR |
| `mentor` | Jordan | `--bronze` `#c08a3e` | MENTOR |
| `vip` | current paying students | `--bronze` `#c08a3e` | VIP |
| `alumni` | former students, no longer paying | `--silver` `#9ca3af` | ALUMNI |

Rules:
- Display name is rendered in the tier colour everywhere it appears — scoreboard, feed, trade detail, comments
- Gold is reserved for Anton alone. Don't use it for any other user, or it stops meaning anything.
- Mentors sit **above** the ranked list on the scoreboard in their own row, not ranked against students. They're there as a reference, not competing.
- `alumni` keep read access to the feed and scoreboard and keep their own history, but are excluded from the active scoreboard ranking. Show them in a collapsed "Alumni" section below the main table.
- Moving someone `vip` → `alumni` is a mentor action in admin. Do not delete their data.

Gold → bronze → silver reads as a clear hierarchy at a glance, which is the point. Jordan and VIP students share bronze; they're separated by the badge text and by mentors sitting outside the ranked list, not by colour. Full values in the design system below.

---

## Data model

### users
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| email | text | unique, login |
| display_name | text | shown on scoreboard |
| role | enum | `student` \| `mentor` |
| tier | enum | `lead_mentor` \| `mentor` \| `vip` \| `alumni` — see Tiers below |
| roadmap_stage | enum | `foundations` \| `strategy` \| `prop_setup` \| `evaluation` \| `funded` |
| active | boolean | false = revoked access |
| created_at | timestamp | |

`roadmap_stage` maps to the 12-week roadmap on the marketing site. Useful context when mentors review — a foundations student and a funded student should not be judged the same way.

### trades
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| instrument | text | default `NQ` |
| direction | enum | `long` \| `short` |
| entry_datetime | timestamptz | |
| exit_datetime | timestamptz | |
| entry_price | numeric | |
| exit_price | numeric | |
| stop_loss | numeric | |
| take_profit | numeric | nullable |
| size | integer | contracts |
| pnl | numeric | currency |
| r_multiple | numeric | calculated, see below |
| account_type | enum | `sim` \| `evaluation` \| `funded` |
| setup_tag | text | TFE strategy setup name |
| followed_plan | boolean | **required** |
| mistake_tag | enum | `none` \| `moved_stop` \| `early_exit` \| `revenge_trade` \| `oversized` \| `no_setup` \| `chased_entry` |
| emotion_before | enum | see emotions below |
| emotion_during | enum | |
| emotion_after | enum | |
| emotion_notes | text | free text, optional |
| screenshot_url | text | **required** — chart screenshot |
| notes | text | |
| created_at | timestamp | |

**r_multiple calculation:** `pnl / abs(entry_price - stop_loss) * size * point_value`. NQ point value is $20 per point (micro NQ is $2). Store `point_value` per instrument in a lookup rather than hardcoding, so ES/MES can be added later.

**Emotions enum:** `calm`, `confident`, `focused`, `impatient`, `anxious`, `fearful`, `greedy`, `frustrated`, `revengeful`, `bored`, `overconfident`, `numb`

Three capture points (before / during / after) matter more than one — the gap between "confident before" and "anxious during" is exactly the pattern a mentor wants to spot.

### daily_reviews
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| date | date | unique per user per date |
| overall_emotion | enum | same emotion list |
| what_went_well | text | |
| what_to_fix | text | |
| homework_done | boolean | ties to the roadmap's weekly homework |
| notes | text | |

### mentor_comments
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| trade_id | uuid | FK → trades, nullable |
| daily_review_id | uuid | FK → daily_reviews, nullable |
| mentor_id | uuid | FK → users |
| body | text | |
| created_at | timestamp | |

One of `trade_id` / `daily_review_id` must be set.

---

## Screens

### 1. Login
Email + password. No public sign-up link.

### 2. My Journal (default landing)
- Calendar heatmap of the month — green/red per day by net P&L
- List of recent trades, newest first
- Big "Log a trade" button

### 3. Log a Trade (form)
All fields above. Screenshot upload is required — do not allow submit without it. Make `followed_plan` a prominent toggle, not a buried checkbox.

### 4. Trade Detail
Full trade, screenshot at readable size, mentor comment thread underneath.

### 5. My Stats
- Equity curve (cumulative P&L over time)
- Win rate, average R, expectancy, profit factor
- **Plan adherence %** — headline metric, shown first, bigger than P&L
- Performance broken down by `setup_tag`
- Performance broken down by `mistake_tag`
- Emotion frequency chart, and win rate grouped by `emotion_before`

### 6. Everyone (shared feed)
Chronological feed of all students' trades. Filter by student, setup, date range, account type.

### 7. Scoreboard
Ranked table. **Default sort: plan adherence %, not P&L.** Include a P&L sort option but don't make it the landing state.

Columns: student (name in tier colour + badge), plan adherence %, trades logged, win rate, avg R, current streak of plan-followed trades, roadmap stage.

Also show a "consistency" metric: days journaled in the last 30.

Layout order:
1. Mentors row(s) — unranked, at the top, visually separated
2. Ranked VIP students
3. Collapsed "Alumni" section

Add a **Rule Adherence** column (see Rules page) — % of trades with zero rule breaches.

### 8. The Rules (static reference page)

Linked prominently in the nav. Renders the eight non-negotiable rules verbatim (content below). Styled like the mentorship roadmap PDF — gold numbers, uppercase bold titles, muted body text.

Also show, at the top, the reader's own **rule adherence over the last 30 days** so the page isn't purely passive.

#### THE NON-NEGOTIABLE TRADING RULES

> These rules are not guidelines. They are the foundation of everything. Breaking them is the reason most traders fail. You will follow these without exception.

**01 — MAXIMUM 2 TRADES PER DAY**
Quality over quantity. Two well executed A+ setups will always outperform ten mediocre trades. Once you have taken 2 trades the platform closes regardless of outcome.

**02 — 1% RISK PER TRADE, MAXIMUM**
No single trade should ever risk more than 1% of your account. This protects you from the catastrophic losses that end trading careers. Non-negotiable on every account.

**03 — NO TRADING FRIDAYS**
Fridays trade back into the weekly range. Institutional players close positions before the weekend. The probability of clean setups drops significantly. This rule exists because of painful experience.

**04 — NO TRADING NO-NEWS MONDAYS**
The beginning of the week is often manipulation before the real move develops. Low volume, uncertain direction. Sit on your hands and let the week establish itself.

**05 — NO TRADING NFP WEEKS OR BANK HOLIDAYS**
High impact news events create unpredictable volatility that no system can reliably navigate. These are not trading days. They are observation days.

**06 — PLATFORM CLOSES AFTER THE SESSION**
Once your trading session is complete the platform closes. No watching the charts, no second guessing, no revenge trading. The session is over when you say it is over.

**07 — A+ SETUPS ONLY**
Direction, Stage and Entry must all be confirmed before entering any trade. If any one of the three is unclear there is no trade. Not a maybe trade. No trade.

**08 — THE SELF CHECK QUESTION**
Before opening the charts every single session ask yourself: am I opening the charts to trade or am I opening them to feel something? If the answer is the second one — close the laptop.

---

## Automatic rule checking

Several of these rules are checkable directly from trade data. This is the single highest-value thing this app can do that a generic journal cannot — build it.

Add a `rule_breaches` field to `trades` (array of rule numbers, computed on save):

| rule | how to check | notes |
|---|---|---|
| 01 — max 2 trades/day | count trades sharing `entry_datetime::date` for that user | flag the 3rd onward |
| 02 — 1% risk max | `abs(entry_price - stop_loss) × size × point_value` vs account size | needs `account_size` on `users`, add it |
| 03 — no Fridays | `EXTRACT(DOW FROM entry_datetime) = 5` | account for the user's timezone, not UTC |
| 04 — no-news Mondays | Monday **and** no high-impact news that day | needs an economic calendar source; if none, prompt the user to self-declare |
| 05 — NFP weeks / bank holidays | NFP is first Friday of the month; bank holidays need a lookup table | mentor-maintained blackout dates table is the simplest v1 |
| 06 — platform closes after session | not checkable from trade data | self-reported |
| 07 — A+ setups only | not checkable | self-reported via `followed_plan` |
| 08 — self check question | not checkable | surface it as a prompt on the log-trade form |

**Important:** rules 04 and 05 depend on external data (news calendar, holiday dates) that this spec does not supply. For v1, add a mentor-editable `blackout_dates` table and have mentors mark non-trading days in advance. Don't silently guess and flag a trade as a breach when the app doesn't actually know whether there was news that day — a false accusation on a student's record is worse than no check.

Surface breaches as a **quiet amber flag on the trade**, not a red error. The mentor comment thread is where it gets discussed. The app's job is to surface, not scold.

Add `rule_adherence_30d` to the scoreboard as its own column, separate from `followed_plan` — they measure different things. A trade can follow the written plan and still breach a rule.

### 9. Mentor Admin (mentor role only)
- Create user (email, name, tier, roadmap stage) — generates an invite
- Deactivate user
- Change a user's tier (e.g. `vip` → `alumni` when they stop paying)
- Update a student's roadmap stage
- Manage `blackout_dates` (NFP weeks, bank holidays, no-news Mondays)
- Overview table: who has logged trades this week, who hasn't, who has open rule breaches

---

## Design system

The journal must look like it belongs to `thefreedomelitetrading.com`. Same palette, same type treatment, same button shapes. A student moving from the site to the journal should not feel a seam.

### Palette

```css
/* surfaces */
--bg:        #0d0f13;   /* page background, near-black */
--panel:     #16181e;   /* cards, form fields, nav bar */
--panel-2:   #1b1e25;   /* hover state on panels */
--border:    #262a33;   /* hairline dividers, input borders */

/* type */
--text:      #f5f5f2;   /* body copy, nav links */
--muted:     #8d919b;   /* secondary copy, labels, timestamps */

/* brand */
--gold:      #f3b62f;   /* headlines, primary buttons, key figures, Anton */
--gold-dim:  rgba(243,182,47,.14);  /* tinted fills behind gold elements */

/* data */
--green:     #35c56a;   /* wins, positive P&L, live dot */
--red:       #e2493c;   /* losses, negative P&L */
--amber:     #d99a2b;   /* rule-breach flags — distinct from both gold and red */

/* tiers */
--bronze:    #c08a3e;   /* Jordan (mentor) + VIP students */
--silver:    #9ca3af;   /* alumni */
```

**Headlines are gold, not white.** This is the single most recognisable thing about the brand — every major heading on the marketing site is gold on near-black. Carry that through: page titles, section headings, and the big stat numbers are `--gold`. Body copy is `--text`, secondary copy is `--muted`.

Gold stays reserved for Anton on the tier system specifically — elsewhere it's the general brand accent. Context makes it unambiguous (a heading isn't a name badge).

### Typography

| use | treatment |
|---|---|
| Page + section headings | bold condensed, UPPERCASE, gold, tight leading (~1.05), letter-spacing `.01em` |
| Sub-headings | same family, sentence case, `--text` |
| Body | system sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`), 15–16px, line-height 1.5–1.65 |
| Labels / eyebrows | monospace, 11–12px, UPPERCASE, letter-spacing `.14em`, gold |
| All numbers (P&L, R, %, prices, times) | monospace — never body sans |

Headline font: Archivo Black, or the closest match to the marketing site's condensed grotesque. Confirm the exact font from the deployed CSS before committing.

Numbers in monospace matters more than it sounds — a column of P&L figures in a proportional font won't align, and this app is mostly columns of figures.

### Components

**Buttons**
- Primary: `--gold` fill, `#16181e` text, weight 700, fully rounded (`border-radius: 999px`), padding ~14px 26px
- Secondary: `--panel` fill, `--text` label, 1px `--border`, same pill shape; border goes `--gold` on hover
- Lift 1px on hover (`transform: translateY(-1px)`), 150ms ease

**Eyebrow pill** (as on the site's hero)
Small monospace uppercase gold text in a rounded `--panel` pill with a `--border` outline and a 6px status dot. Reuse for section labels and live/status indicators.

**Cards** (trades, stats, review entries)
`--panel` background, 1px `--border`, `border-radius: 10px`, padding 28–34px. On the trade card, add a 3px left edge bar: `--green` for a win, `--red` for a loss, `--amber` if any rule was breached.

**Tables** (scoreboard, trade log)
Header row in monospace uppercase `--muted`. Hairline `--border` between rows, none around the outside. Row hover `--panel-2`. Numeric columns right-aligned.

**Forms**
`--panel` fields, 1px `--border`, gold border on focus. Labels above fields in `--muted`. Never place text inputs on raw `--bg`.

**Focus states**
`outline: 2px solid var(--gold); outline-offset: 3px` on every interactive element. Don't remove it — keyboard users need it and it's on-brand.

### Rules

- Dark theme only. No light mode.
- Green and red mean P&L and nothing else. Don't use them for tier, status, or decoration.
- Amber means rule breach and nothing else.
- Motion: 150–200ms ease on hover, ~480ms on slide/panel transitions. Respect `prefers-reduced-motion`.
- Mobile-first — students will log trades on a phone right after the session. Every screen must work at 375px wide.

Pull the live CSS from `thefreedomelitetrading.com` and copy the exact custom property values rather than re-typing these approximations.

---

## Tech

- **Frontend:** React + Vite
- **Backend + DB + auth + file storage:** Supabase (free tier covers this scale)
- **Hosting:** Netlify, as a separate site from the marketing page
- **Domain:** `journal.thefreedomelitetrading.com`
- **PWA:** manifest + service worker so students can "Add to Home Screen" and it behaves like an app. No native iOS/Android build, no App Store.

### Security requirements

- Enable Supabase **Row Level Security** on every table
- Students may only INSERT/UPDATE/DELETE rows where `user_id = auth.uid()`
- Students may SELECT all trades and reviews (shared journal is intentional)
- Only `role = 'mentor'` may write to `mentor_comments` or modify `users`
- Inactive users (`active = false`) must be blocked at the policy level, not just hidden in the UI
- Screenshots go in a Supabase storage bucket with authenticated-read access only — never public URLs

---

## Build order

1. Supabase project, schema (incl. `tier`, `account_size`, `blackout_dates`), RLS policies
2. Auth + login screen + manual user creation
3. Log a trade (with screenshot upload)
4. My Journal + calendar
5. The Rules page (static content — quick win, do it early so students have it from day one)
6. My Stats
7. Automatic rule checking (rules 01, 02, 03 first — they need no external data)
8. Everyone feed
9. Scoreboard with tier colours and grouping
10. Mentor comments
11. Mentor admin (incl. tier changes and blackout dates)
12. PWA manifest + service worker
13. Deploy to Netlify, point subdomain

Ship 1–6 first and get real trades in it before building the social layer.

---

## Notes for later

- CSV import from Topstep/prop dashboards would remove most manual entry friction — worth adding once the core works
- Weekly email digest to mentors: who journaled, who didn't
- If the group grows past ~25, revisit whether a fully public feed still works
