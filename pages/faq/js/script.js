/* script.js */

document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});


document.addEventListener("DOMContentLoaded", function () {
  // toggle each category on click (useful for touch / mobile)
  document.querySelectorAll(".nav-dropdown .category-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const li = btn.parentElement;
      const isOpen = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

      // close siblings so only one subpanel is open at a time (optional)
      Array.from(li.parentElement.children).forEach((sib) => {
        if (sib !== li) {
          sib.classList.remove("open");
          const b = sib.querySelector(".category-btn");
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  // close panels when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-dropdown")) {
      document.querySelectorAll(".nav-dropdown .open").forEach((el) => {
        el.classList.remove("open");
        const b = el.querySelector(".category-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      document
        .querySelectorAll(".nav-dropdown.menu-open")
        .forEach((nd) => nd.classList.remove("menu-open"));
    }
  });

  // pressing Escape closes everything
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".nav-dropdown .open").forEach((el) => {
        el.classList.remove("open");
        const b = el.querySelector(".category-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      document
        .querySelectorAll(".nav-dropdown.menu-open")
        .forEach((nd) => nd.classList.remove("menu-open"));
    }
  });

  // on small screens, clicking the "Choose your model" link toggles the whole menu
  const navModels = document.querySelector(".nav-models");
  const navDropdown = document.querySelector(".nav-dropdown");
  if (navModels && navDropdown) {
    navModels.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width:900px)").matches) {
        e.preventDefault(); // prevent navigation on small screens; keep the link for desktop
        navDropdown.classList.toggle("menu-open");
      }
    });
  }
});

function getSecondLevelDomain(url) {
  try {
    const host = new URL(url).hostname; // e.g. "arxiv.org" or "sub.example.co.uk"
    // remove the final ".something"
    return host.replace(/\.[^.]+$/, ""); // → "arxiv" or "sub.example.co"
  } catch {
    return null;
  }
}


