import { getAllProducts } from "./products-service.js";
import { waitForFirebaseReady } from "./auth-utils.js";

(() => {
  const greetingEl = document.getElementById("greeting");
  const recentCountEl = document.getElementById("recentCount");
  const suggestionsCountEl = document.getElementById("suggestionsCount");
  const ordersListEl = document.getElementById("ordersList");
  const suggestionsListEl = document.getElementById("suggestionsList");
  const productsGridEl = document.getElementById("productsGrid");
  const refreshOrdersBtn = document.getElementById("refreshOrders");

  const orderModal = document.getElementById("orderModal");
  const orderModalClose = document.getElementById("orderModalClose");
  const orderModalTitle = document.getElementById("orderModalTitle");
  const orderModalDesc = document.getElementById("orderModalDesc");
  const orderForm = document.getElementById("orderForm");
  const orderQuantity = document.getElementById("orderQuantity");
  const orderMessage = document.getElementById("orderMessage");

  let currentUser = null;
  let selectedProduct = null;
  let productsCache = [];

  const showOrderMessage = (msg, type = "error") => {
    if (!orderMessage) return;
    orderMessage.textContent = msg;
    orderMessage.className = `auth-message ${type}`;
    orderMessage.style.display = "block";
  };

  const clearOrderMessage = () => {
    if (!orderMessage) return;
    orderMessage.textContent = "";
    orderMessage.className = "auth-message";
    orderMessage.style.display = "none";
  };

  const greet = (userDoc) => {
    const firstName =
      userDoc?.firstName ||
      (userDoc?.displayName ? userDoc.displayName.split(" ")[0] : null) ||
      (currentUser?.displayName ? currentUser.displayName.split(" ")[0] : null) ||
      "there";
    greetingEl.textContent = `Hi, ${firstName}!`;
  };

  const renderProducts = (items) => {
    if (!productsGridEl) return;
    productsGridEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    items.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card order-card";

      const img = document.createElement("img");
      img.src = p.imageUrl || p.image;
      img.alt = p.name;
      card.appendChild(img);

      const body = document.createElement("div");
      body.className = "product-body";
      body.innerHTML = `<h3>${p.name}</h3><p class="muted">$${(p.price || 0).toFixed(2)}</p><p>${p.description || ""}</p>`;

      const btn = document.createElement("button");
      btn.className = "btn primary full";
      btn.textContent = "Order";
      btn.addEventListener("click", () => openOrderModal(p));

      body.appendChild(btn);
      card.appendChild(body);
      frag.appendChild(card);
    });
    productsGridEl.appendChild(frag);
  };

  const renderOrders = (orders) => {
    if (!ordersListEl) return;
    if (!orders.length) {
      ordersListEl.textContent = "No orders yet.";
      recentCountEl.textContent = "0";
      return;
    }
    recentCountEl.textContent = String(orders.length);
    ordersListEl.innerHTML = "";
    const list = document.createElement("div");
    list.className = "list-stack";
    orders.forEach((order) => {
      const item = document.createElement("div");
      item.className = "order-row";
      const dateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "—";
      item.innerHTML = `
        <div>
          <strong>${order.productName}</strong>
          <div class="muted">Qty ${order.quantity} • $${(order.price || 0).toFixed(2)}</div>
        </div>
        <div class="order-meta">
          <span class="badge">${order.status || "pending"}</span>
          <span class="muted">${dateStr}</span>
        </div>`;
      list.appendChild(item);
    });
    ordersListEl.appendChild(list);
  };

  const renderSuggestions = (orders, products) => {
    if (!suggestionsListEl) return;
    let topProducts = [];
    if (orders.length) {
      const counts = {};
      orders.forEach((o) => {
        counts[o.productId] = (counts[o.productId] || 0) + o.quantity;
      });
      topProducts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([productId]) => products.find((p) => p.id === productId))
        .filter(Boolean)
        .slice(0, 3);
    }
    if (!topProducts.length) {
      topProducts = products.slice(0, 3);
    }
    suggestionsCountEl.textContent = String(topProducts.length);
    suggestionsListEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    topProducts.forEach((p) => {
      const card = document.createElement("article");
      card.className = "suggest-card";
      card.innerHTML = `
        <img src="${p.imageUrl || p.image}" alt="${p.name}">
        <div>
          <h4>${p.name}</h4>
          <p class="muted">$${(p.price || 0).toFixed(2)}</p>
        </div>
      `;
      card.addEventListener("click", () => openOrderModal(p));
      frag.appendChild(card);
    });
    suggestionsListEl.appendChild(frag);
  };

  const openOrderModal = (product) => {
    selectedProduct = product;
    orderModalTitle.textContent = `Order ${product.name}`;
    orderModalDesc.textContent = `$${(product.price || 0).toFixed(2)} • ${product.description || ""}`;
    orderQuantity.value = "1";
    clearOrderMessage();
    orderModal.classList.remove("hidden");
  };

  const closeOrderModal = () => {
    orderModal.classList.add("hidden");
    selectedProduct = null;
    clearOrderMessage();
  };

  const fetchUserDoc = async (uid) => {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    const ref = doc(window.firebaseDb, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  };

  const loadOrders = async () => {
    if (!currentUser) return;
    ordersListEl.textContent = "Loading orders...";
    try {
      const { collection, getDocs, orderBy, limit, query } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      const q = query(
        collection(window.firebaseDb, "users", currentUser.uid, "orders"),
        orderBy("createdAt", "desc"),
        limit(5)
      );
      const snap = await getDocs(q);
      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderOrders(orders);
      renderSuggestions(orders, productsCache);
    } catch (err) {
      console.error("Load orders error:", err);
      ordersListEl.textContent = "Could not load orders.";
    }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    clearOrderMessage();
    if (!selectedProduct) {
      showOrderMessage("Select a product first.");
      return;
    }
    if (!currentUser) {
      showOrderMessage("You must be signed in to place an order.");
      return;
    }
    const qty = parseInt(orderQuantity.value, 10);
    if (!qty || qty < 1) {
      showOrderMessage("Quantity must be at least 1.");
      return;
    }
    try {
      await waitForFirebaseReady();
      const { addDoc, collection, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
      );
      await addDoc(collection(window.firebaseDb, "users", currentUser.uid, "orders"), {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        price: selectedProduct.price,
        quantity: qty,
        uid: currentUser.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      showOrderMessage("Order submitted! We'll confirm soon.", "success");
      await loadOrders();
      setTimeout(closeOrderModal, 1200);
    } catch (err) {
      console.error("Order submit error:", err);
      showOrderMessage(err.message || "Could not submit order. Try again.");
    }
  };

  const initAuth = async () => {
    await waitForFirebaseReady();
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    onAuthStateChanged(window.firebaseAuth, async (user) => {
      if (!user) {
        window.location.href = "auth.html";
        return;
      }
      currentUser = user;
      const userDoc = await fetchUserDoc(user.uid).catch(() => null);
      greet(userDoc);
      try {
        productsCache = await getAllProducts(window.firebaseDb);
      } catch (e) {
        if (Array.isArray(window.PRODUCTS)) productsCache = window.PRODUCTS;
      }
      renderProducts(productsCache);
      loadOrders();
    });
  };

  orderModalClose?.addEventListener("click", closeOrderModal);
  orderModal?.addEventListener("click", (e) => {
    if (e.target === orderModal) closeOrderModal();
  });
  orderForm?.addEventListener("submit", submitOrder);
  refreshOrdersBtn?.addEventListener("click", loadOrders);

  initAuth().catch((err) => {
    console.error("Dashboard init error:", err);
    if (ordersListEl) ordersListEl.textContent = "Could not initialize dashboard.";
  });
})();

