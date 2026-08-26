/* interactions.js — per-page UI behavior, safe to include on every page */

(function () {
  /* Animate the split-flap departure board on dashboard */
  function initFlapBoard() {
    const board = document.getElementById("flap-board");
    if (!board || typeof DB === "undefined") return;
    const t = DB.nextTrip;

    const setText = (sel, val) => { const el = board.querySelector(sel); if (el) el.textContent = val; };
    setText("[data-flap='origin']", t.origin);
    setText("[data-flap='destination']", t.destination);
    setText("[data-flap='gate']", t.gate);
    setText("[data-flap='seat']", t.seat);

    fillDigits(board.querySelector("[data-flap-row='date']"), t.date);
    fillDigits(board.querySelector("[data-flap-row='time']"), t.time);

    const status = board.querySelector(".flap-status");
    if (status) {
      status.textContent = t.status;
      status.classList.toggle("delay", t.status === "DELAYED");
    }
    board.querySelectorAll(".flap").forEach((el, i) => {
      el.classList.add("animate");
      el.style.animationDelay = (i * 40) + "ms";
    });
  }

  function fillDigits(row, str) {
    if (!row || !str) return;
    row.innerHTML = str.split("").map(c => `<div class="flap">${c}</div>`).join("");
  }

  /* Fill dashboard points, weather, and tier widgets */
  function fillDashboardWidgets() {
    if (typeof DB === "undefined") return;
    const pts = document.getElementById("points-balance");
    if (pts) pts.textContent = DB.user.points.toLocaleString() + " pts";
    const tier = document.getElementById("points-tier-note");
    if (tier) tier.textContent = `${DB.user.tier} tier — 720 pts to Platinum`;

    const temp = document.getElementById("dest-temp");
    const desc = document.getElementById("dest-weather-desc");
    if (temp) temp.textContent = DB.weather.destination.temp + "°";
    if (desc) desc.textContent = `${DB.weather.destination.place} — ${DB.weather.destination.desc}`;
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
  function fillProfileForm() {
    if (typeof getCurrentUser !== "function") return;
    const user = getCurrentUser();
    if (!user) return;
    const nameInput = document.getElementById("profile-name");
    const emailInput = document.getElementById("profile-email");
    if (nameInput) nameInput.value = user.name;
    if (emailInput) emailInput.value = user.email;
  }

  /* Rewards redeem button state */
  function wireRedeemButtons() {
    document.querySelectorAll("[data-redeem]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.textContent = "Redeemed ✓";
        btn.disabled = true;
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
      });
    });
  }

  /* Padala fee estimate */
  function wirePadalaForm() {
    const form = document.getElementById("padala-form");
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const weight = parseFloat(form.querySelector("[name=weight]").value) || 1;
      const out = document.getElementById("padala-quote");
      if (out) out.textContent = `Estimated fee: ₱${Math.max(60, Math.round(weight * 35))}`;
    });
  }

  /* Login form validation and redirect */
  function wireLoginForm() {
    const form = document.getElementById("login-form");
    if (!form) return;
    const errorEl = document.getElementById("login-error");

    form.addEventListener("submit", e => {
      e.preventDefault();
      const email = form.querySelector("[name=email]").value.trim();
      const password = form.querySelector("[name=password]").value;

      const result = login(email, password);
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

    function setFieldError(name, message) {
      const field = form.querySelector(`[name="${name}"]`).closest(".field");
      const errorSpan = document.getElementById(`err-${name}`);
      field.classList.toggle("error", !!message);
      if (errorSpan) {
        errorSpan.textContent = message || "";
        errorSpan.style.display = message ? "block" : "none";
      }
    }

    form.addEventListener("submit", e => {
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

      const result = signup(name, email, password);
      if (!result.ok) {
        if (errorEl) { errorEl.textContent = result.error; errorEl.style.display = "block"; }
        return;
      }
      window.location.href = "dashboard.html";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initFlapBoard();
    fillDashboardWidgets();
    fillActivitiesWidget();
    fillPackingList();
    fillProfileForm();
    wireRedeemButtons();
    wirePadalaForm();
    wireLoginForm();
    wireForgotPassword();
    wirePasswordToggles();
    wireSignupForm();
  });
})();
