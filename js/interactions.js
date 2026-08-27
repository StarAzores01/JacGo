/* interactions.js — per-page UI behavior, safe to include on every page */

(function () {
  function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* "2026-08-17" -> "AUG 17" (flap board's compact per-character format) */
  function formatFlapDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()} ${String(d.getDate()).padStart(2, "0")}`;
  }

  /* "2026-08-17" -> "Aug 17, 2026" */
  function formatTripDateLong(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  /* "06:45:00" (Postgres time) -> "06:45 AM" */
  function formatTripTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
  }

  /* The soonest not-yet-departed trip for a user, or null. */
  async function fetchNextUpcomingTrip(userId) {
    const { data, error } = await supabaseClient
      .from("trips")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "upcoming")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) console.warn("interactions.js: couldn't load next trip.", error);
    return data;
  }

  /* Animate the split-flap departure board on dashboard with the user's
     soonest upcoming trip (formerly DB.nextTrip's mock/fictional status —
     there's no live delay-tracking data source, so this just shows the
     booking's real fields and a plain "confirmed" state). */
  async function initFlapBoard() {
    const board = document.getElementById("flap-board");
    const empty = document.getElementById("flap-board-empty");
    if (!board || typeof getCurrentUser !== "function") return;

    const user = await getCurrentUser();
    if (!user) return;
    const t = await fetchNextUpcomingTrip(user.id);
    if (!t) {
      if (empty) empty.style.display = "";
      return;
    }

    board.style.display = "";
    const setText = (sel, val) => { const el = board.querySelector(sel); if (el) el.textContent = val; };
    setText("[data-flap='origin']", t.origin.toUpperCase());
    setText("[data-flap='destination']", t.destination.toUpperCase());
    setText("[data-flap='gate']", t.gate || "TBA");
    setText("[data-flap='seat']", t.seat);

    fillDigits(board.querySelector("[data-flap-row='date']"), formatFlapDate(t.date));
    fillDigits(board.querySelector("[data-flap-row='time']"), t.time.slice(0, 5));

    board.querySelectorAll(".flap").forEach((el, i) => {
      el.classList.add("animate");
      el.style.animationDelay = (i * 40) + "ms";
    });
  }

  function fillDigits(row, str) {
    if (!row || !str) return;
    row.innerHTML = str.split("").map(c => `<div class="flap">${c}</div>`).join("");
  }

  /* Fill dashboard points/tier (from the user's profiles row) and weather
     (still DB.weather — there's no live weather API wired up; see
     js/data.js's header comment for what's still mock and why). */
  async function fillDashboardWidgets() {
    const pts = document.getElementById("points-balance");
    const tier = document.getElementById("points-tier-note");
    if ((pts || tier) && typeof getCurrentUser === "function") {
      const user = await getCurrentUser();
      if (user && typeof user.points === "number") {
        if (pts) pts.textContent = user.points.toLocaleString() + " pts";
        // No real tier-threshold data to compute "X pts to next tier" from
        // (that was a hardcoded mock number) — just show the tier itself.
        if (tier) tier.textContent = `${user.tier} tier`;
      }
    }

    if (typeof DB === "undefined") return;
    const temp = document.getElementById("dest-temp");
    const desc = document.getElementById("dest-weather-desc");
    if (temp) temp.textContent = DB.weather.destination.temp + "°";
    if (desc) desc.textContent = `${DB.weather.destination.place} — ${DB.weather.destination.desc}`;
  }

  /* Dashboard's "Upcoming Trips" list (top 3), from the trips table. */
  async function fillUpcomingTripsWidget() {
    const container = document.getElementById("dash-upcoming-trips");
    const emptyEl = document.getElementById("dash-upcoming-trips-empty");
    if (!container || typeof getCurrentUser !== "function") return;

    const user = await getCurrentUser();
    if (!user) return;

    const { data: trips, error } = await supabaseClient
      .from("trips")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "upcoming")
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(3);
    if (error) { console.warn("interactions.js: couldn't load upcoming trips.", error); return; }

    if (!trips || !trips.length) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    container.innerHTML = trips.map(t => `
      <div class="list-row">
        <div style="flex:1;">
          <strong style="font-size:13.5px;">${escHtml(t.origin)} → ${escHtml(t.destination)}</strong>
          <div style="font-size:12px;color:var(--text-muted);">${formatTripDateLong(t.date)} · ${formatTripTime(t.time)} · Seat ${escHtml(t.seat)}</div>
        </div>
        <span class="pill ok">${escHtml(t.klass)}</span>
      </div>
    `).join("");
  }

  /* Fill dashboard activities & dining list */
  function fillActivitiesWidget() {
    const list = document.getElementById("activities-list");
    if (!list || typeof DB === "undefined" || !DB.activities) return;
    list.innerHTML = DB.activities.map(a => `
      <div class="list-row">
        <div style="flex:1;">
          <strong style="font-size:13.5px;">${a.name}</strong>
          <div style="font-size:12px;color:var(--text-muted);">${a.loc}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${a.desc}</div>
          ${a.sourceUrl ? `<a href="${a.sourceUrl}" target="_blank" rel="noopener" style="font-size:11px;color:var(--text-muted);text-decoration:underline;">Source: Wikipedia</a>` : ""}
        </div>
        <span class="pill ok">${a.type}</span>
      </div>
    `).join("");
  }

  /* Fill trip planner packing checklist */
  function fillPackingList() {
    const container = document.getElementById("packing-list");
    if (!container || typeof DB === "undefined" || !DB.packingList) return;
    container.innerHTML = DB.packingList.map(group => `
      <div class="packing-group">
        <div class="packing-group-label">${group.category}</div>
        <ul class="packing-items">
          ${group.items.map((item, i) => `
            <li class="packing-item">
              <input type="checkbox" id="pk-${group.category}-${i}" />
              <label for="pk-${group.category}-${i}">${item}</label>
            </li>
          `).join("")}
        </ul>
      </div>
    `).join("");
  }

  /* Pre-fill profile form with logged-in user data */
  async function fillProfileForm() {
    if (typeof getCurrentUser !== "function") return;
    const user = await getCurrentUser();
    if (!user) return;
    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;
  }

  /* Login form validation and redirect */
  function wireLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;
    const errorEl = document.getElementById("login-error");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const email = form.querySelector("[name=email]").value.trim();
      const password = form.querySelector("[name=password]").value;

      if (submitBtn) submitBtn.disabled = true;
      const result = await login(email, password);
      if (submitBtn) submitBtn.disabled = false;

      if (!result.ok) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = "block"; }
        return;
      }
      if (errorEl) errorEl.style.display = "none";
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "dashboard.html";
    });
  }

  /* Forgot password placeholder */
  function wireForgotPassword() {
    const link = document.getElementById("forgot-password");
    if (!link) return;
    link.addEventListener("click", e => {
      e.preventDefault();
      alert("Password reset isn't available in this demo yet.");
    });
  }

  /* Show/hide password toggle */
  function wirePasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach(btn => {
      const input = btn.closest(".password-wrap").querySelector("input");
      if (!input) return;
      btn.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.classList.toggle("showing", !showing);
        btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    });
  }

  /* Signup form validation */
  function wireSignupForm() {
    const form = document.getElementById("signup-form");
    if (!form) return;
    const errorEl = document.getElementById("signup-error");
    const submitBtn = form.querySelector('button[type="submit"]');

    function setFieldError(name, message) {
      const field = form.querySelector(`[name="${name}"]`).closest(".field");
      const errorSpan = document.getElementById(`err-${name}`);
      field.classList.toggle("error", !!message);
      if (errorSpan) {
        errorSpan.textContent = message || "";
        errorSpan.style.display = message ? "block" : "none";
      }
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = "none";

      const name = form.querySelector("[name=name]").value.trim();
      const email = form.querySelector("[name=email]").value.trim();
      const password = form.querySelector("[name=password]").value;
      const confirmPassword = form.querySelector('[name="confirm-password"]').value;

      let valid = true;

      setFieldError("name", name ? "" : "Enter your full name.");
      if (!name) valid = false;

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!email) { setFieldError("email", "Enter your email."); valid = false; }
      else if (!emailOk) { setFieldError("email", "Enter a valid email address."); valid = false; }
      else { setFieldError("email", ""); }

      setFieldError("password", password ? "" : "Enter a password.");
      if (!password) valid = false;

      if (!confirmPassword) { setFieldError("confirm-password", "Re-enter your password."); valid = false; }
      else if (confirmPassword !== password) { setFieldError("confirm-password", "Passwords don't match."); valid = false; }
      else { setFieldError("confirm-password", ""); }

      if (!valid) return;

      if (submitBtn) submitBtn.disabled = true;
      const result = await signup(name, email, password);
      if (submitBtn) submitBtn.disabled = false;

      if (!result.ok) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = "block"; }
        return;
      }
      if (result.needsEmailConfirmation) {
        // "Confirm email" is on for this project — there's no session yet.
        if (errorEl) {
          errorEl.textContent = "Almost there — check your email to confirm your account, then log in.";
          errorEl.style.display = "block";
        }
        return;
      }
      window.location.href = "dashboard.html";
    });
  }

  function wireDestinationCarousel() {
    const track = document.getElementById("dest-scroll");
    const previous = document.querySelector(".dest-prev");
    const next = document.querySelector(".dest-next");
    if (!track || !previous || !next) return;

    function updateControls() {
      const maxScroll = track.scrollWidth - track.clientWidth;
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= maxScroll - 1;
    }

    function scrollByCard(direction) {
      const card = track.querySelector(".dest-card");
      if (!card) return;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.scrollBy({ left: direction * (card.offsetWidth + gap), behavior: "smooth" });
    }

    previous.addEventListener("click", () => scrollByCard(-1));
    next.addEventListener("click", () => scrollByCard(1));
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls);
    updateControls();
  }

  function wireCardDetails() {
    const cards = document.querySelectorAll(".dest-card, .photo-card");
    if (!cards.length) return;

    const details = {
      "Tayabas": ["Tayabas City, Quezon", "Daily; JAC Liner schedules vary depending on the route", "Fare varies depending on the passenger's point of origin and destination", "N/A", "Tayabas is one of the destinations served by JAC Liner in Quezon. It provides access to the historic city and nearby tourist destinations."],
      "Lucena City": ["Lucena Grand Central Terminal, Ilayang Dupay, Lucena City, Quezon", "Daily; multiple trips are available depending on the route", "Fare varies depending on origin, destination, and bus type", "N/A", "Lucena City is one of JAC Liner's major transportation hubs in Quezon. The Lucena Grand Central Terminal serves passengers traveling between Metro Manila, Quezon, and other Southern Luzon destinations."],
      "Calamba Hot Springs": ["Calamba / Los Banos area, Laguna", "Depends on the specific hot spring resort", "No fixed JAC Liner rate; local transportation is required from the nearest bus stop", "Depends on the resort", "The Calamba-Los Banos area is known for its hot spring resorts. JAC Liner provides transportation to the area, after which passengers can use local transportation to reach individual resorts."],
      "Anilao": ["Nailao, Quezon", "Unable to verify", "Unable to verify", "Unable to verify", "I could not reliably confirm Nailao as an official JAC Liner destination from current public information. The exact location or spelling should be verified before adding it to your system."],
      "Marinduque": ["Marinduque Province", "Daily; schedules may vary", "Varies according to destination and point of origin", "Depends on the selected accommodation", "JAC Liner provides transportation connecting passengers from Metro Manila and Lucena toward several destinations in Marinduque, including Boac, Gasan, Buenavista, Torrijos, and Santa Cruz."],
      "Lucban": ["Lucban, Quezon", "Daily; schedules may vary by route", "Fare varies depending on origin, destination, and bus type", "N/A", "Lucban is a Quezon destination shown in JAC Go's popular destinations list. Confirm the current route and schedule before traveling."],
      "Terrazza Inn Lucena": ["Lucena City, Quezon", "Unable to reliably verify", "Unable to reliably verify current room rates", "Depends on room type and length of stay", "Terezza Inn is listed as an accommodation establishment associated with Lucena, but current reliable information about its room rates and operating schedule could not be confirmed."],
      "Batangas Bay Hotel": ["Batangas City, Batangas", "Hotel accommodation available; exact operating schedule should be confirmed with the establishment", "Unable to verify the exact current rate for a hotel named Batangas Bay Hotel", "Depends on room type and duration of stay", "The exact establishment called Batangas Bay Hotel could not be reliably matched with current information. The name may refer to another hotel in Batangas City."],
      "Calamba Garden Suites": ["Calamba City, Laguna", "Unable to reliably verify", "Unable to reliably verify current room rates", "Depends on room type and duration of stay", "Calamba Garden Suites could not be reliably verified under this exact name using current public information. The establishment's exact name should be confirmed before using the information in your system."],
      "RAYLux Hotel": ["Pagbilao, Quezon", "Hotel accommodation; exact operating hours should be confirmed with the hotel", "Current room rates not reliably published", "Depends on room type and length of stay", "RAYLux Hotel is an accommodation establishment in Pagbilao, Quezon. It provides lodging for travelers visiting Pagbilao and nearby areas."],
      "Hotel Oliva 88": ["National Highway, Paciano Rizal, Calamba, Laguna", "Hotel accommodation available; exact schedule should be confirmed", "Current room rates not reliably published", "Depends on room type and length of stay", "Hotel Olivia 88 is located along the National Highway in Calamba, Laguna. Its location makes it convenient for travelers passing through Calamba and nearby destinations."]
    };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay card-details-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `<div class="modal card-details-modal"><div class="modal-header"><h2 id="card-details-title"></h2><button class="modal-close" type="button" aria-label="Close details">&times;</button></div><dl class="card-details-list"><div><dt>Location</dt><dd data-detail="0"></dd></div><div><dt>Open hours/days</dt><dd data-detail="1"></dd></div><div><dt>Rates</dt><dd data-detail="2"></dd></div><div><dt>Packages price</dt><dd data-detail="3"></dd></div><div><dt>Details</dt><dd data-detail="4"></dd></div></dl></div>`;
    document.body.appendChild(overlay);

    let lastCard = null;
    const close = () => {
      overlay.classList.remove("open");
      if (lastCard) lastCard.focus({ preventScroll: true });
    };
    overlay.querySelector(".modal-close").addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

    cards.forEach(card => {
      const name = card.querySelector("h4")?.textContent.trim();
      const content = details[name];
      if (!content) return;
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `View details for ${name}`);
      const open = event => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        lastCard = card;
        overlay.querySelector("#card-details-title").textContent = name;
        content.forEach((value, index) => { overlay.querySelector(`[data-detail="${index}"]`).textContent = value; });
        overlay.classList.add("open");
        overlay.querySelector(".modal-close").focus({ preventScroll: true });
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFlapBoard();
    fillDashboardWidgets();
    fillUpcomingTripsWidget();
    fillActivitiesWidget();
    fillPackingList();
    fillProfileForm();
    wireLoginForm();
    wireForgotPassword();
    wirePasswordToggles();
    wireSignupForm();
    wireDestinationCarousel();
    wireCardDetails();
  });
})();
