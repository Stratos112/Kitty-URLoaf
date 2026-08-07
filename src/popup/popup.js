const track = document.getElementById('track');
const dots  = [0,1,2,3,4].map(i => document.getElementById(`d${i}`));
const dlBtn = document.getElementById('dlBtn');

function goTo(n, save = true) {
  track.style.transform = `translateX(-${n * 300}px)`;
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
  if (save) chrome.storage.local.set({ wizardPage: n });
}

dlBtn.addEventListener('click', async () => {
  if (dlBtn.dataset.ready) {
    renderSteps();
    goTo(1);
    return;
  }
  dlBtn.disabled = true;
  dlBtn.textContent = 'building…';
  await downloadCSS();
  dlBtn.disabled = false;
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
  chrome.storage.local.set({ downloaded: true });
});

document.getElementById('skipDl').addEventListener('click', () => { renderSteps(); goTo(1); });
document.querySelector('.pants-dl-icon').addEventListener('click', async () => {
  if (dlBtn.disabled) return;
  const icon = document.querySelector('.pants-dl-icon');
  icon.style.opacity = '0.5';
  dlBtn.disabled = true;
  dlBtn.textContent = 'building…';
  await downloadCSS();
  icon.style.opacity = '';
  dlBtn.disabled = false;
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
  chrome.storage.local.set({ downloaded: true });
});

document.getElementById('back3').addEventListener('click', () => goTo(0));
document.getElementById('next3').addEventListener('click', () => goTo(2));

document.getElementById('back4').addEventListener('click', () => goTo(1));
document.getElementById('next4').addEventListener('click', () => goTo(3));

document.getElementById('back5').addEventListener('click', () => goTo(2));
document.getElementById('next5').addEventListener('click', () => goTo(4));

document.getElementById('startOverBtn').addEventListener('click', () => {
  dlBtn.textContent = 'download ↓';
  delete dlBtn.dataset.ready;
  chrome.storage.local.set({ wizardPage: 0, downloaded: false });
  track.style.transition = 'none';
  goTo(0, false);
  requestAnimationFrame(() => { track.style.transition = ''; });
});

chrome.storage.local.get({ wizardPage: 0, downloaded: false, version: '' }, (data) => {
  const currentVersion = chrome.runtime.getManifest().version;
  if (data.version !== currentVersion) {
    chrome.storage.local.set({ wizardPage: 0, downloaded: false, version: currentVersion });
    data.wizardPage = 0;
    data.downloaded = false;
  }
  if (data.downloaded) {
    dlBtn.textContent = 'next →';
    dlBtn.dataset.ready = '1';
  }
  if (data.wizardPage >= 1) renderSteps();
  track.style.transition = 'none';
  goTo(data.wizardPage, false);
  requestAnimationFrame(() => { track.style.transition = ''; });
});

function renderSteps() {
  const steps = [
    `type <code>about:profiles</code> in your Firefox address bar and press Enter`,
    `find the profile marked <b>This is the profile in use</b> — there may be several listed`,
    `under that profile, look for the <b>Root Directory</b> row — the path next to it is your profile folder`,
    `click <b>Open Directory</b> next to Root Directory`,
    `in the window that opens, create a new folder named <code>chrome</code>`,
    `place <code>userChrome.css</code> into that <code>chrome</code> folder`,
    `type <code>about:config</code> in your Firefox address bar`,
    `search <code>LegacyUserProfile</code>`,
    `double-click the result to set it to <b>true</b>`,
  ];
  const row = t => `<div class="bullet"><span class="bdot">•</span><div>${t}</div></div>`;
  document.getElementById('steps-a').innerHTML = steps.slice(0, 3).map(row).join('');
  document.getElementById('steps-b').innerHTML = steps.slice(3, 6).map(row).join('');
  document.getElementById('steps-c').innerHTML = steps.slice(6).map(row).join('');
}

