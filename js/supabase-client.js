/* supabase-client.js — initializes the shared Supabase client.
 *
 * Depends on (load order matters, see each HTML page's <script> tags):
 *   1. the Supabase JS UMD build (CDN)
 *   2. js/config.js (gitignored; copy js/config.example.js to create it)
 *   3. this file
 *
 * Exposes a single `supabase` client on window, reused by every page.
 */

const supabaseClient = (() => {
  if (typeof window.supabase === "undefined") {
    console.error(
      "supabase-client.js: the Supabase JS library wasn't found. " +
      "Check that the CDN <script> tag loads before this file."
    );
    return null;
  }
  if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") {
    console.error(
      "supabase-client.js: SUPABASE_URL / SUPABASE_ANON_KEY are missing. " +
      "Copy js/config.example.js to js/config.js and fill in your project's values."
    );
    return null;
  }
  // window.supabase is the UMD global from the CDN script; createClient()
  // returns the actual client. Renamed here so it doesn't shadow that global.
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
