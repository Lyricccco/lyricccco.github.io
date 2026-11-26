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

document.querySelectorAll('.work-item.tailsteer').forEach((card) => {
  const preview = card.querySelector('.tailsteer-preview');
  const atlas = preview.querySelector('.dance-atlas');
  const button = preview.querySelector('.dance-turn');
  const counter = button.querySelector('span');
  const trajectory = card.querySelector('.trajectory-background');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const atlasURL = atlas.src;
  const columns = 5, rows = 4, frameCount = columns * rows;
  const frameDuration = 250, restingTurn = 10;
  let turn = 1, mode = 'intro';
  let ready = false, loading = false, visible = false, hovering = false, paused = false;
  let animationFrame = null, lastFrameTime = null;

  function renderTurn(next) {
    turn = next;
    if (!ready) return;
    const index = turn - 1;
    const x = -(index % columns) * 100 / columns;
    const y = -Math.floor(index / columns) * 100 / rows;
    atlas.style.transform = `translate3d(${x}%, ${y}%, 0)`;
    atlas.hidden = false;
    counter.textContent = turn;
  }

  function updateButton() {
    const playing = animationFrame !== null;
    button.disabled = loading;
    button.setAttribute('aria-pressed', String(playing));
    if (loading) button.title = 'Loading animation';
    else if (!ready) button.title = 'Retry loading animation';
    else if (playing) button.title = 'Pause on this turn';
    else button.title = mode === 'idle' ? 'Play from Turn 1' : 'Resume playback';
    button.setAttribute('aria-label', `Turn ${counter.textContent}. ${button.title}`);
    preview.classList.toggle('is-playing', playing);
  }

  function stopClock() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
    lastFrameTime = null;
  }

  function rest() {
    mode = 'idle';
    paused = false;
    renderTurn(restingTurn);
    syncPlayback();
  }

  function tick(time) {
    if (lastFrameTime === null) lastFrameTime = time;
    const elapsed = time - lastFrameTime;
    if (elapsed >= frameDuration) {
      // Keep each pose visible for a frame interval, even after a busy frame.
      lastFrameTime = time - elapsed % frameDuration;
      if (turn === frameCount && mode === 'intro') {
        if (!hovering || reducedMotion.matches) return rest();
        mode = 'loop';
      }
      renderTurn(turn % frameCount + 1);
    }
    animationFrame = window.requestAnimationFrame(tick);
  }

  function syncPlayback() {
    const shouldPlay = ready && visible && !document.hidden && !paused && mode !== 'idle';
    if (shouldPlay && animationFrame === null) {
      lastFrameTime = null;
      animationFrame = window.requestAnimationFrame(tick);
    } else if (!shouldPlay) {
      stopClock();
    }
    updateButton();
  }

  function startLoop() {
    mode = 'loop';
    paused = false;
    stopClock();
    renderTurn(1);
    syncPlayback();
  }

  async function loadAtlas() {
    if (ready || loading) return;
    loading = true;
    updateButton();
    // Retry a failed download once. Keep the poster available throughout loading.
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0 || (atlas.complete && !atlas.naturalWidth)) {
        const retryURL = new URL(atlasURL);
        retryURL.searchParams.set('retry', Date.now());
        atlas.src = retryURL.href;
      }
      try {
        await atlas.decode();
        ready = true;
        break;
      } catch {
        atlas.hidden = true;
      }
    }
    loading = false;
    if (ready) renderTurn(turn);
    syncPlayback();
  }

  function applyMotionPreference() {
    if (reducedMotion.matches) {
      trajectory.pauseAnimations();
      trajectory.setCurrentTime(5.5);
      rest();
    } else {
      trajectory.unpauseAnimations();
    }
  }

  button.addEventListener('click', () => {
    if (!ready) {
      mode = 'loop';
      paused = false;
      turn = 1;
      loadAtlas();
    } else if (animationFrame !== null) {
      paused = true;
      syncPlayback();
    } else if (mode === 'idle') {
      startLoop();
    } else {
      paused = false;
      syncPlayback();
    }
  });
  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    if (ready && !reducedMotion.matches && mode !== 'intro') startLoop();
  });
  function leave(event) {
    if (event.pointerType !== 'mouse') return;
    hovering = false;
    if (mode === 'loop') rest();
  }
  card.addEventListener('pointerleave', leave);
  card.addEventListener('pointercancel', leave);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0 }).observe(preview);
  document.addEventListener('visibilitychange', syncPlayback);
  window.addEventListener('pagehide', stopClock);
  window.addEventListener('pageshow', syncPlayback);
  reducedMotion.addEventListener('change', applyMotionPreference);
  applyMotionPreference();
  loadAtlas();
});
