-- JAC Go — initial schema
-- Replaces the mock `DB` object in js/data.js (and mock auth in js/auth.js)
-- with real Postgres tables + Supabase Auth + Row Level Security.
--
-- Mapping notes (every `DB.*` key in js/data.js, accounted for):
--   DB.user            -> profiles (the signed-in user's own row)
--   DB.users           -> gone. auth.js's login/signup move entirely to
--                         Supabase Auth (auth.users). Never store passwords
--                         or emails again in an app table.
--   DB.nextTrip        -> no separate table. It's just "the soonest
--                         upcoming trip" — derive it client-side in Phase 3
--                         with `select * from trips where user_id = auth.uid()
--                         and status = 'upcoming' order by date, time limit 1`.
--                         `gate` lives on trips (nullable) to support it.
--   DB.trips           -> trips
--   DB.weather         -> not persisted. It's live/derived data (a weather
--                         API call), not something that belongs in Postgres.
--                         Out of scope for this migration.
--   DB.fares           -> fares
--   DB.accommodation   -> accommodation
--   DB.terminals       -> terminals
--   DB.rewards         -> rewards
--   DB.notifications   -> notifications
--   DB.padalaHistory   -> padala_history
--   DB.activities      -> folded into pois (same shape: name, category/type,
--                         location, description, source, source_url — this
--                         is exactly what pipeline/output/pois.json produces).
--   DB.packingList     -> not persisted. It's static app copy (checklist
--                         categories/items), not user or reference data —
--                         leave it as a plain JS array in the frontend.
--
-- pois / accommodation are additionally shaped to accept
-- pipeline/output/pois.json and pipeline/output/accommodations.json
-- directly (see pipeline/README.md's "Schemas" section) — that's Phase 4.

create extension if not exists pgcrypto;

-- ============================================================================
-- profiles  — 1:1 with auth.users. No email/password here; that's Auth's job.
-- ============================================================================

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  tier       text not null default 'Bronze'
               check (tier in ('Bronze', 'Silver', 'Gold', 'Platinum')),
  points     integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user, created automatically on signup. Mirrors DB.user from js/data.js.';

-- Auto-create a profile row whenever someone signs up via Supabase Auth.
-- Phase 3's signup call should pass the display name as user metadata:
--   supabase.auth.signUp({ email, password, options: { data: { name } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at honest on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- trips  — a user's bookings. DB.trips + DB.nextTrip's extra `gate` field.
-- ============================================================================

create table public.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  origin      text not null,
  destination text not null,
  date        date not null,
  time        time not null,
  gate        text,
  seat        text not null,
  klass       text not null check (klass in ('Ordinary', 'Deluxe', 'Combo')),
  fare        numeric(10, 2) not null check (fare >= 0),
  status      text not null default 'upcoming'
                check (status in ('upcoming', 'completed', 'cancelled')),
  code        text not null unique,
  created_at  timestamptz not null default now()
);

comment on table public.trips is 'Mirrors DB.trips from js/data.js.';

create index trips_user_id_idx on public.trips (user_id);

-- ============================================================================
-- fares  — route price list. Public reference data, not user-scoped.
-- ============================================================================

create table public.fares (
  id         uuid primary key default gen_random_uuid(),
  route      text not null,
  klass      text not null check (klass in ('Ordinary', 'Deluxe', 'Combo')),
  duration   text not null,      -- kept as display text ("2h 45m"), matching js/data.js
  price      numeric(10, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

comment on table public.fares is 'Mirrors DB.fares from js/data.js.';

-- ============================================================================
-- accommodation — public reference data. Seeded by hand today (matching
-- DB.accommodation), later upserted from pipeline/output/accommodations.json.
-- ============================================================================

create table public.accommodation (
  id           uuid primary key default gen_random_uuid(),
  pipeline_id  text unique,   -- pipeline's own `id` (hash of source+source_id); null for hand-entered rows
  name         text not null,
  type         text,          -- pipeline's `type` (e.g. "Hotel")
  location     text,          -- DB.accommodation's `loc` (e.g. "5 min from Grand Central Terminal")
  price        numeric(10, 2),-- DB.accommodation's numeric price when known (mock stored it as "₱1,800/night" — parse to numeric here, format with currency in the UI)
  price_level  text,          -- pipeline's `price_level` (often null/unknown from OSM)
  rating       numeric(2, 1), -- DB.accommodation's `rating`, e.g. 4.4; null when unknown
  province     text,
  lat          double precision,
  lng          double precision,
  source       text,          -- e.g. "osm"
  source_id    text,          -- e.g. "node/13960806877"
  source_url   text,          -- DB.accommodation's `sourceUrl`
  last_updated timestamptz,   -- pipeline's `last_updated`
  created_at   timestamptz not null default now()
);

comment on table public.accommodation is
  'Mirrors DB.accommodation from js/data.js; shaped to also accept pipeline/output/accommodations.json (Phase 4).';

create index accommodation_province_idx on public.accommodation (province);

-- ============================================================================
-- pois — public reference data, from pipeline/output/pois.json. Also covers
-- DB.activities (same shape: name/category/location/description/source).
-- ============================================================================

create table public.pois (
  id            uuid primary key default gen_random_uuid(),
  pipeline_id   text unique,  -- pipeline's own `id` (hash of source+source_id); null for hand-entered rows
  name          text not null,
  category      text,         -- pipeline's `category`, or DB.activities' `type` ("Activity"/"Dining")
  location      text,         -- DB.activities' `loc`
  description   text,
  province      text,
  lat           double precision,
  lng           double precision,
  source        text,
  source_id     text,
  source_url    text,
  wikipedia_url text,         -- carries Wikipedia attribution through, per pipeline/README.md
  last_updated  timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.pois is
  'Mirrors DB.activities from js/data.js; shaped to also accept pipeline/output/pois.json (Phase 4).';

create index pois_province_idx on public.pois (province);
create index pois_category_idx on public.pois (category);

-- ============================================================================
-- terminals — public reference data.
-- ============================================================================

create table public.terminals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text not null,
  tags       text[] not null default '{}',
  lat        double precision,
  lng        double precision,
  created_at timestamptz not null default now()
);

comment on table public.terminals is 'Mirrors DB.terminals from js/data.js.';

-- ============================================================================
-- rewards — public reference data (loyalty catalog).
-- ============================================================================

create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  cost        integer not null check (cost >= 0),
  description text,
  created_at  timestamptz not null default now()
);

comment on table public.rewards is 'Mirrors DB.rewards from js/data.js.';

-- ============================================================================
-- notifications — user-scoped.
-- ============================================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('alert', 'info', 'promo')),
  body       text not null,  -- DB.notifications' `text` field, renamed to avoid a column literally named `text`
  created_at timestamptz not null default now()
  -- DB.notifications' `time` ("Just now", "2h ago") is a relative label —
  -- store the real timestamp (created_at) and format it relatively client-side.
);

comment on table public.notifications is 'Mirrors DB.notifications from js/data.js.';

create index notifications_user_id_idx on public.notifications (user_id);

-- ============================================================================
-- padala_history — user-scoped cargo shipment history.
-- ============================================================================

create table public.padala_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  code        text not null unique,
  origin      text not null,   -- DB.padalaHistory's `from`
  destination text not null,   -- DB.padalaHistory's `to`
  status      text not null default 'In transit'
                check (status in ('In transit', 'Delivered', 'Cancelled')),
  weight_kg   numeric(6, 2),   -- DB.padalaHistory's `weight` ("3.2kg") parsed to numeric
  created_at  timestamptz not null default now()
);

comment on table public.padala_history is 'Mirrors DB.padalaHistory from js/data.js.';

create index padala_history_user_id_idx on public.padala_history (user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Supabase grants anon/authenticated broad table privileges by default and
-- expects RLS to do the actual locking down — every table below gets RLS
-- enabled with no exceptions, per Supabase's own guidance.

-- ---- profiles: user reads/updates only their own row -----------------------
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert/delete policy for users: the on_auth_user_created trigger
-- (security definer) creates the row on signup, and it's cleaned up via
-- the `on delete cascade` FK when the auth.users row is deleted.

-- Column-level lockdown: users may rename themselves, but must not be able
-- to grant themselves tier/points via a direct UPDATE — those only move via
-- server-side logic (a service-role call or a future RPC), not the client.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- ---- trips: user reads/writes only their own rows ---------------------------
alter table public.trips enable row level security;

create policy "Users can view their own trips"
  on public.trips for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can book their own trips"
  on public.trips for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own trips"
  on public.trips for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can cancel/delete their own trips"
  on public.trips for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---- notifications: user reads/dismisses only their own rows ---------------
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can dismiss their own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update policy for users: notifications are system-generated
-- (service-role / a future scheduled function), not user-authored.

-- ---- padala_history: user reads/creates only their own rows ----------------
alter table public.padala_history enable row level security;

create policy "Users can view their own padala history"
  on public.padala_history for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own padala bookings"
  on public.padala_history for insert
  to authenticated
  with check (auth.uid() = user_id);

-- No update/delete policy for users: status transitions ("In transit" ->
-- "Delivered") are made by staff/service-role, not self-declared by the customer.

-- ---- public reference tables: readable by anyone, writable by no one -------
-- (Rows come from the pipeline / an admin using the service-role key, which
-- bypasses RLS entirely — no write policy needed for that path.)

alter table public.fares enable row level security;

create policy "Fares are publicly readable"
  on public.fares for select
  to anon, authenticated
  using (true);

alter table public.accommodation enable row level security;

create policy "Accommodation is publicly readable"
  on public.accommodation for select
  to anon, authenticated
  using (true);

alter table public.pois enable row level security;

create policy "POIs are publicly readable"
  on public.pois for select
  to anon, authenticated
  using (true);

alter table public.terminals enable row level security;

create policy "Terminals are publicly readable"
  on public.terminals for select
  to anon, authenticated
  using (true);

alter table public.rewards enable row level security;

create policy "Rewards are publicly readable"
  on public.rewards for select
  to anon, authenticated
  using (true);
