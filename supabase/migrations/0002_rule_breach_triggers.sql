-- TFE Journal — 0002_rule_breach_triggers.sql
-- Build order step 7 (first pass): automatic rule checking for rules that
-- need no external data — 01 (max 2 trades/day), 02 (1% risk max),
-- 03 (no Fridays). Rules 04/05 need mentor-maintained blackout_dates and
-- come later; 06/07/08 are self-reported and never computed here.
--
-- Computed server-side via a BEFORE INSERT/UPDATE trigger rather than in the
-- client, because rule 01 needs to see this user's other trades that day —
-- a cross-row check that's naturally a DB-side concern, and because this way
-- it's correct regardless of what inserts the row (this app today, CSV
-- import later, anything else).

create or replace function public.compute_trade_rule_breaches()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timezone            text;
  v_account_size        numeric;
  v_point_value         numeric;
  v_probe               timestamp;
  v_earlier_same_day    int;
  v_risk_dollars        numeric;
  v_dow                 int;
  breaches              int[] := '{}';
begin
  select timezone, account_size into v_timezone, v_account_size
  from public.users
  where id = NEW.user_id;

  v_timezone := coalesce(v_timezone, 'UTC');

  -- Fall back to UTC if the stored timezone name is invalid, so a bad
  -- value degrades the day-bucket/Friday check instead of blocking the save.
  begin
    select NEW.entry_datetime at time zone v_timezone into v_probe;
  exception when others then
    v_timezone := 'UTC';
  end;

  -- Rule 01 — max 2 trades/day. Flags the 3rd-onward trade of the user's
  -- local day, ranked by entry_datetime (ties broken by id).
  select count(*) into v_earlier_same_day
  from public.trades t
  where t.user_id = NEW.user_id
    and t.id <> NEW.id
    and (t.entry_datetime at time zone v_timezone)::date = (NEW.entry_datetime at time zone v_timezone)::date
    and (t.entry_datetime, t.id) < (NEW.entry_datetime, NEW.id);

  if v_earlier_same_day >= 2 then
    breaches := array_append(breaches, 1);
  end if;

  -- Rule 02 — 1% risk max. Skipped (not flagged either way) if the user has
  -- no account_size on file yet — we don't guess at a number we don't know.
  if v_account_size is not null and v_account_size > 0 then
    select point_value into v_point_value
    from public.instrument_point_values
    where instrument = NEW.instrument;

    if v_point_value is not null then
      v_risk_dollars := abs(NEW.entry_price - NEW.stop_loss) * NEW.size * v_point_value;
      if v_risk_dollars > v_account_size * 0.01 then
        breaches := array_append(breaches, 2);
      end if;
    end if;
  end if;

  -- Rule 03 — no Fridays, in the user's own timezone, not UTC.
  v_dow := extract(dow from (NEW.entry_datetime at time zone v_timezone));
  if v_dow = 5 then
    breaches := array_append(breaches, 3);
  end if;

  NEW.rule_breaches := breaches;
  return NEW;
end;
$$;

create trigger trades_compute_rule_breaches
  before insert or update of entry_datetime, entry_price, stop_loss, size, instrument, user_id
  on public.trades
  for each row
  execute function public.compute_trade_rule_breaches();

-- One-time backfill: recompute rule_breaches for any trades logged before
-- this trigger existed. Safe to run any time — it's a no-op SET (value
-- unchanged) that exists purely to make the column's own trigger fire.
update public.trades set entry_datetime = entry_datetime;
