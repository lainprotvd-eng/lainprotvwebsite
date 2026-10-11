(() => {
  document.querySelectorAll('.gallery').forEach(gallery => {
    const slides = Array.from(gallery.querySelectorAll('.gallery-slide'));
    const dots = Array.from(gallery.querySelectorAll('.gallery-dot'));
    const counter = gallery.querySelector('.gallery-count');
    let current = 0;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== current;
        slide.setAttribute('aria-label', `Screenshot ${i + 1} of ${slides.length}`);
        if (i === current) slide.querySelector('img').loading = 'eager';
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      counter.textContent = `${current + 1} / ${slides.length}`;
    }
    gallery.querySelector('.prev').addEventListener('click', () => show(current - 1));
    gallery.querySelector('.next').addEventListener('click', () => show(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    gallery.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(current + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let start;
    gallery.addEventListener('touchstart', event => {
      const touch = event.changedTouches[0];
      start = {x: touch.clientX, y: touch.clientY};
    }, {passive: true});
    gallery.addEventListener('touchend', event => {
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
      start = null;
    }, {passive: true});
    gallery.classList.add('enhanced');
    show(0);
  });
})();
