(() => {
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) return;

  const track = document.getElementById("carouselTrack");
  const dotsWrap = document.getElementById("carouselDots");
  const prevBtn = document.getElementById("carouselPrev");
  const nextBtn = document.getElementById("carouselNext");
  const slides = PRODUCTS.slice(0, 5);

  slides.forEach((item, idx) => {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.name;
    slide.appendChild(img);

    const caption = document.createElement("div");
    caption.className = "slide-caption";
    caption.innerHTML = `<strong>${item.name}</strong><br>${item.description}`;
    slide.appendChild(caption);
    track?.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
    dotsWrap?.appendChild(dot);
  });

  let index = 0;
  const total = slides.length;
  const update = () => {
    if (!track) return;
    track.style.transform = `translateX(-${index * 100}%)`;
    const dots = dotsWrap?.querySelectorAll(".dot") || [];
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  };

  const goTo = (i) => {
    index = (i + total) % total;
    update();
  };

  const resetTimer = () => {
    clearInterval(timer);
    timer = setInterval(() => goTo(index + 1), 4000);
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    resetTimer();
  });
  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    resetTimer();
  });
  dotsWrap?.querySelectorAll(".dot").forEach((dot, i) => {
    dot.addEventListener("click", () => {
      goTo(i);
      resetTimer();
    });
  });

  update();
  let timer = setInterval(() => goTo(index + 1), 4000);

  // Pause on hover
  track?.addEventListener("mouseenter", () => clearInterval(timer));
  track?.addEventListener("mouseleave", resetTimer);
})();

