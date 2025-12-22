(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
})();

// Simple nav highlight safeguard (in case active class missing)
(() => {
  const links = [...document.querySelectorAll(".nav-link")];
  const path = window.location.pathname.split("/").pop() || "index.html";
  links.forEach((link) => {
    if (link.getAttribute("href") === path && !link.classList.contains("active")) {
      link.classList.add("active");
    }
  });
})();

