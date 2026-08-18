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

const HOLD_MS        = 10000;
const FRAME_COUNT    = 30;
const TRANS_FRAME_MS = 1500 / FRAME_COUNT;
const CUSH_FRAME_MS  = 180;   // 10 × 180 = 1.8s
const DOOR_FRAME_MS  = 200;   // 38 × 200 = 7.6s each way
const CROSSFADE_MS   = 600;
const SLIDE_MS       = 2200;

// ── raw paths (no url() wrapper) ─────────────────────────────────────────────

const P = {
  awakeHead: `${BASE}Anim/breath-head.apng`,
  blink:     `${BASE}Anim/blink-overlay.apng`,
  sleepHead: `${BASE}Anim/breath-head-sleep.apng`,
  sleepEyes: `${BASE}Anim/breath-eyes-sleep.apng`,
  entrBg:    `${BASE}Accessories/entrance_door_background.png`,
  entrFg:    `${BASE}Accessories/entrance_door_foreground.png`,
};

const CUSH_PATHS  = Array.from({ length: 10 }, (_, i) =>
  `${BASE}Accessories/Cushion appear/cush_appear_${i}.png`);

const DOOR_PATHS  = Array.from({ length: 38 }, (_, i) =>
  `${BASE}Accessories/Entrance_appear/entrance_door${String(i).padStart(2, '0')}.png`);
const DOOR_PATHS_REV = [...DOOR_PATHS].reverse();

const TRANS_PATHS = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `${BASE}Anim/Transition/frame-${String(i).padStart(2, '0')}.png`);
const TRANS_PATHS_REV = [...TRANS_PATHS].reverse();

const FLICK_SEQ     = ['01', '02', '03', '02', '01'];
const FLICK_MS      = 275 / FLICK_SEQ.length;
const FLICK_L_PATHS = FLICK_SEQ.map(n => `${BASE}Anim/EarFlick/L_${n}.png`);
const FLICK_R_PATHS = FLICK_SEQ.map(n => `${BASE}Anim/EarFlick/R_${n}.png`);

// ── preload ──────────────────────────────────────────────────────────────────

const readyPromise = Promise.all([
  ...CUSH_PATHS,
  ...DOOR_PATHS,
  ...TRANS_PATHS,
  ...FLICK_L_PATHS,
  ...FLICK_R_PATHS,
  P.entrBg, P.entrFg,
].map(src => new Promise(resolve => {
  const img = new Image();
  img.onload = img.onerror = resolve;
  img.src = src;
})));

// ── helpers ──────────────────────────────────────────────────────────────────

const u = path => `url('${path}')`;

function fade(els, opacity, ms, onDone) {
  els.forEach(el => {
    el.style.transition = `opacity ${ms}ms`;
    el.style.opacity    = String(opacity);
  });
  if (onDone) setTimeout(onDone, ms);
}

function playFrames(el, paths, ms, onDone) {
  let i = 0;
  (function step() {
    if (i >= paths.length) { if (onDone) onDone(); return; }
    el.style.backgroundImage = u(paths[i++]);
    setTimeout(step, ms);
  })();
}