async function toDataUri(path) {
  const blob = await fetch(path).then(r => r.blob());
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function generateCSS() {
  /* top → bottom z-order: first listed = topmost */
  const AWAKE_PATHS = [
    '../../static/Pants/Anim/blink-overlay.apng',  // transparent hold; blink on head backing
    '../../static/Pants/Anim/breath-eyes.apng',    // eyes_open, same shifts/delays as head
    '../../static/Pants/Anim/breath-head.apng',    // head only, bobs with breath
    '../../static/Pants/Anim/tail-flick.apng',
    '../../static/Pants/Anim/breath-rpaw.apng',    // right paw, 1px bob, 2 frames behind
    '../../static/Pants/Limbs/right_back_paw.png',
    '../../static/Pants/Anim/breath.apng',
    '../../static/Pants/Limbs/left_front_paw.png',
    '../../static/Pants/Limbs/left_back_paw.png',
  ];
  const SLEEP_PATHS = [
    /* no blink-overlay — eyes just stay shut */
    '../../static/Pants/Anim/breath-eyes-sleep.apng', // eyes_closed, dropped + bobs with breath
    '../../static/Pants/Anim/breath-head-sleep.apng', // head dropped, bobs with breath
    '../../static/Pants/Anim/tail-flick.apng',
    '../../static/Pants/Anim/breath-rpaw.apng',
    '../../static/Pants/Limbs/right_back_paw.png',
    '../../static/Pants/Anim/breath.apng',
    '../../static/Pants/Limbs/left_front_paw.png',
    '../../static/Pants/Limbs/left_back_paw.png',
  ];

  const ALL_PATHS = [...new Set([...AWAKE_PATHS, ...SLEEP_PATHS])];
  const ALL_URIS  = await Promise.all(ALL_PATHS.map(toDataUri));
  const uriByPath = new Map(ALL_PATHS.map((p, i) => [p, ALL_URIS[i]]));
  const W = '182px';
  const H = '133px';
  const imgsFor = paths => paths.map(p => `url("${uriByPath.get(p)}")`).join(', ');
  const awakeImgs = imgsFor(AWAKE_PATHS);
  const sleepImgs = imgsFor(SLEEP_PATHS);
  /* every layer shares the same size/repeat, so one value covers however
     many background-image layers are actually listed (CSS repeats a
     shorter multi-value property to match the longest one) */
  const SIZE = `${W} ${H}`;
  const RPT  = 'no-repeat';

  const POS = {
    d: 'left bottom',
    c: 'left 142px center',
    a: 'right 170px center',
  };

  /* Pants cycles D → C → A awake, then D → C → A asleep, then repeats.
     STOP_SECONDS controls how long she lingers at each stop.
     steps(1) makes every keyframe boundary a hard cut on the sprite —
     she's either fully "there" or fully gone, never mid-fade/mid-slide.
     The room-making margins run on a *separate* ease-in-out animation
     (see below) so they open/close smoothly instead of snapping.      */
  const STOPS = ['d-awake', 'c-awake', 'a-awake', 'd-sleep', 'c-sleep', 'a-sleep'];
  const STOP_SECONDS  = 30;
  const CYCLE_SECONDS = STOP_SECONDS * STOPS.length;
  const STOP_PCT      = 100 / STOPS.length;
  const pct = n => (((n % 100) + 100) % 100).toFixed(4);

  /* CSS vars don't propagate to XUL — inline the data URIs directly per rule.
     declByStop(stop) returns this element's declaration for a given stop
     (or null if it should be hidden that stop); steps(1) makes each stop
     a hard cut, holding from its own keyframe until the next one.       */
  const spriteKeyframes = (name, declByStop) => {
    const points = STOPS.map((s, i) => [pct(i * STOP_PCT), declByStop(s) ?? 'background-image: none;']);
    points.push(['100.0000', points[0][1]]);
    return [
      `@keyframes ${name} {`,
      ...points.map(([p, decl]) => `  ${p}% { ${decl} }`),
      `}`,
    ].join('\n');
  };

  const kfD = spriteKeyframes('pants-at-d', s =>
    s === 'd-awake' ? `background-image: ${awakeImgs}; background-position: ${POS.d};` :
    s === 'd-sleep' ? `background-image: ${sleepImgs}; background-position: ${POS.d};` : null);
  const kfC = spriteKeyframes('pants-at-c', s =>
    s === 'c-awake' ? `background-image: ${awakeImgs}; background-position: ${POS.c};` :
    s === 'c-sleep' ? `background-image: ${sleepImgs}; background-position: ${POS.c};` : null);
  const kfA = spriteKeyframes('pants-at-a', s =>
    s === 'a-awake' ? `background-image: ${awakeImgs}; background-position: ${POS.a};` :
    s === 'a-sleep' ? `background-image: ${sleepImgs}; background-position: ${POS.a};` : null);

  /* ── smooth margins ─────────────────────────────────────────
     height/width overrides are animated as custom properties, not the
     real properties directly — !important is stripped inside @keyframes,
     and animated values can never beat an !important rule elsewhere in
     the cascade (e.g. Firefox's own chrome CSS). Consuming these via
     var() in a static !important rule outside the keyframes sidesteps
     both problems, and using 0px (not `unset`) as the "closed" value
     keeps both ends of the tween numeric so it actually eases instead
     of snapping halfway through.
     Each margin ramps open a beat before its stop's sprite appears and
     ramps closed a beat after it disappears, so the room is always
     ready before she's drawn and never collapses out from under her.
     An anchor now has *two* windows per cycle (its awake stop and its
     sleep stop), so this builds the point list generically instead of
     hand-deriving each percentage.                                    */
  const C_H    = '143px';   // nav-bar / TabsToolbar min-height, cat present
  const SIDE_W = '128px';   // sidebar-main min-width, cat present
  const RAMP_SECONDS = 2;   // how long the open/close ease takes
  const RAMP_N = RAMP_SECONDS / CYCLE_SECONDS * 100;

  const marginKeyframes = (name, prop, stopIndices, openVal) => {
    const points = new Map();
    /* seed the loop seam with defaults *before* placing each window's own
       points, so a window that actually touches 0%/100% overwrites the
       default with its real value. The defaults only matter for the
       indirect wraparound case: a window starting at stop 0 ramps *up*
       during the tail of the previous lap (needs 100% open so 0% of the
       next lap continues seamlessly); a window ending at the last stop
       ramps *down* into the head of the next lap (needs 0% open so it
       has something to ramp down from). Getting these two backwards, or
       letting them clobber a window's real boundary value, is exactly
       what makes the wrap point snap instead of ease.                  */
    points.set('0.0000',   stopIndices.includes(STOPS.length - 1) ? openVal : '0px');
    points.set('100.0000', stopIndices.includes(0)                ? openVal : '0px');
    for (const i of stopIndices) {
      const start = i * STOP_PCT;
      const end   = (i + 1) * STOP_PCT;
      /* only the ramp offsets can legitimately fall outside [0, 100] and
         need wrapping — start/end are exact stop boundaries already in
         range, and must NOT go through pct()'s wraparound modulo, which
         would collapse a window ending at exactly 100 down to "0.0000"
         and silently erase its real 100% keyframe.                     */
      points.set(pct(start - RAMP_N), '0px');
      points.set(start.toFixed(4), openVal);
      points.set(end.toFixed(4), openVal);
      points.set(pct(end + RAMP_N), '0px');
    }

    const sorted = [...points.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    return [
      `@keyframes ${name} {`,
      ...sorted.map(([p, v]) => `  ${p}% { ${prop}: ${v}; }`),
      `}`,
    ].join('\n');
  };

  const stopsFor = prefix => STOPS.reduce((acc, s, i) => (s.startsWith(prefix) ? [...acc, i] : acc), []);
  const kfDMargin = marginKeyframes('pants-d-w', '--pants-sidebar-w', stopsFor('d-'), SIDE_W);
  const kfCMargin = marginKeyframes('pants-c-h', '--pants-c-h', stopsFor('c-'), C_H);
  const kfAMargin = marginKeyframes('pants-a-h', '--pants-a-h', stopsFor('a-'), C_H);

  const anim     = name => `${name} ${CYCLE_SECONDS}s steps(1) infinite`;
  const animEase = name => `${name} ${CYCLE_SECONDS}s ease-in-out infinite`;

  /* unregistered custom properties always animate with *discrete*
     interpolation (a hard jump partway through) no matter what timing
     function you give them — @property tells the engine these three
     hold a <length>, which is what actually lets ease-in-out tween them
     smoothly instead of snapping.                                     */
  const registerLength = name => [
    `@property ${name} {`,
    `  syntax: '<length>';`,
    `  inherits: false;`,
    `  initial-value: 0px;`,
    `}`,
  ].join('\n');

  return [
    `/* Kitty URLoaf ~ userChrome.css */`,
    `/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */`,
    ``,
    `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`,
    `@namespace html url("http://www.w3.org/1999/xhtml");`,
    ``,
    registerLength('--pants-c-h'),
    registerLength('--pants-a-h'),
    registerLength('--pants-sidebar-w'),
    ``,
    `/* one Pants, cycling D → C → A awake then D → C → A asleep, ${STOP_SECONDS}s per stop */`,
    kfD,
    ``,
    kfC,
    ``,
    kfA,
    ``,
    `/* room-making margins — ${RAMP_SECONDS}s ease open/close around each stop */`,
    kfDMargin,
    ``,
    kfCMargin,
    ``,
    kfAMargin,
    ``,
    `/* ── D: sidebar icon strip ───────────────────────────────── */`,
    `#browser { overflow: visible !important; }`,
    `#sidebar-container {`,
    `  overflow: visible !important;`,
    `  background-size:     ${SIZE};`,
    `  background-repeat:   ${RPT};`,
    `  animation: ${anim('pants-at-d')};`,
    `}`,
    `/* squeeze the icon launcher strip back to normal when she's not here */`,
    `html|sidebar-main {`,
    `  animation: ${animEase('pants-d-w')};`,
    `  min-width: var(--pants-sidebar-w, 0px) !important;`,
    `  max-width: ${SIDE_W} !important;`,
    `}`,
    ``,
    `/* ── C: nav-bar · between back/refresh and home button ─────── */`,
    `#nav-bar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${SIZE};`,
    `  background-repeat:   ${RPT};`,
    `  animation: ${anim('pants-at-c')}, ${animEase('pants-c-h')};`,
    `  min-height: var(--pants-c-h, 0px) !important;`,
    `}`,
    ``,
    `/* ── A: TabsToolbar · top-right near minimize button ──────── */`,
    `#TabsToolbar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${SIZE};`,
    `  background-repeat:   ${RPT};`,
    `  animation: ${anim('pants-at-a')}, ${animEase('pants-a-h')};`,
    `  min-height: var(--pants-a-h, 0px) !important;`,
    `}`,
  ].join('\n');
}

async function downloadCSS() {
  const blob = new Blob([await generateCSS()], { type: 'text/css' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'userChrome.css'
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
