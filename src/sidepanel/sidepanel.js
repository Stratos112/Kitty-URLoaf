const l7  = document.querySelector('.l7');
const l8  = document.querySelector('.l8');
const l9  = document.querySelector('.l9');
const l10 = document.querySelector('.l10');
const l11 = document.querySelector('.l11');

const HOLD_MS     = 10000;
const FRAME_COUNT = 30;
const FRAME_MS    = 1500 / FRAME_COUNT;

const AWAKE_HEAD  = "url('../../static/Pants/Anim/breath-head.apng')";
const AWAKE_EYES  = "url('../../static/Pants/Anim/breath-eyes.apng')";
const BLINK       = "url('../../static/Pants/Anim/blink-overlay.apng')";
const AWAKE_EAR_L = "url('../../static/Pants/Anim/breath-ear-L.apng')";
const AWAKE_EAR_R = "url('../../static/Pants/Anim/breath-ear-R.apng')";
const SLEEP_HEAD  = "url('../../static/Pants/Anim/breath-head-sleep.apng')";
const SLEEP_EYES  = "url('../../static/Pants/Anim/breath-eyes-sleep.apng')";
const SLEEP_EAR_L = "url('../../static/Pants/Anim/breath-ear-L-sleep.apng')";
const SLEEP_EAR_R = "url('../../static/Pants/Anim/breath-ear-R-sleep.apng')";

const TRANS     = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `url('../../static/Pants/Anim/Transition/frame-${String(i).padStart(2, '0')}.png')`);
const TRANS_REV = [...TRANS].reverse();

const EAR_FLICK_SEQ = ['01','02','03','02','01'];
const EAR_SEQ = {
  L: { awake: EAR_FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/L_awake_${n}.png')`),
       sleep: EAR_FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/L_sleep_${n}.png')`) },
  R: { awake: EAR_FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/R_awake_${n}.png')`),
       sleep: EAR_FLICK_SEQ.map(n => `url('../../static/Pants/Anim/EarFlick/R_sleep_${n}.png')`) },
};
const EAR_FRAME_MS = 55;
const EAR_R_DELAY  = 40;

let sleeping    = false;
let earFlicking = false;

function setAwake() {
  sleeping = false;
  l7.style.backgroundImage  = AWAKE_HEAD;
  l8.style.backgroundImage  = AWAKE_EYES;
  l9.style.backgroundImage  = BLINK;
  l10.style.backgroundImage = AWAKE_EAR_L;
  l11.style.backgroundImage = AWAKE_EAR_R;
}

function setAsleep() {
  sleeping = true;
  l7.style.backgroundImage  = SLEEP_HEAD;
  l8.style.backgroundImage  = SLEEP_EYES;
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = SLEEP_EAR_L;
  l11.style.backgroundImage = SLEEP_EAR_R;
}

function runTransition(frames, onDone) {
  l8.style.backgroundImage  = 'none';
  l9.style.backgroundImage  = 'none';
  l10.style.backgroundImage = 'none'; // ears baked into transition frames on l7
  l11.style.backgroundImage = 'none';
  let i = 0;
  (function step() {
    if (i >= frames.length) { onDone(); return; }
    l7.style.backgroundImage = frames[i++];
    setTimeout(step, FRAME_MS);
  })();
}

function flickEars() {
  if (earFlicking) return;
  earFlicking = true;

  const state    = sleeping ? 'sleep' : 'awake';
  const restoreL = sleeping ? SLEEP_EAR_L : AWAKE_EAR_L;
  const restoreR = sleeping ? SLEEP_EAR_R : AWAKE_EAR_R;

  function runEar(layer, seq, restore, delay) {
    setTimeout(() => {
      let i = 0;
      (function step() {
        if (i >= seq.length) { layer.style.backgroundImage = restore; return; }
        layer.style.backgroundImage = seq[i++];
        setTimeout(step, EAR_FRAME_MS);
      })();
    }, delay);
  }

  runEar(l10, EAR_SEQ.L[state], restoreL, 0);
  runEar(l11, EAR_SEQ.R[state], restoreR, EAR_R_DELAY);

  const total = EAR_FLICK_SEQ.length * EAR_FRAME_MS + EAR_R_DELAY + 100;
  setTimeout(() => { earFlicking = false; }, total);
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
