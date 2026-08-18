let pending = false;
document.addEventListener('mousemove', e => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    browser.runtime.sendMessage({
      type: 'gaze',
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    }).catch(() => {});
  });
});
