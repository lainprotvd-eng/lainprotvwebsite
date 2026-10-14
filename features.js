(() => {
  'use strict';
  const sort = document.querySelector('#map-sort');
  if (sort) {
    const collections = document.querySelector('.collections');
    const navigation = document.querySelector('.category-nav');
    const sorted = document.querySelector('#sorted-maps');
    const list = sorted.querySelector('ul');
    // Move the original rows so download handlers, translations and links remain intact.
    const rows = Array.from(collections.querySelectorAll('.map-row')).map((row, index) => ({row, parent:row.parentElement, index}));
    function compareDates(a, b, direction) {
      const first = a.row.dataset.release;
      const second = b.row.dataset.release;
      if (!first && !second) return a.index - b.index;
      if (!first) return 1;
      if (!second) return -1;
      return (first.localeCompare(second) * direction) || a.index - b.index;
    }
    sort.addEventListener('change', () => {
      if (sort.value === 'collection') {
        rows.forEach(({row, parent}) => parent.append(row));
        sorted.hidden = true;
        collections.hidden = false;
        navigation.hidden = false;
        return;
      }
      const direction = sort.value === 'oldest' ? 1 : -1;
      [...rows].sort((a, b) => compareDates(a, b, direction)).forEach(({row}) => list.append(row));
      collections.hidden = true;
      navigation.hidden = true;
      sorted.hidden = false;
    });
  }

  const galleries = Array.from(document.querySelectorAll('.gallery'));
  if (!galleries.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'screenshot-lightbox';
  dialog.setAttribute('aria-label', 'Fullscreen screenshots');
  dialog.innerHTML = '<div class="lightbox-toolbar"><span class="lightbox-count" aria-live="polite"></span><button type="button" class="lightbox-close" aria-label="Close fullscreen view">Close <span aria-hidden="true">×</span></button></div><figure class="lightbox-figure"><img class="lightbox-image" alt=""><figcaption></figcaption></figure><div class="lightbox-controls"><button type="button" class="lightbox-prev" aria-label="Previous screenshot">←</button><button type="button" class="lightbox-next" aria-label="Next screenshot">→</button></div>';
  document.body.append(dialog);
  const fullImage = dialog.querySelector('.lightbox-image');
  const caption = dialog.querySelector('figcaption');
  const count = dialog.querySelector('.lightbox-count');
  let images = [];
  let current = 0;
  let opener;
  let previousOverflow = '';
  function showPhoto(index) {
    current = (index + images.length) % images.length;
    const image = images[current];
    fullImage.src = image.currentSrc || image.src;
    fullImage.alt = image.alt;
    caption.textContent = image.closest('.gallery-slide').dataset.caption || image.alt;
    count.textContent = `${current + 1} / ${images.length}`;
  }
  function close() { dialog.close(); }
  dialog.querySelector('.lightbox-close').addEventListener('click', close);
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => showPhoto(current - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      showPhoto(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    fullImage.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  let touchStart;
  dialog.addEventListener('touchstart', event => {
    touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX, y:event.touches[0].clientY} : null;
  }, {passive:true});
  dialog.addEventListener('touchend', event => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showPhoto(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive:true});
  galleries.forEach(gallery => {
    const photos = Array.from(gallery.querySelectorAll('.gallery-slide:not(.video-slide) > img'));
    photos.forEach((image, index) => {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      image.setAttribute('aria-label', 'Open screenshot fullscreen');
      const open = () => {
        images = photos;
        opener = image;
        previousOverflow = document.documentElement.style.overflow;
        showPhoto(index);
        dialog.showModal();
        document.documentElement.style.overflow = 'hidden';
      };
      image.addEventListener('click', open);
      image.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); open(); }
      });
    });
    const hint = document.createElement('p');
    hint.className = 'gallery-fullscreen-hint';
    hint.textContent = 'Click a screenshot to view it fullscreen.';
    gallery.append(hint);
  });
})();
