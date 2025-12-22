import { getAllProducts } from "./products-service.js";
import { waitForFirebaseReady } from "./auth-utils.js";

(async () => {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const render = (items) => {
    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const img = document.createElement("img");
      img.src = item.imageUrl || item.image;
      img.alt = item.name;
      card.appendChild(img);

      const body = document.createElement("div");
      body.className = "product-body";
      body.innerHTML = `<h3>${item.name}</h3><p>${item.description || ""}</p><p class="muted">$${(item.price || 0).toFixed(2)}</p>`;

      if (Array.isArray(item.tags) && item.tags.length) {
        const tags = document.createElement("div");
        tags.className = "product-tags";
        item.tags.forEach((tag) => {
          const t = document.createElement("span");
          t.className = "tag";
          t.textContent = tag;
          tags.appendChild(t);
        });
        body.appendChild(tags);
      }

      card.appendChild(body);
      fragment.appendChild(card);
    });
    grid.appendChild(fragment);
  };

  let items = [];
  try {
    await waitForFirebaseReady();
    items = await getAllProducts(window.firebaseDb);
  } catch (e) {
    if (Array.isArray(window.PRODUCTS)) {
      items = window.PRODUCTS;
    }
  }
  render(items);
})();
