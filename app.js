/**
 * AMUL KOOL KOKO — 3D SCROLL ANIMATION CONTROLLER
 * Ultra-smooth canvas rendering with progressive preloading & lerp interpolation
 */

(() => {
  'use strict';

  // --- CONFIGURATION ---
  const TOTAL_FRAMES = 235;
  const FRAME_PREFIX = 'frames/ezgif-frame-';
  const FRAME_EXT = '.jpg';
  const LERP_FACTOR = 0.12; // Smooth scroll responsiveness

  // --- DOM REFERENCES ---
  const canvas = document.getElementById('animCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scrollSection = document.querySelector('.scroll-hero-section');
  const preloader = document.getElementById('preloader');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const skipPreloaderBtn = document.getElementById('skipPreloaderBtn');

  const frameScrubber = document.getElementById('frameScrubber');
  const autoplayBtn = document.getElementById('autoplayBtn');
  const audioToggle = document.getElementById('audioToggle');

  const storyCards = document.querySelectorAll('.story-card');
  const siteHeader = document.querySelector('.site-header');

  const orderModal = document.getElementById('orderModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const orderNowNavBtn = document.getElementById('orderNowNavBtn');
  const orderCanBtn = document.getElementById('orderCanBtn');
  const orderForm = document.getElementById('orderForm');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  // --- STATE ---
  const images = new Array(TOTAL_FRAMES + 1);
  let loadedCount = 0;
  let isReady = false;
  let targetFrame = 1;
  let currentFrame = 1;
  let lastRenderedFrame = -1;
  let isAutoplaying = false;
  let autoplayDirection = 1;
  let autoplayTimer = null;
  let isAudioEnabled = false;
  let audioCtx = null;
  let isUserScrubbing = false;

  // --- AUDIO SYNTHESIS (Zero External Assets) ---
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSplashChime(pitch = 440) {
    if (!isAudioEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, audioCtx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // Audio fallback silent
    }
  }

  // --- PROGRESSIVE PRELOADING ---
  function getFrameUrl(index) {
    const padIndex = String(index).padStart(3, '0');
    return `${FRAME_PREFIX}${padIndex}${FRAME_EXT}`;
  }

  function loadSingleImage(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[index] = img;
        loadedCount++;
        onImageLoaded();
        resolve(img);
      };
      img.onerror = () => {
        // Retry or fallback
        loadedCount++;
        onImageLoaded();
        resolve(null);
      };
      img.src = getFrameUrl(index);
    });
  }

  function onImageLoaded() {
    const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
    progressBar.style.width = `${percent}%`;
    progressText.innerText = `${percent}%`;

    // Render initial frame as soon as frame 1 arrives
    if (images[1] && lastRenderedFrame === -1) {
      renderFrame(1);
    }

    // Enable skipping early if user wants
    if (percent > 20 && skipPreloaderBtn.style.display === 'none') {
      skipPreloaderBtn.style.display = 'inline-block';
    }

    if (loadedCount >= TOTAL_FRAMES) {
      finishLoading();
    }
  }

  function finishLoading() {
    if (isReady) return;
    isReady = true;
    setTimeout(() => {
      preloader.classList.add('fade-out');
      // Trigger initial scroll update
      updateScrollTarget();
    }, 400);
  }

  skipPreloaderBtn.addEventListener('click', () => {
    finishLoading();
  });

  async function preloadAllFrames() {
    // 1. Immediately load frame 1 for instant first paint
    await loadSingleImage(1);
    renderFrame(1);

    // 2. Load the remaining frames concurrently in prioritized batches
    const batchSize = 12;
    for (let i = 2; i <= TOTAL_FRAMES; i += batchSize) {
      const batch = [];
      for (let j = i; j < i + batchSize && j <= TOTAL_FRAMES; j++) {
        batch.push(loadSingleImage(j));
      }
      await Promise.all(batch);
    }
  }

  // --- CANVAS RESIZING & HIGH DPI SUPPORT ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Re-render current frame after resize
    if (lastRenderedFrame > 0) {
      const frameToDraw = lastRenderedFrame;
      lastRenderedFrame = -1;
      renderFrame(frameToDraw);
    }
  }

  window.addEventListener('resize', resizeCanvas);

  // --- NEAREST LOADED FRAME LOOKUP ---
  function getClosestLoadedImage(index) {
    if (images[index] && images[index].complete && images[index].naturalWidth > 0) {
      return images[index];
    }
    // Search outwards for closest available frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;
      if (prev >= 1 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return images[prev];
      }
      const next = index + offset;
      if (next <= TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return images[next];
      }
    }
    return null;
  }

  // --- RENDER FUNCTION ---
  function renderFrame(frameNum) {
    if (frameNum === lastRenderedFrame) return;

    const img = getClosestLoadedImage(frameNum);
    if (!img) return;

    const cWidth = canvas.width;
    const cHeight = canvas.height;

    // Background fill to blend smoothly with warm chocolate palette
    ctx.fillStyle = '#170804';
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Calculate smart contain/cover aspect ratio
    const imgWidth = img.naturalWidth || 1920;
    const imgHeight = img.naturalHeight || 1080;

    // Use contain with slight scale adjustment so the can occupies comfortable presence
    const scale = Math.min(cWidth / imgWidth, cHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const drawX = (cWidth - drawWidth) / 2;
    const drawY = (cHeight - drawHeight) / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    lastRenderedFrame = frameNum;

    if (!isUserScrubbing && frameScrubber) {
      frameScrubber.value = frameNum;
    }
  }

  // --- ANIMATION LOOP (LERP PHYSICS) ---
  function animLoop() {
    if (Math.abs(targetFrame - currentFrame) > 0.02) {
      currentFrame += (targetFrame - currentFrame) * LERP_FACTOR;
      const rounded = Math.round(currentFrame);
      renderFrame(Math.max(1, Math.min(TOTAL_FRAMES, rounded)));
    }

    requestAnimationFrame(animLoop);
  }

  // --- SCROLL TARGET CALCULATION ---
  function updateScrollTarget() {
    if (isAutoplaying) return;

    const rect = scrollSection.getBoundingClientRect();
    const scrollHeight = rect.height - window.innerHeight;
    
    // Header shadow on scroll
    if (window.scrollY > 40) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }

    if (scrollHeight <= 0) return;

    // Progress 0.0 to 1.0 within hero scroll section
    const progress = Math.max(0, Math.min(1, -rect.top / scrollHeight));
    targetFrame = Math.round(1 + progress * (TOTAL_FRAMES - 1));

    // Trigger Story Beat Cards
    updateStoryBeats(progress);
  }

  // --- STORY BEATS SCHEDULER ---
  function updateStoryBeats(progress) {
    let activeBeat = 0;

    if (progress >= 0.0 && progress < 0.18) {
      activeBeat = 1;
    } else if (progress >= 0.22 && progress < 0.42) {
      activeBeat = 2;
    } else if (progress >= 0.46 && progress < 0.68) {
      activeBeat = 3;
    } else if (progress >= 0.72 && progress < 0.88) {
      activeBeat = 4;
    } else if (progress >= 0.90) {
      activeBeat = 5;
    }

    storyCards.forEach((card) => {
      const beatNum = parseInt(card.getAttribute('data-beat'), 10);
      if (beatNum === activeBeat) {
        if (!card.classList.contains('active')) {
          card.classList.add('active');
          playSplashChime(300 + beatNum * 80);
        }
      } else {
        card.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateScrollTarget, { passive: true });

  // --- MANUAL SCRUBBER INTERACTION ---
  frameScrubber.addEventListener('mousedown', () => { isUserScrubbing = true; });
  frameScrubber.addEventListener('touchstart', () => { isUserScrubbing = true; }, { passive: true });

  frameScrubber.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    targetFrame = val;
    currentFrame = val;
    renderFrame(val);

    // Sync scroll position to match scrubbed frame
    const rect = scrollSection.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const scrollHeight = rect.height - window.innerHeight;
    const progress = (val - 1) / (TOTAL_FRAMES - 1);
    
    window.scrollTo({
      top: sectionTop + progress * scrollHeight,
      behavior: 'instant'
    });

    updateStoryBeats(progress);
  });

  const stopScrubbing = () => { isUserScrubbing = false; };
  window.addEventListener('mouseup', stopScrubbing);
  window.addEventListener('touchend', stopScrubbing);

  // --- AUTOPLAY 3D ROTATION ---
  function startAutoplay() {
    isAutoplaying = true;
    autoplayBtn.querySelector('.icon-play').style.display = 'none';
    autoplayBtn.querySelector('.icon-pause').style.display = 'inline-block';
    autoplayBtn.querySelector('span').innerText = 'Pause';

    autoplayTimer = setInterval(() => {
      targetFrame += autoplayDirection;
      if (targetFrame >= TOTAL_FRAMES) {
        targetFrame = 1; // Seamless loop
      } else if (targetFrame <= 1) {
        autoplayDirection = 1;
      }

      currentFrame = targetFrame;
      renderFrame(targetFrame);

      // Smoothly sync page scroll to keep narrative cards in sync
      const rect = scrollSection.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const scrollHeight = rect.height - window.innerHeight;
      const progress = (targetFrame - 1) / (TOTAL_FRAMES - 1);
      
      window.scrollTo({
        top: sectionTop + progress * scrollHeight,
        behavior: 'instant'
      });

      updateStoryBeats(progress);
    }, 1000 / 30); // ~30 fps fluid cinematic playback
  }

  function stopAutoplay() {
    isAutoplaying = false;
    clearInterval(autoplayTimer);
    autoplayBtn.querySelector('.icon-play').style.display = 'inline-block';
    autoplayBtn.querySelector('.icon-pause').style.display = 'none';
    autoplayBtn.querySelector('span').innerText = 'Auto Play';
  }

  autoplayBtn.addEventListener('click', () => {
    initAudio();
    if (isAutoplaying) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  // Spacebar toggle autoplay
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isAutoplaying) stopAutoplay();
      else startAutoplay();
    }
  });

  // --- AUDIO TOGGLE ---
  audioToggle.addEventListener('click', () => {
    initAudio();
    isAudioEnabled = !isAudioEnabled;
    
    const iconOn = audioToggle.querySelector('.icon-sound-on');
    const iconOff = audioToggle.querySelector('.icon-sound-off');
    
    if (isAudioEnabled) {
      iconOn.style.display = 'block';
      iconOff.style.display = 'none';
      audioToggle.title = 'Mute Sounds';
      playSplashChime(520);
      showToast('Chill sound effects enabled 🎵');
    } else {
      iconOn.style.display = 'none';
      iconOff.style.display = 'block';
      audioToggle.title = 'Enable Chill Sounds';
    }
  });

  // --- MODAL & ORDER ACTIONS ---
  function openOrderModal() {
    orderModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeOrderModal() {
    orderModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  orderNowNavBtn.addEventListener('click', openOrderModal);
  orderCanBtn.addEventListener('click', openOrderModal);
  closeModalBtn.addEventListener('click', closeOrderModal);

  orderModal.addEventListener('click', (e) => {
    if (e.target === orderModal) closeOrderModal();
  });

  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    closeOrderModal();
    playSplashChime(640);
    showToast('🎉 Order Placed! Chilled Kool Koko is heading your way!');
    orderForm.reset();
  });

  // Add to cart buttons in collection
  document.querySelectorAll('.add-cart-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prodName = btn.getAttribute('data-product');
      playSplashChime(580);
      showToast(`Added ${prodName} to chilled bag!`);
    });
  });

  // --- TOAST NOTIFICATIONS ---
  let toastTimer = null;
  function showToast(msg) {
    clearTimeout(toastTimer);
    toastMessage.innerText = msg;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // --- INITIALIZATION ---
  resizeCanvas();
  preloadAllFrames();
  animLoop();

})();

