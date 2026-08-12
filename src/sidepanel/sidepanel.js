const l7  = document.querySelector('.l7');
const l8  = document.querySelector('.l8');
const l9  = document.querySelector('.l9');
const l10 = document.querySelector('.l10');
const l11 = document.querySelector('.l11');

const HOLD_MS     = 10000;
const FRAME_COUNT = 30;
const FRAME_MS    = 1500 / FRAME_COUNT;

const AWAKE_HEAD = "url('../../static/Pants/Anim/breath-head.apng')";
const AWAKE_EYES = "url('../../static/Pants/Anim/breath-eyes.apng')";
const BLINK      = "url('../../static/Pants/Anim/blink-overlay.apng')";
const SLEEP_HEAD = "url('../../static/Pants/Anim/breath-head-sleep.apng')";
const SLEEP_EYES = "url('../../static/Pants/Anim/breath-eyes-sleep.apng')";

const TRANS     = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `url('../../static/Pants/Anim/Transition/frame-${String(i).padStart(2, '0')}.png')`);
const TRANS_REV = [...TRANS].reverse();

const EAR_BASE_L = "url('../../static/Pants/Head/L_ear_0(base).png')";
const EAR_BASE_R = "url('../../static/Pants/Head/R_ear_0(base).png')";
const EAR_SEQ_L  = ['01','02','03','02','01'].map(n => `url('../../static/Pants/Head/Ears/L_ear_${n}.png')`);
const EAR_SEQ_R  = ['01','02','03','02','01'].map(n => `url('../../static/Pants/Head/Ears/R_ear_${n}.png')`);
const EAR_FRAME_MS = 55;
const EAR_R_DELAY  = 40; // right ear starts slightly after left

let earFlicking = false;

function flickEars() {
  if (earFlicking) return;
  earFlicking = true;

  function runEar(layer, seq, base, delay) {
    setTimeout(() => {
      let i = 0;
      (function step() {
        if (i >= seq.length) { layer.style.backgroundImage = base; return; }
        layer.style.backgroundImage = seq[i++];
        setTimeout(step, EAR_FRAME_MS);
      })();
    }, delay);
  }

  runEar(l10, EAR_SEQ_L, EAR_BASE_L, 0);
  runEar(l11, EAR_SEQ_R, EAR_BASE_R, EAR_R_DELAY);

  const total = EAR_SEQ_L.length * EAR_FRAME_MS + EAR_R_DELAY + 100;
  setTimeout(() => { earFlicking = false; }, total);
}

function setAwake()  {
  l7.style.backgroundImage  = AWAKE_HEAD;
  l8.style.backgroundImage  = AWAKE_EYES;
  l9.style.backgroundImage  = BLINK;
  l10.style.backgroundImage = EAR_BASE_L;
  l11.style.backgroundImage = EAR_BASE_R;
}

function setAsleep() {
  l7.style.backgroundImage  = SLEEP_HEAD;
  l8.style.backgroundImage  = SLEEP_EYES;
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = EAR_BASE_L;
  l11.style.backgroundImage = EAR_BASE_R;
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

document.getElementById('pants').addEventListener('click', flickEars);

cycle();
