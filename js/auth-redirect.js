/* auth-redirect.js — "already authenticated" guard for the public
 * login/signup pages: the mirror image of nav.js's requireAuth() guard
 * on the protected app pages. Loaded only by pages/login.html and
 * pages/signup.html — nav.js (and its requireAuth() guard) isn't loaded
 * there, so this file owns the wiring for the opposite check.
 *
 * Uses the same auth-pending flash-prevention class (css/base.css) and
 * the same bfcache/pageshow pattern as nav.js's guard, just redirecting
 * the other way: toward the dashboard instead of away from it, and
 * silently — no confirmation, no "already logged in as X" messaging.
 */

(function () {
  async function check() {
    if (typeof redirectIfAuthenticated !== "function") return false;
    return redirectIfAuthenticated();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (await check()) return; // redirecting — leave the page hidden behind auth-pending
    } catch (e) {
      // Fail open: show the form rather than leave the page permanently
      // hidden just because the session check itself errored.
      console.error("auth-redirect.js: session check failed, showing the form anyway.", e);
    }
    document.documentElement.classList.remove("auth-pending");
  });

  // A Back navigation that restores this page from bfcache doesn't fire
  // DOMContentLoaded again — re-check here too (e.g. logged in, then hit
  // Back to what's now a stale login page), re-hiding the page while the
  // check runs so there's no flash of the form before the redirect.
  window.addEventListener("pageshow", async event => {
    if (!event.persisted) return; // ordinary load — the DOMContentLoaded check already ran
    document.documentElement.classList.add("auth-pending");
    try {
      if (await check()) return;
    } catch (e) {
      console.error("auth-redirect.js: session check failed on bfcache restore, showing the form anyway.", e);
    }
    document.documentElement.classList.remove("auth-pending");
  });
})();
