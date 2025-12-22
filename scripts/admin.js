import { requireAdmin } from "./auth-utils.js";
import { getAllProducts, addProduct, updateProduct, deleteProduct } from "./products-service.js";

(async function () {
  const { user, userDoc } = await requireAdmin();
  const db = window.firebaseDb;

  const greetingEl = document.getElementById("adminGreeting");
  if (greetingEl) {
    const first = userDoc?.firstName || user.displayName?.split(" ")[0] || "Admin";
    greetingEl.textContent = `Welcome, ${first}`;
  }

  const ordersCountEl = document.getElementById("adminOrdersCount");
  const clientsCountEl = document.getElementById("adminClientsCount");
  const ordersListEl = document.getElementById("adminOrdersList");
  const clientsListEl = document.getElementById("adminClientsList");

  const viewSections = document.querySelectorAll(".admin-view");
  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-view");
      viewSections.forEach((sec) => {
        sec.classList.toggle("hidden", !sec.id.toLowerCase().includes(target));
      });
    });
  });

  async function loadOrders() {
    if (!ordersListEl) return;
    ordersListEl.textContent = "Loading orders...";
    try {
      const { collectionGroup, getDocs, orderBy, query } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      const q = query(collectionGroup(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      ordersCountEl.textContent = String(orders.length);
      if (!orders.length) {
        ordersListEl.textContent = "No orders yet.";
        return;
      }
      const list = document.createElement("div");
      list.className = "list-stack";
      orders.forEach((o) => {
        const row = document.createElement("div");
        row.className = "order-row";
        const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : "—";
        row.innerHTML = `
          <div>
            <strong>${o.productName}</strong>
            <div class="muted">Qty ${o.quantity} • $${(o.price || 0).toFixed(2)}</div>
            <div class="muted">User: ${o.uid || ""}</div>
          </div>
          <div class="order-meta">
            <span class="badge">${o.status || "pending"}</span>
            <span class="muted">${dateStr}</span>
          </div>`;
        list.appendChild(row);
      });
      ordersListEl.innerHTML = "";
      ordersListEl.appendChild(list);
    } catch (err) {
      console.error("Admin loadOrders error", err);
      ordersListEl.textContent = "Failed to load orders.";
    }
  }

  async function loadClients() {
    if (!clientsListEl) return;
    clientsListEl.textContent = "Loading clients...";
    try {
      const { collection, getDocs } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      const snap = await getDocs(collection(db, "users"));
      const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      clientsCountEl.textContent = String(users.length);
      if (!users.length) {
        clientsListEl.textContent = "No clients yet.";
        return;
      }
      const list = document.createElement("div");
      list.className = "list-stack";
      users.forEach((u) => {
        const row = document.createElement("div");
        row.className = "order-row";
        row.innerHTML = `
          <div>
            <strong>${u.displayName || u.firstName || u.email}</strong>
            <div class="muted">${u.email || ""}</div>
            <div class="muted">${u.phone || ""}</div>
          </div>
          <div class="order-meta">
            <span class="badge">${u.role || "user"}</span>
          </div>`;
        list.appendChild(row);
      });
      clientsListEl.innerHTML = "";
      clientsListEl.appendChild(list);
    } catch (err) {
      console.error("Admin loadClients error", err);
      clientsListEl.textContent = "Failed to load clients.";
    }
  }

  async function loadProductsForEdit() {
    const container = document.getElementById("adminEditProducts");
    if (!container) return;
    container.innerHTML = "";
    const products = await getAllProducts(db);
    products.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card order-card";
      card.innerHTML = `
        <img src="${p.imageUrl}" alt="${p.name}">
        <div class="product-body">
          <h3>${p.name}</h3>
          <p class="muted">$${(p.price || 0).toFixed(2)}</p>
          <button class="btn full">Edit</button>
        </div>`;
      card.querySelector("button").addEventListener("click", () => openEditPrompt(p));
      container.appendChild(card);
    });
  }

  function openEditPrompt(product) {
    const name = prompt("Name:", product.name);
    if (name === null) return;
    const priceStr = prompt("Price:", product.price);
    if (priceStr === null) return;
    const description = prompt("Description:", product.description || "");
    if (description === null) return;
    const imageUrl = prompt("Image URL:", product.imageUrl || "");
    if (imageUrl === null) return;
    const price = parseFloat(priceStr);
    updateProduct(db, product.id, { name, price, description, imageUrl })
      .then(loadProductsForEdit)
      .catch((err) => alert("Update failed: " + err.message));
  }

  async function loadProductsForDelete() {
    const container = document.getElementById("adminDeleteProducts");
    if (!container) return;
    container.innerHTML = "";
    const products = await getAllProducts(db);
    products.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card order-card";
      card.innerHTML = `
        <img src="${p.imageUrl}" alt="${p.name}">
        <div class="product-body">
          <h3>${p.name}</h3>
        </div>`;
      card.addEventListener("click", async () => {
        const first = confirm(`Are you sure you want to delete ${p.name}?`);
        if (!first) return;
        const second = confirm(`This cannot be undone. Delete ${p.name}?`);
        if (!second) return;
        try {
          await deleteProduct(db, p.id);
          await loadProductsForDelete();
          await loadProductsForEdit();
        } catch (err) {
          alert("Delete failed: " + err.message);
        }
      });
      container.appendChild(card);
    });
  }

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
        await loadProductsForEdit();
        await loadProductsForDelete();
      } catch (err) {
        addMsg.textContent = err.message || "Failed to create product.";
        addMsg.className = "auth-message error";
        addMsg.style.display = "block";
      }
    });
  }

  loadOrders();
  loadClients();
  loadProductsForEdit();
  loadProductsForDelete();
})();

