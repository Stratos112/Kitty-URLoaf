const BASE        = '../../static/Pants/';
const stage       = document.getElementById('stage');
const debugBtn    = document.getElementById('debugBtn');
const pants       = document.getElementById('pants');
const cush        = document.getElementById('cush');
const cush2       = document.getElementById('cush2');
const entranceBg  = document.getElementById('entrance-bg');
const entranceFg  = document.getElementById('entrance-fg');
const entranceAnim = document.getElementById('entrance-anim');
const l7  = pants.querySelector('.l7');
const l8  = pants.querySelector('.l8');
const l9  = pants.querySelector('.l9');
const l10 = pants.querySelector('.l10');
const l11 = pants.querySelector('.l11');

// ── timing ───────────────────────────────────────────────────────────────────

const HOLD_MS           = 20000;
const TRANS_DURATION_MS = 1500;
const CUSH_FRAME_MS     = 90;    // 11 × 90 ≈ 1s
const CUSH_FADE_MS   = 60;
const CUSH_OVERLAP   = 3;     // door starts this many frames before cushion ends
const DOOR_FRAME_MS  = 14;    // 38 × 14 ≈ 0.5s each way
const CROSSFADE_MS   = 350;
const SLIDE_MS       = 1400;
const BLINK_HOLD_MS  = 4350;  // transparent hold before eyelids close
const BLINK_DUR_MS   = 440;   // 8 frames × 55ms

// ── raw asset paths ──────────────────────────────────────────────────────────

const P = {
  awakeHead: `${BASE}Anim/breath-head.apng`,
  blink:     `${BASE}Anim/blink-overlay.apng`,
  sleepHead: `${BASE}Anim/breath-head-sleep.apng`,
  sleepEyes: `${BASE}Anim/breath-eyes-sleep.apng`,
  entrBg:    `${BASE}Accessories/entrance_door_background.png`,
  entrFg:    `${BASE}Accessories/entrance_door_foreground.png`,
};

const EYE_PATHS = {
  n:  `${BASE}Anim/eyes-n.apng`,
  ne: `${BASE}Anim/eyes-ne.apng`,
  e:  `${BASE}Anim/eyes-e.apng`,
  se: `${BASE}Anim/eyes-se.apng`,
  s:  `${BASE}Anim/eyes-s.apng`,
  sw: `${BASE}Anim/eyes-sw.apng`,
  w:  `${BASE}Anim/eyes-w.apng`,
  nw: `${BASE}Anim/eyes-nw.apng`,
};
const EYE_X_PCT = 0.57;
const EYE_Y_PCT = 0.25;

const CUSH_PATHS  = ['0','1','2','3','4','5','6','7','8','9','9B'].map(n =>
  `${BASE}Accessories/Cushion appear/cush_appear_${n}.png`);

const DOOR_PATHS  = Array.from({ length: 38 }, (_, i) =>
  `${BASE}Accessories/Entrance_appear/entrance_door${String(i).padStart(2, '0')}.png`);
const DOOR_PATHS_REV = [...DOOR_PATHS].reverse();

const CUSH_DURATIONS = [
  ...Array(6).fill(Math.round(CUSH_FRAME_MS * 0.49)),
  ...Array(5).fill(CUSH_FRAME_MS),
];
const DOOR_SLOW_MS         = Math.round(DOOR_FRAME_MS * 2);
const DOOR_OPEN_DURATIONS  = [...Array(33).fill(DOOR_FRAME_MS), ...Array(5).fill(DOOR_SLOW_MS)];
const DOOR_CLOSE_DURATIONS = [...Array(5).fill(DOOR_SLOW_MS),  ...Array(33).fill(DOOR_FRAME_MS)];

const BLINK_STAGES = [
  `${BASE}Head/Eyes/eyes_open.png`,
  `${BASE}Head/Eyes/Blink/eyes_blink_1.png`,
  `${BASE}Head/Eyes/Blink/eyes_blink_2.png`,
  `${BASE}Head/Eyes/Blink/eyes_blink_3.png`,
  `${BASE}Head/Eyes/Blink/eyes_blink_4.png`,
  `${BASE}Head/Eyes/eyes_closed.png`,
];

function inverseEaseInOutCubic(e) {
  return e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2;
}
const EYE_STAGE_TIMES = BLINK_STAGES.slice(1, -1).map((_, i) => {
  const e = (i + 1) / (BLINK_STAGES.length - 1);
  return Math.round(inverseEaseInOutCubic(e) * TRANS_DURATION_MS);
});

