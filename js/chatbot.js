/* chatbot.js — floating "JAC Assistant" launcher + panel, shared across
   every app page AND the public landing page (index.html). Messages are
   sent to the `jac-assistant` Supabase Edge Function (supabase/functions/),
   which calls the AI provider server-side — no AI key ever reaches the
   browser. The thread resets each time the panel opens (nothing persists
   across opens or page loads); the last few turns are sent as context.

   Text follows the site's existing EN/FIL system (js/lang.js): elements
   carry data-i18n attributes so applyLang() translates them the same way
   as everything else, and the strings this file generates dynamically
   (the two assistant bubbles) are pulled from window.DICT at the moment
   they're created rather than hardcoded. */

(function () {
  /* English fallbacks — used only if lang.js hasn't loaded/run yet. */
  var FALLBACK = {
    "chat.title": "JAC Assistant",
    "chat.status": "AI travel assistant",
    "chat.notAvailable": "Hi! I'm JAC Assistant. Ask me about JAC Go services or your trip.",
    "chat.thinking": "Thinking…",
    "chat.error": "The assistant is temporarily unavailable. Please try again later.",
    "chat.loginRequired": "Please log in to chat with JAC Assistant.",
    "chat.rateLimited": "You've sent several requests recently. Please try again later.",
    "chat.inputPlaceholder": "Type a message…",
    "chat.send": "Send message",
    "chat.openLabel": "Open JAC Assistant chat",
    "chat.closeLabel": "Close chat"
  };

  function getLocale() {
    try {
      var saved = localStorage.getItem("jac-lang");
      if (saved === "en" || saved === "fil") return saved;
    } catch (e) {}
    return "en";
  }

  /* Look up a chat.* string in the shared DICT (js/lang.js) for the
     current locale, falling back to English if DICT isn't available. */
  function t(key) {
    var locale = getLocale();
    if (window.DICT && window.DICT[key] && window.DICT[key][locale] !== undefined) {
      return window.DICT[key][locale];
    }
    return FALLBACK[key];
  }

  const ICON_MESSAGE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>';
  const ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>';
  const ICON_SEND =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg>';

  /* Build the launcher button + panel and append them once to <body>.
     Injected via JS (rather than duplicated per-page markup like the
     sidebar/tabbar) since this widget is identical on every page it
     appears on — one script tag per page keeps them all in sync. */
  function buildWidget() {
    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "chat-launcher";
    launcher.id = "chat-launcher";
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-expanded", "false");
    launcher.setAttribute("aria-controls", "chat-panel");
    launcher.setAttribute("data-i18n", "chat.openLabel");
    launcher.setAttribute("data-i18n-attr", "aria-label");
    launcher.setAttribute("aria-label", t("chat.openLabel"));
    launcher.innerHTML = `<span class="ic">${ICON_MESSAGE}</span>`;

    const panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.id = "chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "chat-panel-title");
    panel.innerHTML = `
      <header class="chat-panel-header">
        <span class="chat-panel-avatar">${ICON_MESSAGE}</span>
        <div class="chat-panel-title-group">
          <div>
            <div class="chat-panel-title" id="chat-panel-title" data-i18n="chat.title">${t("chat.title")}</div>
            <div class="chat-panel-status" data-i18n="chat.status">${t("chat.status")}</div>
          </div>
        </div>
        <button type="button" class="chat-panel-close" id="chat-panel-close" data-i18n="chat.closeLabel" data-i18n-attr="aria-label" aria-label="${t("chat.closeLabel")}">${ICON_CLOSE}</button>
      </header>
      <div class="chat-panel-messages" id="chat-panel-messages"></div>
      <form class="chat-panel-input" id="chat-panel-form">
        <input type="text" id="chat-panel-input" data-i18n="chat.inputPlaceholder" placeholder="${t("chat.inputPlaceholder")}" autocomplete="off" maxlength="300" aria-label="${t("chat.inputPlaceholder")}" />
        <button type="submit" class="chat-panel-send" data-i18n="chat.send" data-i18n-attr="aria-label" aria-label="${t("chat.send")}">${ICON_SEND}</button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
    return { launcher, panel };
  }

  /* i18nKey (optional) keeps the bubble translated live if the user
     toggles EN/FIL while it's on screen — lang.js's applyLang() will
     find it via the same data-i18n attribute as everything else. Omit
     it for the user's own typed message, which isn't a UI string. */
  function addMessage(container, text, role, i18nKey) {
    const bubble = document.createElement("div");
    bubble.className = `chat-msg ${role}`;
    bubble.textContent = text;
    if (i18nKey) bubble.setAttribute("data-i18n", i18nKey);
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  /* Ask the edge function for a reply. Returns the reply text, or throws
     (caller shows the generic error bubble). `history` is the prior turns
     as [{ role, content }], excluding the new message. The function
     authenticates via the session JWT that supabase-js attaches itself. */
  async function askAssistant(message, history) {
    const { data, error } = await supabaseClient.functions.invoke("jac-assistant", {
      body: { message, history }
    });
    if (error || !data || typeof data.reply !== "string") throw error || new Error("Bad response");
    return data.reply;
  }

  /* Reset to the single opening assistant message — no history survives
     a close/reopen or a page navigation. */
  function resetThread(messages) {
    messages.innerHTML = "";
    addMessage(messages, t("chat.notAvailable"), "assistant", "chat.notAvailable");
  }

  function closeMobileDrawer() {
    const sidebar = document.querySelector(".sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");
    const menuToggle = document.getElementById("menu-toggle");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
  }

  function wireWidget({ launcher, panel }) {
    const messages = panel.querySelector("#chat-panel-messages");
    const closeBtn = panel.querySelector("#chat-panel-close");
    const form = panel.querySelector("#chat-panel-form");
    const input = panel.querySelector("#chat-panel-input");
    const sendBtn = form.querySelector(".chat-panel-send");
    const MAX_HISTORY = 10;
    let history = [];
    let busy = false;

    function openPanel() {
      resetThread(messages);
      history = [];
      panel.classList.add("open");
      launcher.setAttribute("aria-expanded", "true");
      closeMobileDrawer(); // avoid two overlapping panels on small screens
      input.focus();
    }

    function closePanel() {
      panel.classList.remove("open");
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }

    function togglePanel() {
      if (panel.classList.contains("open")) closePanel();
      else openPanel();
    }

    launcher.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", closePanel);

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
    });

    document.addEventListener("click", e => {
      if (!panel.classList.contains("open")) return;
      if (panel.contains(e.target) || launcher.contains(e.target)) return;
      closePanel();
    });

    // Opening the mobile drawer should close the chat panel, same reasoning
    // in reverse (see closeMobileDrawer above). No-op on pages with no drawer
    // (e.g. the landing page), since menuToggle is just null there.
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) menuToggle.addEventListener("click", closePanel);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      busy = true;
      sendBtn.disabled = true;
      addMessage(messages, text, "user");
      input.value = "";
      const pending = addMessage(messages, t("chat.thinking"), "assistant pending", "chat.thinking");

      let reply, failKey = "chat.error";
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          failKey = "chat.loginRequired";
          throw new Error("No session");
        }
        reply = await askAssistant(text, history.slice(-MAX_HISTORY));
      } catch (err) {
        console.warn("chatbot.js: assistant request failed.", err);
        if (err && err.context && err.context.status === 429) failKey = "chat.rateLimited";
      } finally {
        // Always restore the UI, whatever happened above.
        pending.classList.remove("pending");
        if (reply) {
          pending.removeAttribute("data-i18n");
          pending.textContent = reply;
          // Skip if the panel was reopened (thread reset) while this was in flight.
          if (pending.isConnected) history.push({ role: "user", content: text }, { role: "assistant", content: reply });
        } else {
          pending.setAttribute("data-i18n", failKey);
          pending.textContent = t(failKey);
        }
        messages.scrollTop = messages.scrollHeight;
        busy = false;
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // Mirror nav.js's guard: don't inject the widget on a page that's about
    // to redirect to login. (requireAuth only exists on app-shell pages
    // that load auth.js — it's undefined, and skipped, on index.html.)
    // requireAuth() is async now, same as nav.js's own call to it.
    if (typeof requireAuth === "function" && await requireAuth()) return;

    // Every page gets the widget except the auth pages themselves — it
    // has no login-gated content, so it's fine logged out on index.html too.
    const skipPages = ["login", "signup"];
    if (skipPages.includes(document.body.dataset.page)) return;

    wireWidget(buildWidget());
  });
})();
