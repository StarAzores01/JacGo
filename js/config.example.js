/* config.example.js — template for js/config.js (gitignored).
 *
 * Copy this file to js/config.js and fill in your Supabase project's real
 * values: Supabase dashboard -> Project Settings -> API.
 *
 *   cp js/config.example.js js/config.js
 *
 * SUPABASE_ANON_KEY is safe to expose in client-side code — it's a public
 * key by design, meant to be used from the browser. Row Level Security
 * (see supabase/migrations/0001_init.sql) is what actually protects data,
 * not keeping this key secret. Never put the service_role key here.
 */

const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";
