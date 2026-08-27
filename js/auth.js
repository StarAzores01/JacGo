/* auth.js — real authentication via Supabase Auth (email + password).
 *
 * Replaces the old mock localStorage user store. Supabase now owns
 * password hashing, session tokens, and secure storage — this file is
 * just a thin wrapper so pages/nav.js don't need to know the Supabase API
 * directly. Depends on supabaseClient (js/supabase-client.js), loaded
 * before this file on every page.
 *
 * Every function here is now async (network calls to Supabase) — call
 * sites must await them. See js/interactions.js's wireLoginForm/
 * wireSignupForm, js/nav.js, and js/chatbot.js for the updated call sites.
 */

/* Turn Supabase's raw error messages into the copy this app already used,
 * where a direct match exists; otherwise pass Supabase's own message
 * through — it's already written for end users. */
function friendlyAuthError(error) {
  const msg = (error && error.message) || "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/user already registered/i.test(msg)) return "An account with that email already exists.";
  return msg;
}

/* The profiles row for a new signup is created server-side by the
 * on_auth_user_created trigger (supabase/migrations/0001_init.sql) in the
 * same Postgres transaction as the auth.users insert — not from here.
 * There's intentionally no client-side INSERT policy on profiles (see
 * that migration's RLS section), so the client couldn't create the row
 * itself even if it tried. This just confirms the trigger did its job. */
async function confirmProfileExists(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    console.warn(
      "auth.js: no profiles row found right after signup. Check the " +
      "on_auth_user_created trigger in supabase/migrations/0001_init.sql " +
      "was applied to this project.",
      error
    );
  }
}

async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendlyAuthError(error) };
  return { ok: true, user: data.user };
}

async function signup(name, email, password) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { name } }, // read by the handle_new_user trigger for profiles.name
  });
  if (error) return { ok: false, error: friendlyAuthError(error) };

  if (!data.session) {
    // "Confirm email" is on for this project: signUp() succeeded but
    // there's no session yet — the user has to click the link in their
    // inbox before they can log in. (Disable this in Authentication ->
    // Sign In / Providers -> Email for local testing.)
    return { ok: true, user: data.user, needsEmailConfirmation: true };
  }

  await confirmProfileExists(data.user.id);
  return { ok: true, user: data.user };
}

async function logout() {
  await supabaseClient.auth.signOut();
}

/* Returns { id, email, name, tier, points } for the signed-in user, or
 * null if no one's logged in. name/tier/points come from the profiles
 * table (not auth.users — Supabase Auth only knows email/password). */
async function getCurrentUser() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return null;
  const user = session.user;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("name, tier, points")
    .eq("id", user.id)
    .maybeSingle();
  if (error) console.warn("auth.js: couldn't load profile for current user.", error);

  return {
    id: user.id,
    email: user.email,
    name: (profile && profile.name) || (user.user_metadata && user.user_metadata.name) || user.email,
    tier: profile ? profile.tier : undefined,
    points: profile ? profile.points : undefined,
  };
}

/* Redirect to login if not authenticated; returns true if redirecting.
 * Now async — every call site must `await requireAuth()` and bail out
 * (return/skip its own render) when it resolves true, so protected pages
 * never flash their real content before the redirect happens. */
async function requireAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    const page = window.location.pathname.split("/").pop();
    window.location.href = `login.html?redirect=${encodeURIComponent(page)}`;
    return true;
  }
  return false;
}

/* Mirror of requireAuth() for the public login/signup pages: if a valid
 * session already exists, there's nothing for either form to do — send
 * the visitor straight to their dashboard instead. Returns true if it
 * redirected (caller should leave the page hidden and do nothing else),
 * false if there's no session (show the form as normal). Wired up by
 * js/auth-redirect.js, loaded only on pages/login.html and
 * pages/signup.html. */
async function redirectIfAuthenticated() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    // replace(), not href: this should feel like the login/signup page
    // was never a stop of its own while a session is active, not like a
    // page you can navigate back to and get bounced from every time.
    window.location.replace("dashboard.html");
    return true;
  }
  return false;
}
