'use strict';
// Resolve Yandex's temporary download URL at click time, never store an expiring URL.
for (const link of document.querySelectorAll('[data-yandex]')) {
  link.addEventListener('click', async event => {
    // Preserve browser conventions for opening the original source in another tab.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (link.getAttribute('aria-busy') === 'true') return;
    const label = link.querySelector('span');
    const feedback = link.parentElement.querySelector('.download-message');
    const source = link.dataset.yandex;
    link.setAttribute('aria-busy', 'true');
    label.textContent = 'Preparing…';
    feedback.replaceChildren();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=' + encodeURIComponent(source), { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('Download unavailable');
      const result = await response.json();
      const url = new URL(result.href);
      if (url.protocol !== 'https:' || !/(^|\.)yandex\.(net|ru|com)$/.test(url.hostname)) throw new Error('Invalid download URL');
      feedback.textContent = 'Your download is starting.';
      window.location.assign(url.href);
    } catch {
      feedback.append('Direct download is unavailable. ');
      const fallback = document.createElement('a');
      fallback.href = source;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.textContent = 'Download on Yandex Disk';
      feedback.append(fallback);
    } finally {
      clearTimeout(timeout);
      link.removeAttribute('aria-busy');
      label.textContent = 'Download';
    }
  });
}
