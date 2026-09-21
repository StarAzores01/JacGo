-- AI assistant rate limiting: at most 15 requests per user per rolling hour.
-- The jac-assistant Edge Function calls consume_ai_request() (as the signed-in
-- user) before it contacts the AI provider. The user is always auth.uid(),
-- never a caller-supplied id. To change the limit, edit the constants below.

create table if not exists public.ai_requests (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_requests_user_time_idx on public.ai_requests (user_id, created_at);
create index if not exists ai_requests_time_idx on public.ai_requests (created_at);

-- RLS on with no policies, and no direct grants: clients can't read or write
-- this table at all. Only the SECURITY DEFINER function below touches it.
alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from anon, authenticated;

-- Returns true and records the request if the caller is under the limit;
-- returns false (recording nothing) if not.
create or replace function public.consume_ai_request()
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  c_limit  constant integer  := 15;
  c_window constant interval := interval '1 hour';
  v_uid    uuid := auth.uid();
  v_count  integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Serialize this user's concurrent requests so parallel calls can't all
  -- pass the count check before any of them is recorded.
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  -- Cleanup: drop everyone's records older than a day (far past the window).
  delete from public.ai_requests where created_at < now() - interval '1 day';

  select count(*) into v_count
    from public.ai_requests
    where user_id = v_uid and created_at > now() - c_window;

  if v_count >= c_limit then
    return false;
  end if;

  insert into public.ai_requests (user_id) values (v_uid);
  return true;
end;
$$;

revoke execute on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
