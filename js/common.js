/* Shared bits for every page: larger-text toggle and "last verified" date. */
(function () {
  const KEY = "cv-large-text";
  const html = document.documentElement;

  function apply(on) {
    html.classList.toggle("large-text", on);
    document.querySelectorAll("[data-text-toggle]").forEach(b => {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "A− Normal text" : "A+ Larger text";
    });
  }

  // Only the text-size choice is remembered, and only for this browser tab.
  let saved = false;
  try { saved = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  apply(saved);

  document.querySelectorAll("[data-text-toggle]").forEach(b => {
    b.addEventListener("click", () => {
      const on = !html.classList.contains("large-text");
      apply(on);
      try { sessionStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    });
  });

  const d = window.CV_DIRECTORY ? window.CV_DIRECTORY.LAST_VERIFIED : "";
  document.querySelectorAll("[data-last-verified]").forEach(el => { el.textContent = d; });
})();
