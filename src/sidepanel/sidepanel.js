const l7 = document.querySelector('.l7');
const l8 = document.querySelector('.l8');
const l9 = document.querySelector('.l9');

const HOLD_MS     = 10000;
const FRAME_COUNT = 30;
const FRAME_MS    = 1500 / FRAME_COUNT;

const AWAKE_HEAD = "url('../../static/Pants/Anim/breath-head.apng')";
const AWAKE_EYES = "url('../../static/Pants/Anim/breath-eyes.apng')";
const BLINK      = "url('../../static/Pants/Anim/blink-overlay.apng')";
const SLEEP_HEAD = "url('../../static/Pants/Anim/breath-head-sleep.apng')";
const SLEEP_EYES = "url('../../static/Pants/Anim/breath-eyes-sleep.apng')";

const TRANS = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `url('../../static/Pants/Anim/Transition/frame-${String(i).padStart(2, '0')}.png')`);
const TRANS_REV = [...TRANS].reverse();

function setAwake()  {
  l7.style.backgroundImage = AWAKE_HEAD;
  l8.style.backgroundImage = AWAKE_EYES;
  l9.style.backgroundImage = BLINK;
}

function setAsleep() {
  l7.style.backgroundImage = SLEEP_HEAD;
  l8.style.backgroundImage = SLEEP_EYES;
  l9.style.backgroundImage = 'none';
}

function runTransition(frames, onDone) {
  l8.style.backgroundImage = 'none';
  l9.style.backgroundImage = 'none';
  let i = 0;
  (function step() {
    if (i >= frames.length) { onDone(); return; }
    l7.style.backgroundImage = frames[i++];
    setTimeout(step, FRAME_MS);
  })();
}

function cycle() {
  setAwake();
  setTimeout(() => runTransition(TRANS, () => {
    setAsleep();
    setTimeout(() => runTransition(TRANS_REV, cycle), HOLD_MS);
  }), HOLD_MS);
}

cycle();
