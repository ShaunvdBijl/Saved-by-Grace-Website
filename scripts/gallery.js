(() => {
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) return;

  const track = document.getElementById("pageCarouselTrack");
  const dotsWrap = document.getElementById("pageCarouselDots");
  const prevBtn = document.getElementById("pageCarouselPrev");
  const nextBtn = document.getElementById("pageCarouselNext");
  if (!track || !dotsWrap) return;

  PRODUCTS.forEach((item, idx) => {
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
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "dot";
    dot.setAttribute("aria-label", `Go to slide ${idx + 1}`);
    dotsWrap.appendChild(dot);
  });

  let index = 0;
  const total = PRODUCTS.length;
  const goTo = (i) => {
    index = (i + total) % total;
    track.style.transform = `translateX(-${index * 100}%)`;
    dotsWrap.querySelectorAll(".dot").forEach((dot, dotIdx) => {
      dot.classList.toggle("active", dotIdx === index);
    });
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
  dotsWrap.querySelectorAll(".dot").forEach((dot, dotIdx) => {
    dot.addEventListener("click", () => {
      goTo(dotIdx);
      resetTimer();
    });
  });

  goTo(0);
  let timer = setInterval(() => goTo(index + 1), 4000);

  track.addEventListener("mouseenter", () => clearInterval(timer));
  track.addEventListener("mouseleave", resetTimer);
})();