const SLEEP_PCT = 70 / 530 * 100;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  l7.style.backgroundImage  = u(P.awakeHead);
  l8.style.backgroundImage  = '';
  l9.style.backgroundImage  = u(P.blink);
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function setAsleep() {
  pants.classList.add('sleeping');
  l7.style.backgroundImage  = u(P.sleepHead);
  l8.style.backgroundImage  = u(P.sleepEyes);
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function runTransition(paths, onDone, toSleep = false) {
  cancelFlick();
  transitioning = true;
  l8.style.backgroundImage = 'none';
  l9.style.backgroundImage = 'none';
  let i = 0;
  (function step() {
    if (i >= paths.length) {
      l10.style.transform = '';
      l11.style.transform = '';
      transitioning = false;
      onDone();
      return;
    }
    const progress = toSleep ? i / FRAME_COUNT : (FRAME_COUNT - i) / FRAME_COUNT;
    const ty = `translateY(${easeInOutCubic(progress) * SLEEP_PCT}%)`;
    l10.style.transform      = ty;
    l11.style.transform      = ty;
    l7.style.backgroundImage = u(paths[i++]);
    setTimeout(step, TRANS_FRAME_MS);
  })();
}

function flickEars() {
  if (transitioning || flickTimer !== null) return;
  let i = 0;
  (function step() {
    if (i >= FLICK_L_PATHS.length) {
      flickTimer = null;
      l10.style.backgroundImage = '';
      l11.style.backgroundImage = '';
      return;
    }
    l10.style.backgroundImage = u(FLICK_L_PATHS[i]);
    l11.style.backgroundImage = u(FLICK_R_PATHS[i]);
    i++;
    flickTimer = setTimeout(step, FLICK_MS);
  })();
}

function cycle(gen) {
  if (gen !== cycleGen) return;
  setAwake();
  setTimeout(() => {
    if (gen !== cycleGen) return;
    runTransition(TRANS_PATHS, () => {
      if (gen !== cycleGen) return;
      setAsleep();
      setTimeout(() => {
        if (gen !== cycleGen) return;
        runTransition(TRANS_PATHS_REV, () => cycle(gen));
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

  [entranceBg, entranceFg, entranceAnim].forEach(el => {
    el.style.transition      = 'none';
    el.style.opacity         = '0';
    el.style.backgroundImage = '';
  });
  pants.style.transition = 'none';
  pants.style.transform  = 'translateX(-110%)';
  cush.style.backgroundImage = '';
  void pants.offsetWidth;

  stage.hidden    = false;
  debugBtn.hidden = false;

  // 1. Cushion appear
  playFrames(cush, CUSH_PATHS, CUSH_FRAME_MS, () => {
    if (gen !== cycleGen) return;
    cush.style.backgroundImage = '';

    // 2. Door opens (forward)
    entranceAnim.style.opacity = '1';
    playFrames(entranceAnim, DOOR_PATHS, DOOR_FRAME_MS, () => {
      if (gen !== cycleGen) return;

      // 3. Crossfade: anim → static bg + fg
      entranceBg.style.backgroundImage = u(P.entrBg);
      entranceFg.style.backgroundImage = u(P.entrFg);
      fade([entranceBg, entranceFg], 1, CROSSFADE_MS);
      fade([entranceAnim], 0, CROSSFADE_MS, () => {
        if (gen !== cycleGen) return;

        // 4. Hold, then slide cat in
        setTimeout(() => {
          if (gen !== cycleGen) return;
          pants.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          pants.style.transform  = 'translateX(0)';

          // 5. Cat settled → crossfade static → final frame, then door closes
          setTimeout(() => {
            if (gen !== cycleGen) return;
            entranceAnim.style.backgroundImage = u(DOOR_PATHS[DOOR_PATHS.length - 1]);
            fade([entranceBg, entranceFg], 0, CROSSFADE_MS);
            fade([entranceAnim], 1, CROSSFADE_MS, () => {
              if (gen !== cycleGen) return;

              // 6. Door closes (reverse)
              playFrames(entranceAnim, DOOR_PATHS_REV, DOOR_FRAME_MS, () => {
                if (gen !== cycleGen) return;

                // 7. Fade out, begin idle
                fade([entranceAnim], 0, CROSSFADE_MS, () => {
                  if (gen !== cycleGen) return;
                  cycle(gen);
                  pants.addEventListener('click', flickEars);
                });
              });
            });
          }, SLIDE_MS + 400);

        }, 400);
      });
    });
  });
}

// ── init ─────────────────────────────────────────────────────────────────────

debugBtn.addEventListener('click', () => readyPromise.then(runEntrance));

chrome.storage.local.get({ edition: 'simple' }, ({ edition }) => {
  if (edition !== 'deluxe') {
    document.getElementById('simple-notice').hidden = false;
    return;
  }
  readyPromise.then(runEntrance);
});