const FLICK_SEQ     = ['01', '02', '03', '02', '01'];
const FLICK_MS      = 275 / FLICK_SEQ.length;
const FLICK_L_PATHS = FLICK_SEQ.map(n => `${BASE}Anim/EarFlick/L_${n}.png`);
const FLICK_R_PATHS = FLICK_SEQ.map(n => `${BASE}Anim/EarFlick/R_${n}.png`);

// ── preload ──────────────────────────────────────────────────────────────────
// Hidden <img> elements: reliable onload events + Firefox shares their decoded
// image cache with CSS background-image, so each frame is ready before use.

const ALL_PATHS = [
  ...CUSH_PATHS, ...DOOR_PATHS,
  ...BLINK_STAGES, ...FLICK_L_PATHS, ...FLICK_R_PATHS,
  ...Object.values(EYE_PATHS),
  P.entrBg, P.entrFg, P.sleepHead, P.sleepEyes,
];

const ready = new Promise(resolve => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;overflow:hidden;width:0;height:0;';
  let done = 0;
  ALL_PATHS.forEach(src => {
    const img = document.createElement('img');
    img.onload = img.onerror = () => { if (++done >= ALL_PATHS.length) { wrap.remove(); resolve(); } };
    img.src = src;
    wrap.appendChild(img);
  });
  document.documentElement.appendChild(wrap);
});

// ── helpers ──────────────────────────────────────────────────────────────────

const u = path => `url('${path}')`;

function fade(els, opacity, ms, onDone) {
  els.forEach(el => {
    el.style.transition = `opacity ${ms}ms`;
    el.style.opacity    = String(opacity);
  });
  if (onDone) setTimeout(onDone, ms);
}

let cycleGen  = 0;
let gpuWarmed = false;

