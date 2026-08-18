const BASE        = '../../static/Pants/';
const stage       = document.getElementById('stage');
const debugBtn    = document.getElementById('debugBtn');
const pants       = document.getElementById('pants');
const cush        = document.getElementById('cush');
const entranceBg  = document.getElementById('entrance-bg');
const entranceFg  = document.getElementById('entrance-fg');
const entranceAnim = document.getElementById('entrance-anim');
const l7  = pants.querySelector('.l7');
const l8  = pants.querySelector('.l8');
const l9  = pants.querySelector('.l9');
const l10 = pants.querySelector('.l10');
const l11 = pants.querySelector('.l11');

// ── timing ───────────────────────────────────────────────────────────────────

const HOLD_MS       = 10000;
const FRAME_COUNT   = 30;
const FRAME_MS      = 1500 / FRAME_COUNT;
const CUSH_FRAME_MS = 120;   // 10 frames = 1.2s
const DOOR_FRAME_MS = 100;   // 38 frames = 3.8s
const CROSSFADE_MS  = 450;
const SLIDE_MS      = 1500;

// ── asset refs ───────────────────────────────────────────────────────────────

const AWAKE_HEAD = `url('${BASE}Anim/breath-head.apng')`;
const BLINK      = `url('${BASE}Anim/blink-overlay.apng')`;
const SLEEP_HEAD = `url('${BASE}Anim/breath-head-sleep.apng')`;
const SLEEP_EYES = `url('${BASE}Anim/breath-eyes-sleep.apng')`;

const TRANS     = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `url('${BASE}Anim/Transition/frame-${String(i).padStart(2, '0')}.png')`);
const TRANS_REV = [...TRANS].reverse();

const FLICK_SEQ = ['01', '02', '03', '02', '01'];
const FLICK_L   = FLICK_SEQ.map(n => `url('${BASE}Anim/EarFlick/L_${n}.png')`);
const FLICK_R   = FLICK_SEQ.map(n => `url('${BASE}Anim/EarFlick/R_${n}.png')`);
const FLICK_MS  = 275 / FLICK_SEQ.length;

const CUSH_FRAMES     = Array.from({ length: 10 }, (_, i) =>
  `${BASE}Accessories/Cushion appear/cush_appear_${i}.png`);
const ENTRANCE_FRAMES = Array.from({ length: 38 }, (_, i) =>
  `${BASE}Accessories/Entrance_appear/entrance_door${String(i).padStart(2, '0')}.png`);
const ENTRANCE_BG_URL = `url('${BASE}Accessories/entrance_door_background.png')`;
const ENTRANCE_FG_URL = `url('${BASE}Accessories/entrance_door_foreground.png')`;

// ── helpers ──────────────────────────────────────────────────────────────────

const SLEEP_PCT = 70 / 530 * 100;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function fade(els, opacity, ms, onDone) {
  const t = `opacity ${ms}ms`;
  els.forEach(el => { el.style.transition = t; el.style.opacity = String(opacity); });
  if (onDone) setTimeout(onDone, ms);
}

function playFrames(el, frames, ms, onDone) {
  let i = 0;
  (function step() {
    if (i >= frames.length) { if (onDone) onDone(); return; }
    el.style.backgroundImage = `url('${frames[i++]}')`;
    setTimeout(step, ms);
  })();
}

// ── idle cycle ───────────────────────────────────────────────────────────────

let cycleGen      = 0;
let transitioning = false;
let flickTimer    = null;

