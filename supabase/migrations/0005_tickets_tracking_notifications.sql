-- 0005 — notifications read state, Padala shipment lifecycle + tracking
-- timeline, and protection of ticket references. Additive: no tables are
-- dropped or recreated and no existing rows are deleted.

-- ============================================================================
-- 1. notifications: read/unread
-- ============================================================================
-- Users may set read_at on their own rows and nothing else (they still can't
-- edit body/type/user_id). NULL read_at = unread.

alter table public.notifications add column if not exists read_at timestamptz;

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- ============================================================================
-- 2. trips: the ticket reference (code) must stay stable
-- ============================================================================
-- The app only ever updates date/time (reschedule) and status (cancel) on an
-- existing trip. Restrict UPDATE to those columns so a booking's reference,
-- fare, route etc. can't be rewritten after the fact.

revoke update on public.trips from authenticated;
grant update (date, time, status) on public.trips to authenticated;

-- ============================================================================
-- 3. padala_history: shipment lifecycle
-- ============================================================================
-- Old statuses ('In transit', 'Delivered', 'Cancelled') stay valid.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.padala_history'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.padala_history drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.padala_history
  add constraint padala_history_status_check check (status in (
    'Booked', 'Accepted at origin', 'Processing', 'In transit',
    'Arrived at destination', 'Ready for pickup', 'Delivered', 'Cancelled'
  ));

alter table public.padala_history alter column status set default 'Booked';

-- Customers may only create a shipment in its initial state; every later
-- status change is made by staff (service role / SQL), never self-declared.
drop policy if exists "Users can create their own padala bookings" on public.padala_history;
create policy "Users can create their own padala bookings"
  on public.padala_history for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'Booked');

-- ============================================================================
-- 4. padala_tracking_events: chronological timeline per shipment
-- ============================================================================

create table public.padala_tracking_events (
  id            uuid primary key default gen_random_uuid(),
  padala_id     uuid not null references public.padala_history (id) on delete cascade,
  status        text not null,
  location_text text,
  description   text,
  created_at    timestamptz not null default now()
);

comment on table public.padala_tracking_events is
  'Status history of a Padala shipment. Written by the trigger below (and by staff); read-only for customers.';

create index padala_tracking_events_padala_idx
  on public.padala_tracking_events (padala_id, created_at);

alter table public.padala_tracking_events enable row level security;

create policy "Users can view events of their own shipments"
  on public.padala_tracking_events for select
  to authenticated
  using (exists (
    select 1 from public.padala_history p
    where p.id = padala_id and p.user_id = auth.uid()
  ));

revoke all on public.padala_tracking_events from anon, authenticated;
grant select on public.padala_tracking_events to authenticated;

-- Record an event automatically when a shipment is booked and whenever its
-- status changes. Location comes from the shipment's own origin/destination.
create or replace function public.log_padala_event()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.padala_tracking_events (padala_id, status, location_text, description)
    values (new.id, new.status, new.origin, 'Shipment booked');
  elsif new.status is distinct from old.status then
    insert into public.padala_tracking_events (padala_id, status, location_text)
    values (
      new.id,
      new.status,
      case new.status
        when 'Accepted at origin'      then new.origin
        when 'Arrived at destination'  then new.destination
        when 'Ready for pickup'        then new.destination
        when 'Delivered'               then new.destination
        else null
      end
    );
  end if;
  return new;
end;
$$;

create trigger padala_history_log_event
  after insert or update of status on public.padala_history
  for each row execute function public.log_padala_event();

-- Backfill: every existing shipment gets its booking event, timestamped with
-- its real created_at. No later events are invented for old rows.
insert into public.padala_tracking_events (padala_id, status, location_text, description, created_at)
select p.id, 'Booked', p.origin, 'Shipment booked', p.created_at
from public.padala_history p
where not exists (select 1 from public.padala_tracking_events e where e.padala_id = p.id);
