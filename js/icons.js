/* =====================================================================
   icons.js — inlines Lucide SVG icons from assets/icons/.
   Uses fetch() + innerHTML rather than an <img> tag so CSS (e.g.
   `.ic svg{ stroke:currentColor }`) can recolor the icon on hover/active
   states, the same way text color already responds to those states —
   a plain <img> can't be recolored that way.

   Not wired into any page yet. Usage once it is:
     loadIcon("compass", document.querySelector(".nav-link .ic"));
   ===================================================================== */

async function loadIcon(name, container) {
  if (!container) return;
  try {
    const res = await fetch(`/assets/icons/${name}.svg`);
    if (!res.ok) throw new Error(`icon "${name}" not found (${res.status})`);
    container.innerHTML = await res.text();
  } catch (err) {
    console.warn("loadIcon:", err.message);
  }
}
