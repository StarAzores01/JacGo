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
  function fillUserInfo() {
    if (typeof getCurrentUser !== "function") return;
    const user = getCurrentUser();

    const nameEl = document.getElementById("sidebar-user-name");
    if (nameEl) nameEl.textContent = user ? user.name : "Guest";

    const ptsEl = document.getElementById("sidebar-points");
    if (ptsEl && typeof DB !== "undefined") {
      ptsEl.textContent = DB.user.points.toLocaleString() + " pts";
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

  /* Log out buttons in sidebar and profile page */
  function wireLogoutButtons() {
    document.querySelectorAll("#sidebar-logout, #profile-logout").forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof logout === "function") logout();
        window.location.href = "login.html";
      });
    });
  }

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

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof requireAuth === "function" && requireAuth()) return;
    highlightActiveNav();
    fillUserInfo();
    wireLangToggle();
    wireLogoutButtons();
    wireNavigationScroll();
    wireMobileDrawer();
  });
})();
