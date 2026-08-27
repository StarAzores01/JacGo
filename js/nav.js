/* nav.js — shared sidebar, drawer, lang toggle, and auth guard for app pages */

(function () {
  /* Highlight active nav link based on body[data-page] */
  function highlightActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll("[data-route]").forEach(el => {
      el.classList.toggle("active", el.dataset.route === page);
    });
  }

  /* Show logged-in user name and points in sidebar footer */
  async function fillUserInfo() {
    if (typeof getCurrentUser !== "function") return;
    const user = await getCurrentUser();

    const nameEl = document.getElementById("sidebar-user-name");
    if (nameEl) nameEl.textContent = user ? user.name : "Guest";

    const ptsEl = document.getElementById("sidebar-points");
    if (ptsEl && user && typeof user.points === "number") {
      ptsEl.textContent = user.points.toLocaleString() + " pts";
    }
  }

  /* EN/FIL toggle active state (lang.js handles the actual translation) */
  function wireLangToggle() {
    document.querySelectorAll(".lang-toggle button").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  /* Build the "Log out?" confirmation dialog once, reusing the same
     .confirm-overlay/.confirm-box markup pattern as the other confirm
     dialogs in this app (see pages/tickets.html, pages/profile.html). */
  function buildLogoutConfirm() {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.id = "logout-confirm";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="confirm-box">
        <h3 data-i18n="confirm.logout.title">Log out?</h3>
        <p data-i18n="confirm.logout.msg">You'll need to log in again to access your account.</p>
        <div class="confirm-actions">
          <button class="btn btn-outline" id="logout-confirm-no" data-i18n="btn.no">No, go back</button>
          <button class="btn btn-primary" id="logout-confirm-yes" data-i18n="btn.yes">Yes, continue</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    // This markup is added after lang.js's own DOMContentLoaded translation
    // pass, so re-run it now for these new [data-i18n] nodes.
    if (typeof window.applyLang === "function") {
      let locale = "en";
      try { locale = localStorage.getItem("jac-lang") || "en"; } catch (e) {}
      window.applyLang(locale);
    }

    const close = () => overlay.classList.remove("open");
    overlay.querySelector("#logout-confirm-no").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("open")) close();
    });

    overlay.querySelector("#logout-confirm-yes").addEventListener("click", async () => {
      const yesBtn = overlay.querySelector("#logout-confirm-yes");
      yesBtn.disabled = true;
      if (typeof logout === "function") await logout();
      // Full navigation (not history.back()) so the app shell doesn't stay
      // in memory for the bfcache guard below to have to catch.
      window.location.href = "login.html";
    });

    return overlay;
  }

  /* Log out buttons in sidebar and profile page open the confirmation
     dialog instead of logging out immediately. */
  function wireLogoutButtons() {
    const buttons = document.querySelectorAll("#sidebar-logout, #profile-logout");
    if (!buttons.length) return;
    const overlay = buildLogoutConfirm();
    buttons.forEach(btn => {
      btn.addEventListener("click", () => overlay.classList.add("open"));
    });
  }

  /* Back-button / bfcache protection: if the browser restores a cached
     snapshot of this protected page (e.g. the user hits Back after
     logging out) instead of reloading it, DOMContentLoaded does NOT fire
     again — bfcache restores are, on purpose, not full page loads. Catch
     that case with pageshow's `persisted` flag and re-run the same
     session check, re-hiding the page while it does. The no-store meta
     tag on these pages is a best-effort nudge in the same direction, but
     this is what actually closes the gap: it works whether or not a given
     browser chose to bfcache the page at all. */
  function guardBfcacheRestore() {
    window.addEventListener("pageshow", async event => {
      if (!event.persisted) return; // ordinary load — the DOMContentLoaded guard already ran
      if (typeof requireAuth !== "function") return;
      document.documentElement.classList.add("auth-pending");
      try {
        await requireAuth();
      } finally {
        document.documentElement.classList.remove("auth-pending");
      }
    });
  }
  guardBfcacheRestore();

  function wireNavigationScroll() {
    const storageKey = "jac-navigation-scroll";
    const sidebarStorageKey = "jac-sidebar-scroll";

    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved !== null) {
        sessionStorage.removeItem(storageKey);
        const scrollY = Number(saved);
        if (Number.isFinite(scrollY)) {
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }
      }

      const savedSidebar = sessionStorage.getItem(sidebarStorageKey);
      const sidebar = document.querySelector(".sidebar");
      if (savedSidebar !== null && sidebar) {
        sessionStorage.removeItem(sidebarStorageKey);
        const sidebarScroll = Number(savedSidebar);
        if (Number.isFinite(sidebarScroll)) {
          requestAnimationFrame(() => { sidebar.scrollTop = sidebarScroll; });
        }
      }
    } catch (e) {}

    document.querySelectorAll(".sidebar .nav-link, .tabbar a").forEach(link => {
      link.addEventListener("click", () => {
        try {
          sessionStorage.setItem(storageKey, String(window.scrollY));
          const sidebar = document.querySelector(".sidebar");
          if (sidebar) sessionStorage.setItem(sidebarStorageKey, String(sidebar.scrollTop));
        } catch (e) {}
      });
    });
  }

  /* Mobile off-canvas drawer: open/close via menu button, backdrop, X, Escape */
  function wireMobileDrawer() {
    const sidebar = document.querySelector(".sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const openBtn = document.getElementById("menu-toggle");
    const closeBtn = document.getElementById("sidebar-close");
    const appShell = document.querySelector(".app-shell");
    if (!sidebar || !backdrop || !openBtn || !appShell) return;

    const isMobile = () => window.matchMedia("(max-width: 980px)").matches;

    function openDrawer() {
      sidebar.classList.add("open");
      appShell.classList.remove("menu-closed");
      if (isMobile()) backdrop.classList.add("open");
      openBtn.setAttribute("aria-expanded", "true");
    }
    function closeDrawer() {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
      if (!isMobile()) appShell.classList.add("menu-closed");
      openBtn.setAttribute("aria-expanded", "false");
    }

    function toggleDrawer() {
      const open = isMobile() ? sidebar.classList.contains("open") : !appShell.classList.contains("menu-closed");
      if (open) closeDrawer();
      else openDrawer();
    }

    if (!isMobile()) openBtn.setAttribute("aria-expanded", "true");
    openBtn.addEventListener("click", toggleDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
    sidebar.querySelectorAll(".nav-link, .back-to-site").forEach(link => {
      link.addEventListener("click", closeDrawer);
    });
    window.addEventListener("resize", () => {
      if (isMobile()) {
        appShell.classList.remove("menu-closed");
        openBtn.setAttribute("aria-expanded", sidebar.classList.contains("open") ? "true" : "false");
      } else {
        sidebar.classList.remove("open");
        backdrop.classList.remove("open");
        openBtn.setAttribute("aria-expanded", appShell.classList.contains("menu-closed") ? "false" : "true");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (typeof requireAuth === "function" && await requireAuth()) return;
    } catch (e) {
      // Fail open: don't leave the page permanently hidden behind
      // auth-pending (see the inline bootstrap script in <head>) just
      // because the session check itself errored (e.g. bad config).
      console.error("nav.js: requireAuth() failed, showing page anyway.", e);
    }
    document.documentElement.classList.remove("auth-pending");
    highlightActiveNav();
    fillUserInfo();
    wireLangToggle();
    wireLogoutButtons();
    wireNavigationScroll();
    wireMobileDrawer();
  });
})();
