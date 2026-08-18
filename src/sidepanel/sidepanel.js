const BASE    = '../../static/Pants/';
const stage   = document.getElementById('stage');
const pants   = document.getElementById('pants');
const cush    = document.getElementById('cush');
const entrance = document.getElementById('entrance');
const l7  = pants.querySelector('.l7');
const l8  = pants.querySelector('.l8');
const l9  = pants.querySelector('.l9');
const l10 = pants.querySelector('.l10');
const l11 = pants.querySelector('.l11');

// ── timing ───────────────────────────────────────────────────────────────────

const HOLD_MS     = 10000;
const FRAME_COUNT = 30;
const FRAME_MS    = 1500 / FRAME_COUNT;

const CUSH_FRAME_MS = 80;  // ~12fps for cushion appear
const DOOR_FRAME_MS = 42;  // ~24fps for entrance door

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

const CUSH_FRAMES = Array.from({ length: 10 }, (_, i) =>
  `${BASE}Accessories/Cushion appear/cush_appear_${i}.png`);

const ENTRANCE_FRAMES = Array.from({ length: 38 }, (_, i) =>
  `${BASE}Accessories/Entrance_appear/entrance_door${String(i).padStart(2, '0')}.png`);

// ── helpers ──────────────────────────────────────────────────────────────────

const SLEEP_PCT = 70 / 530 * 100;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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

function cycle() {
  setAwake();
  setTimeout(() => runTransition(TRANS, () => {
    setAsleep();
    setTimeout(() => runTransition(TRANS_REV, cycle), HOLD_MS);
  }, true), HOLD_MS);
}

// ── entrance sequence ────────────────────────────────────────────────────────

function runEntrance() {
  stage.hidden = false;

  // Phase 1: cushion appear (10 frames, ~800ms)
  playFrames(cush, CUSH_FRAMES, CUSH_FRAME_MS, () => {
    cush.style.backgroundImage = ''; // CSS cushion_base.png takes over

    // Phase 2: entrance door sequence (38 frames, ~1.6s)
    playFrames(entrance, ENTRANCE_FRAMES, DOOR_FRAME_MS, () => {
      entrance.style.transition = 'opacity 0.35s';
      entrance.style.opacity    = '0';
      setTimeout(() => { entrance.style.display = 'none'; }, 350);
      setTimeout(() => {
        cycle();
        pants.addEventListener('click', flickEars);
      }, 200);
    });

    // Phase 2b: cat slides in 300ms after door starts
    setTimeout(() => pants.classList.add('entering'), 300);
  });
}

// ── init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get({ edition: 'simple' }, ({ edition }) => {
  if (edition !== 'deluxe') {
    document.getElementById('simple-notice').hidden = false;
    return;
  }
  runEntrance();
});