function cancelFlick() {
  if (flickTimer === null) return;
  clearTimeout(flickTimer);
  flickTimer = null;
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function setAwake() {
  pants.classList.remove('sleeping');
  l7.style.backgroundImage  = AWAKE_HEAD;
  l8.style.backgroundImage  = '';
  l9.style.backgroundImage  = BLINK;
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function setAsleep() {
  pants.classList.add('sleeping');
  l7.style.backgroundImage  = SLEEP_HEAD;
  l8.style.backgroundImage  = SLEEP_EYES;
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function runTransition(frames, onDone, toSleep = false) {
  cancelFlick();
  transitioning = true;
  l8.style.backgroundImage = 'none';
  l9.style.backgroundImage = 'none';
  let i = 0;
  (function step() {
    if (i >= frames.length) {
      l10.style.transform = '';
      l11.style.transform = '';
      transitioning = false;
      onDone();
      return;
    }
    const progress = toSleep ? i / FRAME_COUNT : (FRAME_COUNT - i) / FRAME_COUNT;
    const ty = `translateY(${easeInOutCubic(progress) * SLEEP_PCT}%)`;
    l10.style.transform = ty;
    l11.style.transform = ty;
    l7.style.backgroundImage = frames[i++];
    setTimeout(step, FRAME_MS);
  })();
}

function flickEars() {
  if (transitioning || flickTimer !== null) return;
  let i = 0;
  (function step() {
    if (i >= FLICK_L.length) {
      flickTimer = null;
      l10.style.backgroundImage = '';
      l11.style.backgroundImage = '';
      return;
    }
    l10.style.backgroundImage = FLICK_L[i];
    l11.style.backgroundImage = FLICK_R[i];
    i++;
    flickTimer = setTimeout(step, FLICK_MS);
  })();
}

function cycle(gen) {
  if (gen !== cycleGen) return;
  setAwake();
  setTimeout(() => {
    if (gen !== cycleGen) return;
    runTransition(TRANS, () => {
      if (gen !== cycleGen) return;
      setAsleep();
      setTimeout(() => {
        if (gen !== cycleGen) return;
        runTransition(TRANS_REV, () => cycle(gen));
      }, HOLD_MS);
    }, true);
  }, HOLD_MS);
}

// ── entrance sequence ────────────────────────────────────────────────────────

function runEntrance() {
  cycleGen++;
  const gen = cycleGen;
  cancelFlick();
  pants.removeEventListener('click', flickEars);

  // reset all entrance layers instantly
  [entranceBg, entranceFg, entranceAnim].forEach(el => {
    el.style.transition      = 'none';
    el.style.opacity         = '0';
    el.style.backgroundImage = '';
  });

  // snap cat off-screen left, no transition
  pants.style.transition = 'none';
  pants.style.transform  = 'translateX(-110%)';
  void pants.offsetWidth;

  stage.hidden    = false;
  debugBtn.hidden = false;

  // Phase 1: cushion appear (10 frames × 120ms = 1.2s)
  playFrames(cush, CUSH_FRAMES, CUSH_FRAME_MS, () => {
    if (gen !== cycleGen) return;
    cush.style.backgroundImage = ''; // CSS cushion_base.png takes over

    // Phase 2: door animation (38 frames × 100ms = 3.8s)
    entranceAnim.style.opacity = '1';
    playFrames(entranceAnim, ENTRANCE_FRAMES, DOOR_FRAME_MS, () => {
      if (gen !== cycleGen) return;

      // Phase 3: crossfade animation → static bg + fg
      entranceBg.style.backgroundImage = ENTRANCE_BG_URL;
      entranceFg.style.backgroundImage = ENTRANCE_FG_URL;
      fade([entranceBg, entranceFg], 1, CROSSFADE_MS);
      fade([entranceAnim],           0, CROSSFADE_MS);

      // Phase 4: hold, then slide cat in
      setTimeout(() => {
        if (gen !== cycleGen) return;
        pants.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        pants.style.transform  = 'translateX(0)';

        // Phase 5: after slide — final frame → fade out all
        setTimeout(() => {
          if (gen !== cycleGen) return;

          // show final animation frame on top, replace static assets
          entranceAnim.style.backgroundImage = `url('${ENTRANCE_FRAMES[ENTRANCE_FRAMES.length - 1]}')`;
          fade([entranceAnim], 1, 250, () => {
            if (gen !== cycleGen) return;
            fade([entranceBg], 0, 250);

            // then fade everything out
            setTimeout(() => {
              if (gen !== cycleGen) return;
              fade([entranceFg, entranceAnim], 0, 500, () => {
                if (gen !== cycleGen) return;
                cycle(gen);
                pants.addEventListener('click', flickEars);
              });
            }, 250);
          });

        }, SLIDE_MS + 300);

      }, CROSSFADE_MS + 300);
    });
  });
}

// ── init ─────────────────────────────────────────────────────────────────────

debugBtn.addEventListener('click', runEntrance);

chrome.storage.local.get({ edition: 'simple' }, ({ edition }) => {
  if (edition !== 'deluxe') {
    document.getElementById('simple-notice').hidden = false;
    return;
  }
  runEntrance();
});