// rAF-based frame player — self-cancels when gen no longer matches cycleGen
// ms may be a number or per-frame array
function playFrames(el, paths, ms, gen, onDone) {
  let i = 0, last = 0, curMs = 0;
  function step(now) {
    if (gen !== cycleGen) return;
    if (now - last >= curMs) {
      if (i >= paths.length) { if (onDone) onDone(); return; }
      el.style.backgroundImage = u(paths[i]);
      curMs = Array.isArray(ms) ? (ms[i] ?? ms[ms.length - 1]) : ms;
      i++; last = now;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const SLEEP_PCT = 70 / 530 * 100;

// ── idle cycle ───────────────────────────────────────────────────────────────

let transitioning = false;
let flickTimer    = null;
let gazing        = false;
let gazeTimer     = null;
let blinkTimer    = null;

function startGaze() {
  if (gazeTimer !== null) clearTimeout(gazeTimer);
  gazing    = true;
  gazeTimer = setTimeout(() => {
    gazing    = false;
    gazeTimer = null;
    l8.style.backgroundImage = '';
  }, 7000);
}

function cancelGaze() {
  if (gazeTimer !== null) { clearTimeout(gazeTimer); gazeTimer = null; }
  gazing = false;
}

function dirFromAngle(dx, dy) {
  const deg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5)  return 'e';
  if (deg < 67.5)  return 'se';
  if (deg < 112.5) return 's';
  if (deg < 157.5) return 'sw';
  if (deg < 202.5) return 'w';
  if (deg < 247.5) return 'nw';
  if (deg < 292.5) return 'n';
  return 'ne';
}

function gazeAt(x, y) {
  if (!gazing) return;
  const r   = stage.getBoundingClientRect();
  const dir = dirFromAngle(x - (r.left + r.width * EYE_X_PCT), y - (r.top + r.height * EYE_Y_PCT));
  l8.style.backgroundImage = u(EYE_PATHS[dir]);
}

document.addEventListener('mousemove',  e => gazeAt(e.clientX, e.clientY));
document.addEventListener('mouseleave', () => { if (gazing) l8.style.backgroundImage = ''; });

browser.runtime.onMessage.addListener(msg => {
  if (msg.type !== 'gaze' || !gazing) return;
  // content page is always to the right of sidebar; use y for vertical angle
  const dir = msg.y < 0.35 ? 'ne' : msg.y > 0.65 ? 'se' : 'e';
  l8.style.backgroundImage = u(EYE_PATHS[dir]);
});

function stopBlinkSync() {
  clearTimeout(blinkTimer);
  blinkTimer = null;
  l7.style.visibility = '';
}

function startBlinkSync() {
  stopBlinkSync();
  const cycle = BLINK_HOLD_MS + BLINK_DUR_MS;
  function tick() {
    blinkTimer = setTimeout(() => {
      l7.style.visibility = 'hidden';
      blinkTimer = setTimeout(() => {
        l7.style.visibility = '';
        tick();
      }, BLINK_DUR_MS);
    }, BLINK_HOLD_MS);
  }
  tick();
}

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
  startBlinkSync();
}

function setAsleep() {
  stopBlinkSync();
  cancelGaze();
  pants.classList.add('sleeping');
  l7.style.backgroundImage  = u(P.sleepHead);
  l8.style.backgroundImage  = u(P.sleepEyes);
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = '';
  l11.style.backgroundImage = '';
}

function runTransition(gen, toSleep, onDone) {
  stopBlinkSync();
  cancelGaze();
  cancelFlick();
  transitioning = true;

  const stages  = toSleep ? BLINK_STAGES : [...BLINK_STAGES].reverse();
  const sleepTY = `translateY(${SLEEP_PCT}%)`;

  if (toSleep) {
    l8.style.backgroundImage = u(stages[0]);
  } else {
    // pin all four at sleep position BEFORE removing class to avoid flash
    l7.style.backgroundImage = u(P.awakeHead);
    l7.style.transform       = sleepTY;
    l8.style.backgroundImage = u(stages[0]);
    l8.style.transform       = sleepTY;
    l10.style.transform      = sleepTY;
    l11.style.transform      = sleepTY;
    pants.classList.remove('sleeping');
  }

  l9.style.backgroundImage = 'none';
  void l7.offsetWidth;

  const trans    = `transform ${TRANS_DURATION_MS}ms cubic-bezier(0.37, 0, 0.63, 1)`;
  const targetTY = toSleep ? sleepTY : '';
  [l7, l8, l10, l11].forEach(el => {
    el.style.transition = trans;
    el.style.transform  = targetTY;
  });

  EYE_STAGE_TIMES.forEach((t, i) => {
    setTimeout(() => {
      if (gen !== cycleGen) return;
      l8.style.backgroundImage = u(stages[i + 1]);
    }, t);
  });

  setTimeout(() => {
    if (gen !== cycleGen) return;
    [l7, l8, l10, l11].forEach(el => el.style.transition = '');
    transitioning = false;
    onDone();
    [l7, l8, l10, l11].forEach(el => el.style.transform = '');
  }, TRANS_DURATION_MS);
}

function flickEars() {
  if (!pants.classList.contains('sleeping')) startGaze();
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
    runTransition(gen, true, () => {
      if (gen !== cycleGen) return;
      setAsleep();
      setTimeout(() => {
        if (gen !== cycleGen) return;
        runTransition(gen, false, () => cycle(gen));
      }, HOLD_MS);
    });
  }, HOLD_MS);
}

// ── GPU warmup ───────────────────────────────────────────────────────────────
// <img> preload warms CPU decoded cache but not GPU texture cache.
// Cycling frames on actual elements at near-zero opacity forces GPU uploads.

function gpuWarmup(onDone) {
  stage.style.opacity = '0.001';
  stage.hidden = false;
  entranceAnim.style.transition = 'none';
  entranceAnim.style.opacity    = '1';

  const warmPaths = [...CUSH_PATHS, ...DOOR_PATHS, P.entrBg, P.entrFg];
  let i = 0;
  function step() {
    if (i < CUSH_PATHS.length) {
      cush.style.backgroundImage = u(warmPaths[i]);
    } else {
      entranceAnim.style.backgroundImage = u(warmPaths[i]);
    }
    i++;
    if (i < warmPaths.length) { requestAnimationFrame(step); return; }
    cush.style.backgroundImage         = '';
    entranceAnim.style.backgroundImage = '';
    entranceAnim.style.opacity         = '0';
    stage.hidden        = true;
    stage.style.opacity = '';
    gpuWarmed = true;
    onDone();
  }
  requestAnimationFrame(step);
}

// ── entrance sequence ────────────────────────────────────────────────────────

