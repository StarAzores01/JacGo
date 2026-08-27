-- Seed the public reference tables with the same content js/data.js's
-- mock DB object used to hardcode, so fares.html / accommodation.html /
-- terminals.html / rewards.html have something real to read once they're
-- wired to Supabase. Each INSERT is guarded to run only if its table is
-- currently empty, so re-running this migration is harmless.

insert into public.fares (route, klass, duration, price)
select * from (values
  ('Pasay – Lucena',                    'Ordinary', '2h 45m', 320),
  ('Pasay – Lucena',                    'Deluxe',   '2h 30m', 450),
  ('Cubao – Calamba',                   'Ordinary', '1h 30m', 180),
  ('Cubao – Santa Cruz, Laguna',        'Deluxe',   '2h 10m', 260),
  ('Pasay – Batangas City',             'Deluxe',   '2h 20m', 380),
  ('Lucena – Marinduque (bus+ferry)',   'Combo',    '4h 15m', 610)
) as v(route, klass, duration, price)
where not exists (select 1 from public.fares);

insert into public.accommodation (name, location, price, rating, source, source_url)
select * from (values
  ('Terrazza Inn Lucena',   '5 min from Grand Central Terminal', 1800::numeric, 4.4::numeric, null, null),
  ('Batangas Bay Hotel',    'Near Batangas Port',                2300::numeric, 4.2::numeric, null, null),
  ('Calamba Garden Suites', '10 min from terminal',              1450::numeric, 4.0::numeric, null, null),
  ('RAYLux Hotel',          'Lucena, Quezon',                    null::numeric, null::numeric, 'osm', 'https://www.openstreetmap.org/node/13960806877'),
  ('Hotel Oliva 88',        'Calamba, Laguna',                   null::numeric, null::numeric, 'osm', 'https://www.openstreetmap.org/node/4778056921')
) as v(name, location, price, rating, source, source_url)
where not exists (select 1 from public.accommodation);

insert into public.terminals (name, address, tags)
select * from (values
  ('Pasay (Buendia) Terminal',      'Sen. Gil J. Puyat Ave. cor. Donada St., Pasay', array['Ticketing','Padala','WiFi']),
  ('Cubao Terminal',                'Aurora Blvd., Cubao, Quezon City',              array['Ticketing','WiFi']),
  ('Calamba Terminal',              'Brgy. 1, Crossing, Calamba City, Laguna',       array['Ticketing','Padala']),
  ('Lucena Grand Central Terminal', 'Lucena City, Quezon',                           array['Ticketing','Padala','Ferry transfer'])
) as v(name, address, tags)
where not exists (select 1 from public.terminals);

insert into public.rewards (title, cost, description)
select * from (values
  ('Free Seat Upgrade',      1200, 'Ordinary → Deluxe on any route'),
  ('₱150 Fare Voucher',      900,  'Valid on any Southern Luzon route'),
  ('Priority Boarding Pass', 600,  'Skip the queue for 1 trip'),
  ('Free Padala Pickup',     400,  'One free cargo pickup, up to 5kg')
) as v(title, cost, description)
where not exists (select 1 from public.rewards);
