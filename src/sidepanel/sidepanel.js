const l7   = document.querySelector('.l7');
const l8   = document.querySelector('.l8');
const l9   = document.querySelector('.l9');
const l10  = document.querySelector('.l10');
const l11  = document.querySelector('.l11');
const pants = document.getElementById('pants');

const HOLD_MS     = 10000;
const FRAME_COUNT = 30;
const FRAME_MS    = 1500 / FRAME_COUNT;

const AWAKE_HEAD = "url('../../static/Pants/Anim/breath-head.apng')";
const BLINK      = "url('../../static/Pants/Anim/blink-overlay.apng')";
const SLEEP_HEAD = "url('../../static/Pants/Anim/breath-head-sleep.apng')";
const SLEEP_EYES = "url('../../static/Pants/Anim/breath-eyes-sleep.apng')";

const TRANS     = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `url('../../static/Pants/Anim/Transition/frame-${String(i).padStart(2, '0')}.png')`);
const TRANS_REV = [...TRANS].reverse();

const FLICK_SEQ = ['01', '02', '03', '02', '01'];
const FLICK_L   = FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/L_${n}.png')`);
const FLICK_R   = FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/R_${n}.png')`);
const FLICK_MS  = 275 / FLICK_SEQ.length;

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

function runTransition(frames, onDone) {
  cancelFlick();
  transitioning = true;
  l8.style.backgroundImage  = 'none';
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = 'none';
  l11.style.backgroundImage = 'none';
  let i = 0;
  (function step() {
    if (i >= frames.length) {
      transitioning = false;
      onDone();
      return;
    }
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
  }), HOLD_MS);
}

pants.addEventListener('click', flickEars);

cycle();
