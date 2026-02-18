import { requireAdmin } from "./auth-utils.js";
import { getAllProducts, addProduct, updateProduct, deleteProduct } from "./products-service.js";

(async function () {
  const { user, userDoc } = await requireAdmin();
  const db = window.firebaseDb;

  // --- UI Elements ---
  const greetingEl = document.getElementById("adminGreeting");
  const ordersCountEl = document.getElementById("adminOrdersCount");
  const clientsCountEl = document.getElementById("adminClientsCount");
  const ordersListEl = document.getElementById("adminOrdersList");
  const clientsListEl = document.getElementById("adminClientsList");

  // Logout Logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const auth = window.firebaseAuth || getAuth();
        await signOut(auth);
        window.location.href = "login.html";
      } catch (err) {
        console.error("Logout failed", err);
        alert("Logout failed: " + err.message);
      }
    });
  }

  // Edit Modal Elements
  const editModal = document.getElementById("editProductModal");
  const editModalClose = document.getElementById("editProductModalClose");
  const editForm = document.getElementById("editProductForm");

  if (greetingEl) {
    const first = userDoc?.firstName || user.displayName?.split(" ")[0] || "Admin";
    greetingEl.textContent = `Welcome, ${first}`;
  }

  // --- View Switching ---
  const viewSections = document.querySelectorAll(".admin-view");
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-view");

      // Toggle visibility
      viewSections.forEach((sec) => {
        const isMatch = sec.id.toLowerCase().includes(target);
        sec.classList.toggle("hidden", !isMatch);
      });

      // Load data based on view
      if (target === "orders") loadOrders();
      if (target === "clients") loadClients();
      if (target === "edit") loadProductsForEdit();
      if (target === "delete") loadProductsForDelete();
    });
  });

  // --- Data Loading Functions ---

  async function loadOrders() {
    if (!ordersListEl) return;
    ordersListEl.innerHTML = '<div class="muted">Loading orders...</div>';
    try {
      const { collectionGroup, getDocs, orderBy, query } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      // querying collectionGroup "orders" requires an index on createdAt desc
      const q = query(collectionGroup(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      ordersCountEl.textContent = String(orders.length);

      if (!orders.length) {
        ordersListEl.innerHTML = '<div class="muted">No orders found.</div>';
        return;
      }

      const list = document.createElement("div");
      list.className = "list-stack";
      orders.forEach((o) => {
        const row = document.createElement("div");
        row.className = "order-row";
        const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : "—";
        const statusClass = o.status === 'completed' ? 'success' : (o.status === 'cancelled' ? 'error' : 'warning');

        row.innerHTML = `
          <div class="order-info">
            <strong>${o.productName}</strong>
            <div class="muted">Qty ${o.quantity} • $${(o.price || 0).toFixed(2)}</div>
            <div class="muted small">User: ${o.uid || "Unknown"}</div>
            <div class="muted small">ID: ${o.id}</div>
          </div>
          <div class="order-meta">
            <span class="badge ${statusClass}">${o.status || "pending"}</span>
            <span class="muted small">${dateStr}</span>
          </div>`;
        list.appendChild(row);
      });
      ordersListEl.innerHTML = "";
      ordersListEl.appendChild(list);
    } catch (err) {
      console.error("Admin loadOrders error", err);
      if (err.code === 'failed-precondition') {
        ordersListEl.innerHTML = `
           <div class="auth-message error">
             <strong>Missing Index</strong><br>
             This query requires a Firestore Index.<br>
             <a href="https://console.firebase.google.com/project/${window.firebaseConfig?.projectId || '_'}/firestore/indexes" target="_blank" style="text-decoration: underline;">Open Console to Create Index</a>
             <br><small>Look for the link in the console error log for the direct creation URL.</small>
           </div>`;
      } else {
        ordersListEl.innerHTML = `<div class="auth-message error">Failed to load orders: ${err.message}</div>`;
      }
    }
  }

  async function loadClients() {
    if (!clientsListEl) return;
    clientsListEl.innerHTML = '<div class="muted">Loading clients...</div>';
    try {
      const { collection, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      clientsCountEl.textContent = String(users.length);

      if (!users.length) {
        clientsListEl.innerHTML = '<div class="muted">No clients found.</div>';
        return;
      }

      const list = document.createElement("div");
      list.className = "list-stack";
      users.forEach((u) => {
        const row = document.createElement("div");
        row.className = "order-row";
        row.innerHTML = `
          <div class="client-info">
            <strong>${u.displayName || u.firstName || "No Name"}</strong>
            <div class="muted">${u.email || "No Email"}</div>
            <div class="muted small">${u.phone || "No Phone"}</div>
            <div class="muted small">UID: ${u.uid}</div>
          </div>
          <div class="order-meta">
            <span class="badge ${u.role === 'admin' ? 'success' : ''}">${u.role || "user"}</span>
          </div>`;
        list.appendChild(row);
      });
      clientsListEl.innerHTML = "";
      clientsListEl.appendChild(list);
    } catch (err) {
      console.error("Admin loadClients error", err);
      clientsListEl.innerHTML = `<div class="auth-message error">Failed to load clients: ${err.message}</div>`;
    }
  }

  // --- Product Management ---

  async function loadProductsForEdit() {
    const container = document.getElementById("adminEditProducts");
    if (!container) return;
    container.innerHTML = '<div class="muted">Loading products...</div>';
    try {
      const products = await getAllProducts(db);
      container.innerHTML = "";

      if (products.length === 0) {
        container.innerHTML = '<div class="muted">No products found.</div>';
        return;
      }

      products.forEach((p) => {
        const card = document.createElement("article");
        card.className = "product-card order-card";
        // Prompt to click image
        card.innerHTML = `
          <img src="${p.imageUrl}" alt="${p.name}" style="cursor: pointer;" title="Click image to edit">
          <div class="product-body">
            <h3>${p.name}</h3>
            <p class="muted">$${(p.price || 0).toFixed(2)}</p>
            <p class="muted small">Click image to edit</p>
          </div>`;

        // Image click triggers edit modal
        const img = card.querySelector("img");
        img.addEventListener("click", () => openEditModal(p));

        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = `<div class="auth-message error">Failed to load products: ${err.message}</div>`;
    }
  }

  function openEditModal(product) {
    if (!editModal || !editForm) return;

    // Populate form
    editForm.querySelector('[name="id"]').value = product.id;
    editForm.querySelector('[name="name"]').value = product.name;
    editForm.querySelector('[name="description"]').value = product.description || "";
    editForm.querySelector('[name="price"]').value = product.price;
    editForm.querySelector('[name="imageUrl"]').value = product.imageUrl || "";

    editModal.classList.remove("hidden");
  }

  if (editModalClose) {
    editModalClose.addEventListener("click", () => {
      editModal.classList.add("hidden");
    });
  }

  // Close on outside click
  window.addEventListener("click", (e) => {
    if (e.target === editModal) {
      editModal.classList.add("hidden");
    }
  });

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const id = formData.get("id");
      const name = formData.get("name");
      const description = formData.get("description");
      const price = parseFloat(formData.get("price"));
      const imageUrl = formData.get("imageUrl");

      try {
        await updateProduct(db, id, { name, description, price, imageUrl });
        alert("Product updated successfully!");
        editModal.classList.add("hidden");
        loadProductsForEdit(); // Refresh list
      } catch (err) {
        alert("Update failed: " + err.message);
      }
    });
  }

  async function loadProductsForDelete() {
    const container = document.getElementById("adminDeleteProducts");
    if (!container) return;
    container.innerHTML = '<div class="muted">Loading products...</div>';

    try {
      const products = await getAllProducts(db);
      container.innerHTML = "";

      if (products.length === 0) {
        container.innerHTML = '<div class="muted">No products found.</div>';
        return;
      }

      products.forEach((p) => {
        const card = document.createElement("article");
        card.className = "product-card order-card";
        card.innerHTML = `
          <img src="${p.imageUrl}" alt="${p.name}" style="cursor: pointer;" title="Click to delete">
          <div class="product-body">
            <h3>${p.name}</h3>
            <p class="muted small">Click image to delete</p>
          </div>`;

        card.querySelector("img").addEventListener("click", async () => {
          const first = confirm(`Are you sure you want to delete "${p.name}"?`);
          if (!first) return;
          const second = confirm(`This CANNOT be undone. Really delete "${p.name}"?`);
          if (!second) return;
          try {
            await deleteProduct(db, p.id);
            alert("Product deleted.");
            loadProductsForDelete();
          } catch (err) {
            alert("Delete failed: " + err.message);
          }
        });
        container.appendChild(card);
      });
    } catch (err) {
      container.innerHTML = `<div class="auth-message error">Failed to load products: ${err.message}</div>`;
    }
  }

  // --- Add Product Form ---
  const addForm = document.getElementById("adminAddForm");
  const addMsg = document.getElementById("adminAddMessage");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      addMsg.textContent = "";
      const formData = new FormData(addForm);
      const name = formData.get("name")?.trim();
      const description = formData.get("description")?.trim();
      const price = parseFloat(formData.get("price"));
      const tagsStr = formData.get("tags")?.trim() || "";
      const imageUrl = formData.get("imageUrl")?.trim();
      const tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
      if (!name || !description || !imageUrl || isNaN(price)) {
        addMsg.textContent = "Please fill in all required fields.";
        addMsg.className = "auth-message error";
        addMsg.style.display = "block";
        return;
      }
      try {
        await addProduct(db, { name, description, price, tags, imageUrl });
        addMsg.textContent = "Product created!";
        addMsg.className = "auth-message success";
        addMsg.style.display = "block";
        addForm.reset();
        // Refresh other views if they are open (rare, but good practice)
        // We really only need to reload if user switches to Edit/Delete view, which happens on click anyway.
      } catch (err) {
        addMsg.textContent = err.message || "Failed to create product.";
        addMsg.className = "auth-message error";
        addMsg.style.display = "block";
      }
    });
  }

  // --- Product Seeding ---
  const seedBtn = document.getElementById("adminSeedBtn");
  if (seedBtn) {
    seedBtn.addEventListener("click", async () => {
      const confirmSeed = confirm("This will upload products from the local data file to the database. Continue?");
      if (!confirmSeed) return;

      if (!window.PRODUCTS || !window.PRODUCTS.length) {
        alert("No local product data found in window.PRODUCTS!");
        return;
      }

      seedBtn.textContent = "Seeding...";
      seedBtn.disabled = true;

      try {
        let count = 0;
        for (const p of window.PRODUCTS) {
          // check if exists first? strict dedupe might be too slow for now, let's just add.
          // Actually, better to use setDoc with a predictable ID if possible, but our PRODUCTS have "id".
          // Let's use that ID to prevent duplicates.
          const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
          await setDoc(doc(db, "products", p.id), {
            name: p.name,
            description: p.description,
            price: p.price,
            imageUrl: p.image, // map 'image' to 'imageUrl'
            tags: p.tags || [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          count++;
        }
        alert(`Successfully seeded ${count} products! Refreshing...`);
        loadProductsForEdit();
      } catch (err) {
        console.error("Seed error:", err);
        alert("Seeding failed: " + err.message);
      } finally {
        seedBtn.textContent = "Restock / Seed Products";
        seedBtn.disabled = false;
      }
    });
  }

  // Initial Load (Orders is default)
  loadOrders();
})();
