-- TFE Journal — 0005_collapse_roadmap_stage.sql
-- Collapses roadmap_stage from five values (foundations, strategy,
-- prop_setup, evaluation, funded) down to three (demo, evaluation, funded).
--
-- Live data confirmed before writing this: 2 users on foundations, 3 on
-- evaluation, 0 on strategy/prop_setup/funded.
--   foundations -> demo        (explicit)
--   evaluation  -> evaluation  (explicit, unchanged)
-- strategy/prop_setup have zero rows right now, but the type swap still
-- needs a mapping defined for them. Inferred (not explicitly specified,
-- since nothing is actually on these values): strategy -> demo (still
-- pre-funded-account), prop_setup -> evaluation (already setting up a
-- funded-account attempt, i.e. mid-evaluation).

alter table public.users alter column roadmap_stage drop default;

create type roadmap_stage_new as enum ('demo', 'evaluation', 'funded');

alter table public.users
  alter column roadmap_stage type roadmap_stage_new
  using (
    case roadmap_stage::text
      when 'foundations' then 'demo'
      when 'strategy'    then 'demo'
      when 'prop_setup'  then 'evaluation'
      when 'evaluation'  then 'evaluation'
      when 'funded'      then 'funded'
    end
  )::roadmap_stage_new;

drop type roadmap_stage;
alter type roadmap_stage_new rename to roadmap_stage;

alter table public.users alter column roadmap_stage set default 'demo';

-- Sanity check — should show only demo/evaluation/funded now.
select roadmap_stage, count(*) from public.users group by roadmap_stage order by 1;
