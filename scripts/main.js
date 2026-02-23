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

// Global Auth State Listener
window.addEventListener('firebaseReady', async (e) => {
  const { auth, db } = e.detail;
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Determine user role for correct dashboard route
      let role = "user";
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          role = snap.data().role || "user";
        }
      } catch (err) {
        console.error("Error fetching user role in main.js for nav update:", err);
      }

      const dashboardUrl = role === "admin" ? "admin.html" : "dashboard.html";
      const dashboardText = role === "admin" ? "Admin Dashboard" : "Dashboard";

      // 1. Redirect if currently on an auth page
      const currentPath = window.location.pathname.split("/").pop() || "index.html";
      if (['login.html', 'signup.html', 'auth.html'].includes(currentPath)) {
        window.location.href = dashboardUrl;
        return;
      }

      // 2. Completely replace the navigation bar
      const navContainer = document.querySelector(".nav-bar .nav");
      if (navContainer) {
        if (role === "admin") {
          navContainer.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="admin.html" class="nav-link">Admin Dashboard</a>
            <a href="#" class="nav-link nav-cta" id="globalLogoutBtn">Logout</a>
          `;
        } else {
          navContainer.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="about.html" class="nav-link">About</a>
            <a href="products.html" class="nav-link">Products</a>
            <a href="dashboard.html" class="nav-link">Dashboard</a>
            <a href="#" class="nav-link nav-cta" id="globalLogoutBtn">Logout</a>
          `;
        }

        // Re-apply active class based on current path
        const path = window.location.pathname.split("/").pop() || "index.html";
        const newLinks = [...navContainer.querySelectorAll(".nav-link")];
        newLinks.forEach((link) => {
          link.classList.remove("active");
          if (link.getAttribute("href") === path) {
            link.classList.add("active");
          }
        });

        // Attach global logout listener
        const logoutBtn = document.getElementById("globalLogoutBtn");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
              const { signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
              await signOut(auth);
              window.location.href = "login.html";
            } catch (error) {
              console.error("Logout error:", error);
            }
          });
        }
      }
    }
  });
});

