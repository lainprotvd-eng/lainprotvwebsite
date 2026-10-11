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
        slide.setAttribute('aria-label', `Gallery item ${i + 1} of ${slides.length}`);
        const image = slide.querySelector('img');
        if (i === current && image) image.loading = 'eager';
        if (i !== current && slide.classList.contains('video-slide')) {
          slide.querySelector('.video-player').replaceChildren();
          slide.querySelector('.video-player').hidden = true;
          slide.querySelector('.video-cover').hidden = false;
        }
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
      counter.textContent = `${current + 1} / ${slides.length}`;
      const label = gallery.querySelector('.gallery-label');
      if (label) label.textContent = slides[current].dataset.caption;
    }
    gallery.querySelector('.prev').addEventListener('click', () => show(current - 1));
    gallery.querySelector('.next').addEventListener('click', () => show(current + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    const play = gallery.querySelector('.play-video');
    if (play) play.addEventListener('click', () => {
      const slide = slides[current];
      const player = slide.querySelector('.video-player');
      if (!player) return;
      const frame = document.createElement('iframe');
      const videoId = gallery.dataset.videoId || 'y2V9gzLIcWA';
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
      const startSeconds = Number(gallery.dataset.videoStart || 0);
      const startParameter = Number.isSafeInteger(startSeconds) && startSeconds > 0 ? `&start=${startSeconds}` : '';
      frame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${startParameter}`;
      frame.title = gallery.dataset.videoTitle || 'Ice Scream 1 — video by LainProTV';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      player.replaceChildren(frame);
      player.hidden = false;
      slide.querySelector('.video-cover').hidden = true;
      frame.focus();
    });
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
