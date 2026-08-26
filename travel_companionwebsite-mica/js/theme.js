/* theme.js — light/dark toggle, persists to localStorage */

(function () {
  var STORAGE_KEY = "jac-theme";

  function currentTheme() {
    var attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function wireToggle(btn) {
    btn.setAttribute("aria-pressed", currentTheme() === "dark" ? "true" : "false");
    btn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
      btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("#theme-toggle, .theme-toggle").forEach(wireToggle);
  });
})();
