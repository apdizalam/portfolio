// Dark / light theme toggle (shared by every page).
(function () {
  const root = document.documentElement;
  const current = () => (root.dataset.theme === "light" ? "light" : "dark");

  function sync() {
    const next = current() === "light" ? "Dark" : "Light";
    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      const label = btn.querySelector(".theme-label");
      if (label) label.textContent = next;
      btn.setAttribute("aria-label", "Switch to " + next.toLowerCase() + " theme");
    });
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    const theme = current() === "light" ? "dark" : "light";
    root.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch (err) {}
    sync();
  });

  sync();
})();
