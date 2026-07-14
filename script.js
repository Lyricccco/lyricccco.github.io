document.querySelectorAll('.comparison-viewer').forEach((viewer) => {
  const updateSplit = (event) => {
    const bounds = viewer.getBoundingClientRect();
    const split = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100));
    viewer.style.setProperty('--split', `${split}%`);
  };

  viewer.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'touch') return;
    viewer.classList.add('is-interacting');
    updateSplit(event);
  });
  viewer.addEventListener('pointermove', (event) => {
    if (!viewer.classList.contains('is-interacting')) return;
    updateSplit(event);
  });
  viewer.addEventListener('pointerleave', () => {
    viewer.classList.remove('is-interacting');
    viewer.style.removeProperty('--split');
  });
});
