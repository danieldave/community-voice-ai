/* Shared bits for every page: Night Mode, larger text, toast messages, "last verified" date. */
(function () {
  const html = document.documentElement;

  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  // ---- Night Mode ----
  function setTheme(t) {
    html.setAttribute("data-theme", t);
    document.querySelectorAll("[data-theme-toggle]").forEach(b => {
      const dark = t === "dark";
      b.setAttribute("aria-pressed", dark ? "true" : "false");
      b.textContent = dark ? "☀️ Day" : "🌙 Night";
      b.setAttribute("aria-label", dark ? "Switch to day mode" : "Switch to night mode");
    });
  }
  setTheme(html.getAttribute("data-theme") || "light");
  document.querySelectorAll("[data-theme-toggle]").forEach(b => {
    b.addEventListener("click", () => {
      const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next);
      store("cv-theme", next);
    });
  });

  // ---- Larger text ----
  function setLarge(on) {
    html.classList.toggle("large-text", on);
    document.querySelectorAll("[data-text-toggle]").forEach(b => {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "A− Text" : "A+ Text";
      b.setAttribute("aria-label", on ? "Use normal text size" : "Use larger text");
    });
  }
  setLarge(store("cv-large-text") === "1");
  document.querySelectorAll("[data-text-toggle]").forEach(b => {
    b.addEventListener("click", () => {
      const on = !html.classList.contains("large-text");
      setLarge(on);
      store("cv-large-text", on ? "1" : "0");
    });
  });

  // ---- Toast (visual message — no sound needed) ----
  let toastEl, toastTimer;
  window.cvToast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  const d = window.CV_DIRECTORY ? window.CV_DIRECTORY.LAST_VERIFIED : "";
  document.querySelectorAll("[data-last-verified]").forEach(el => { el.textContent = d; });
})();
