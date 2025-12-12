(() => {
  const grid = document.getElementById("productsGrid");
  if (!grid || !Array.isArray(PRODUCTS)) return;

  const fragment = document.createDocumentFragment();
  PRODUCTS.forEach((item) => {
    const card = document.createElement("article");
    card.className = "product-card";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    card.appendChild(img);

    const body = document.createElement("div");
    body.className = "product-body";
    body.innerHTML = `<h3>${item.name}</h3><p>${item.description}</p>`;

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
})();



