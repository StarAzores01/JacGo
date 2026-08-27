-- redeem_reward(reward_id) — atomically deduct a reward's cost from the
-- caller's points balance. Called via supabase.rpc('redeem_reward', {...})
-- from rewards.html instead of a client-side read-points/check/write-points
-- sequence, which would race under concurrent redeems (two tabs, a double
-- click) and could let a user's points go negative.
--
-- SECURITY DEFINER: profiles.points has no client UPDATE grant at all (see
-- 0001_init.sql's column-level lockdown) — this function runs as its
-- owner (postgres), so it can update points despite that, while everything
-- a normal authenticated client could reach stays exactly as restricted.
--
-- Atomicity: the UPDATE's WHERE clause re-checks points >= cost as part of
-- the same row-locking write, so two concurrent redeems for the same user
-- serialize on the row — the second one sees the first's deducted balance
-- and correctly fails if it's no longer enough, instead of both succeeding
-- against a stale read.

create or replace function public.redeem_reward(reward_id uuid)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_cost    integer;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select cost into v_cost from public.rewards where id = reward_id;
  if v_cost is null then
    raise exception 'Reward not found';
  end if;

  update public.profiles
    set points = points - v_cost
    where id = v_uid and points >= v_cost
    returning * into v_profile;

  if v_profile is null then
    raise exception 'Not enough points to redeem this reward';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.redeem_reward(uuid) to authenticated;