function playCushWithFade(paths, frameDuration, fadeMs, gen, onDone) {
  let i = 0;
  function step() {
    if (gen !== cycleGen) return;
    if (i >= paths.length) { onDone?.(); return; }
    cush2.style.transition      = 'none';
    cush2.style.opacity         = '0';
    cush2.style.backgroundImage = u(paths[i]);
    const dur = Array.isArray(frameDuration) ? (frameDuration[i] ?? frameDuration[frameDuration.length - 1]) : frameDuration;
    i++;
    void cush2.offsetWidth;
    cush2.style.transition = `opacity ${fadeMs}ms`;
    cush2.style.opacity    = '1';
    setTimeout(() => {
      if (gen !== cycleGen) return;
      cush.style.backgroundImage  = cush2.style.backgroundImage;
      cush2.style.transition      = 'none';
      cush2.style.opacity         = '0';
      step();
    }, dur);
  }
  step();
}

function runEntrance() {
  cycleGen++;
  const gen = cycleGen;
  cancelFlick();
  pants.removeEventListener('click', flickEars);

  cancelGaze();
  stage.style.transition = 'none';
  stage.style.transform  = '';
  if (!gpuWarmed) { gpuWarmup(runEntrance); return; }

  // reset entrance layers
  [entranceBg, entranceFg, entranceAnim].forEach(el => {
    el.style.transition      = 'none';
    el.style.opacity         = '0';
    el.style.backgroundImage = '';
    el.style.zIndex          = '';   // restore CSS z-index
  });
  pants.style.transition      = 'none';
  pants.style.transform       = 'translateX(-110%)';
  cush.style.backgroundImage  = '';
  cush2.style.backgroundImage = '';
  cush2.style.opacity         = '0';
  void pants.offsetWidth;

  stage.hidden    = false;
  debugBtn.hidden = false;

  // 1. Cushion appear (crossfade between frames); clears itself when done
  playCushWithFade(CUSH_PATHS, CUSH_DURATIONS, CUSH_FADE_MS, gen, () => {
    if (gen !== cycleGen) return;
    cush.style.backgroundImage  = '';
    cush2.style.backgroundImage = '';
  });

  // 2. Door opens — starts CUSH_OVERLAP frames before cushion ends
  setTimeout(() => {
    if (gen !== cycleGen) return;
    entranceAnim.style.opacity = '1';
    playFrames(entranceAnim, DOOR_PATHS, DOOR_OPEN_DURATIONS, gen, () => {
      if (gen !== cycleGen) return;

      // 3. Crossfade: anim → static bg + fg
      entranceBg.style.backgroundImage = u(P.entrBg);
      entranceFg.style.backgroundImage = u(P.entrFg);
      fade([entranceBg, entranceFg], 1, CROSSFADE_MS);
      fade([entranceAnim], 0, CROSSFADE_MS, () => {
        if (gen !== cycleGen) return;

        // 4. Hold, then slide cat in (passes BETWEEN bg at z:1 and fg at z:10)
        setTimeout(() => {
          if (gen !== cycleGen) return;
          pants.style.transition = `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          pants.style.transform  = 'translateX(0)';

          // 5. Cat settled → drop anim BELOW cat, crossfade static → closing anim
          setTimeout(() => {
            if (gen !== cycleGen) return;
            entranceAnim.style.zIndex          = '1';
            entranceAnim.style.backgroundImage = u(DOOR_PATHS[DOOR_PATHS.length - 1]);

            fade([entranceBg, entranceFg], 0, CROSSFADE_MS);
            fade([entranceAnim], 1, CROSSFADE_MS, () => {
              if (gen !== cycleGen) return;

              // 6. Door closes (reverse) — below cat
              playFrames(entranceAnim, DOOR_PATHS_REV, DOOR_CLOSE_DURATIONS, gen, () => {
                if (gen !== cycleGen) return;

                // 7. Fade out, shift stage left, begin idle
                fade([entranceAnim], 0, CROSSFADE_MS, () => {
                  if (gen !== cycleGen) return;
                  stage.style.transition = 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)';
                  stage.style.transform  = 'translateX(-10%)';
                  cycle(gen);
                  pants.addEventListener('click', flickEars);
                });
              });
            });
          }, SLIDE_MS + 400);
        }, 300);
      });
    });
  }, CUSH_DURATIONS.slice(0, CUSH_PATHS.length - CUSH_OVERLAP).reduce((a, b) => a + b, 0));
}

// ── init ─────────────────────────────────────────────────────────────────────

debugBtn.addEventListener('click', () => ready.then(runEntrance));

chrome.storage.local.get({ edition: 'simple' }, ({ edition }) => {
  if (edition !== 'deluxe') {
    document.getElementById('simple-notice').hidden = false;
    return;
  }
  ready.then(runEntrance);
});
