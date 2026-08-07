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
  /* one-shot nod-off / rouse — head+eyes swapped frame-by-frame (see below),
     everything else keeps breathing/flicking normally underneath. These
     used to be their own fall-asleep-*.apng / wake-up-*.apng, but an
     embedded APNG's playback clock in Gecko belongs to the shared image
     decoder, not to whichever CSS keyframe swapped it in — so on a repeat
     visit it could resume mid-loop instead of restarting at frame 0, which
     is what caused the "snaps back to the top mid-transition" glitch.
     TRANS_FRAME_COUNT must match TRANS_FRAMES in .claude/generate-anims.py
     (kept in sync by hand) — each frame is a separate static PNG, and this
     steps through them itself as individual keyframe stops, so the whole
     thing is driven by the one outer CSS clock instead of a second,
     independent one buried inside an image resource.                     */
  const TRANS_FRAME_COUNT = 30;
  const TRANS_REST_PATHS = [
    '../../static/Pants/Anim/tail-flick.apng',
    '../../static/Pants/Anim/breath-rpaw.apng',
    '../../static/Pants/Limbs/right_back_paw.png',
    '../../static/Pants/Anim/breath.apng',
    '../../static/Pants/Limbs/left_front_paw.png',
    '../../static/Pants/Limbs/left_back_paw.png',
  ];
  const TRANS_FRAME_PATHS = Array.from({ length: TRANS_FRAME_COUNT }, (_, i) =>
    `../../static/Pants/Anim/Transition/frame-${String(i).padStart(2, '0')}.png`);

  const ALL_PATHS = [...new Set([...AWAKE_PATHS, ...SLEEP_PATHS, ...TRANS_REST_PATHS, ...TRANS_FRAME_PATHS])];
  const ALL_URIS  = await Promise.all(ALL_PATHS.map(toDataUri));
  const uriByPath = new Map(ALL_PATHS.map((p, i) => [p, ALL_URIS[i]]));
  const W = '182px';
  const H = '133px';
  const imgsFor = paths => paths.map(p => `url("${uriByPath.get(p)}")`).join(', ');
  const imgsForKind = {
    awake:  imgsFor(AWAKE_PATHS),
    asleep: imgsFor(SLEEP_PATHS),
  };
  const transRestImgs  = imgsFor(TRANS_REST_PATHS);
  const transFrameUrls = TRANS_FRAME_PATHS.map(p => `url("${uriByPath.get(p)}")`);
  const transDecl = (frameIdx, posVal) =>
    `background-image: ${transFrameUrls[frameIdx]}, ${transRestImgs}; background-position: ${posVal};`;
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

  /* Each location visit is now itself a sequence: awake, fall asleep, asleep,
     wake up, awake — then Pants hard-cuts to the next location (D → C → A →
     D…), always leaving/arriving on an awake frame so that cut stays a clean
     swap like before. TRANS_SECONDS is just this phase's window length in
     seconds — TRANS_FRAME_COUNT static frames are spread evenly across it
     below, so there's no separate asset duration to keep in sync with here.
     steps(1) makes every keyframe boundary a hard cut on the sprite — she's
     either fully in one phase's pose or the next, never blended between two
     different images. Within a falling/waking phase this cuts through all
     TRANS_FRAME_COUNT static frames one at a time (forward for falling,
     reversed for waking, reusing the same frame set — see generate-anims.py)
     instead of delegating to an embedded animation's own clock.           */
  const HOLD_SECONDS  = 10;   // awake / asleep hold at each end of a visit
  const TRANS_SECONDS = 1.5;  // fall-asleep / wake-up duration — keep in sync, see above
  const LOCATIONS   = ['d', 'c', 'a'];
  const PHASE_KINDS = ['awake', 'falling', 'asleep', 'waking', 'awake'];
  const secondsFor  = kind => (kind === 'falling' || kind === 'waking') ? TRANS_SECONDS : HOLD_SECONDS;

  let cursor = 0;
  const TIMELINE = LOCATIONS.flatMap(loc => PHASE_KINDS.map(kind => {
    const startSec = cursor;
    cursor += secondsFor(kind);
    return { loc, kind, startSec, endSec: cursor };
  }));
  const CYCLE_SECONDS = cursor;
  const toPct = sec => sec / CYCLE_SECONDS * 100;
  const pct   = n => (((n % 100) + 100) % 100).toFixed(4);

  /* CSS vars don't propagate to XUL — inline the data URIs directly per rule.
     Builds one @keyframes per anchor: at every phase boundary in TIMELINE,
     show this anchor's own image for that phase if it's her location this
     phase, else hide her — steps(1) holds each value until the next. A
     falling/waking phase expands into TRANS_FRAME_COUNT sub-points spanning
     its own window instead of a single point.                            */
  const spriteKeyframesTimeline = (name, loc) => {
    const points = [];
    for (const ph of TIMELINE) {
      if (ph.loc !== loc) {
        points.push([toPct(ph.startSec).toFixed(4), `background-image: none;`]);
        continue;
      }
      if (ph.kind === 'falling' || ph.kind === 'waking') {
        const span = ph.endSec - ph.startSec;
        for (let i = 0; i < TRANS_FRAME_COUNT; i++) {
          const frameIdx = ph.kind === 'falling' ? i : (TRANS_FRAME_COUNT - 1 - i);
          const t = ph.startSec + span * i / TRANS_FRAME_COUNT;
          points.push([toPct(t).toFixed(4), transDecl(frameIdx, POS[loc])]);
        }
      } else {
        points.push([toPct(ph.startSec).toFixed(4),
          `background-image: ${imgsForKind[ph.kind]}; background-position: ${POS[loc]};`]);
      }
    }
    points.push(['100.0000', points[0][1]]);
    return [
      `@keyframes ${name} {`,
      ...points.map(([p, decl]) => `  ${p}% { ${decl} }`),
      `}`,
    ].join('\n');
  };

  const kfD = spriteKeyframesTimeline('pants-at-d', 'd');
  const kfC = spriteKeyframesTimeline('pants-at-c', 'c');
  const kfA = spriteKeyframesTimeline('pants-at-a', 'a');

  /* ── smooth margins ─────────────────────────────────────────
     height/width overrides are animated as custom properties, not the
     real properties directly — !important is stripped inside @keyframes,
     and animated values can never beat an !important rule elsewhere in
     the cascade (e.g. Firefox's own chrome CSS). Consuming these via
     var() in a static !important rule outside the keyframes sidesteps
     both problems.
     Registering the property with @property so it eases as a real
     <length> does NOT reliably take effect in userChrome.css — it's a
     privileged/chrome stylesheet, and @property silently not applying
     leaves the property "unregistered", which per spec means it always
     animates with *discrete* interpolation (a single hard jump at the
     ramp's temporal midpoint) no matter what timing function is given.
     That's the snap you were seeing.
     So instead of trusting real interpolation, this hand-builds a
     staircase of RAMP_STEPS discrete jumps per ramp, using the exact
     same steps(1)-hard-cut mechanism the sprite swap already relies on
     (proven to land precisely on its authored percentages) — the value
     at each step follows an ease curve, so enough small steps in a row
     reads as smooth motion even though every individual jump is a cut.
     Each margin ramps open a beat before its visit's sprite appears and
     ramps closed a beat after it disappears, so the room is always
     ready before she's drawn and never collapses out from under her.
     A location's whole visit (awake → falling → asleep → waking → awake)
     is one contiguous block of TIMELINE entries, so each anchor only
     needs a single open window per cycle here — the internal phases
     don't affect the room size at all, only whether she's at this
     location or not.                                                  */
  const C_H    = 143;   // nav-bar / TabsToolbar min-height (px), cat present
  const SIDE_W = 128;   // sidebar-main min-width (px), cat present
  const RAMP_SECONDS = 2;    // how long the open/close ease takes
  const RAMP_STEPS   = 48;   // discrete jumps per ramp — more = smoother (~42ms/step at 2s)
  const RAMP_N = RAMP_SECONDS / CYCLE_SECONDS * 100;
  const easeInOutCubic = t => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const px = n => `${n.toFixed(2)}px`;

  const marginKeyframes = (name, prop, loc, openPx) => {
    const visit  = TIMELINE.filter(ph => ph.loc === loc);
    const start  = toPct(visit[0].startSec);
    const end    = toPct(visit[visit.length - 1].endSec);
    const points = new Map();
    /* seed the loop seam with defaults *before* placing this window's own
       points, so a window that actually touches 0%/100% overwrites the
       default with its real value. The defaults only matter for the
       indirect wraparound case: a window starting at 0% ramps *up* during
       the tail of the previous lap (needs 100% open so 0% of the next lap
       continues seamlessly); a window ending at 100% ramps *down* into the
       head of the next lap (needs 0% open so it has something to ramp
       down from).                                                       */
    points.set('0.0000',   end   >= 99.9999 ? px(openPx) : px(0));
    points.set('100.0000', start <= 0.0001  ? px(openPx) : px(0));
    for (let s = 1; s <= RAMP_STEPS; s++) {
      const t = s / RAMP_STEPS;
      points.set(pct(start - RAMP_N + RAMP_N * t), px(openPx * easeInOutCubic(t)));
      points.set(pct(end + RAMP_N * t),            px(openPx * (1 - easeInOutCubic(t))));
    }
    /* start/end are exact visit boundaries already in [0,100] and must
       NOT go through pct()'s wraparound modulo, which would collapse a
       window ending at exactly 100 down to "0.0000" and silently erase
       its real 100% keyframe.                                          */
    points.set(start.toFixed(4), px(openPx));
    points.set(end.toFixed(4),   px(openPx));

    const sorted = [...points.entries()].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    return [
      `@keyframes ${name} {`,
      ...sorted.map(([p, v]) => `  ${p}% { ${prop}: ${v}; }`),
      `}`,
    ].join('\n');
  };

  const kfDMargin = marginKeyframes('pants-d-w', '--pants-sidebar-w', 'd', SIDE_W);
  const kfCMargin = marginKeyframes('pants-c-h', '--pants-c-h', 'c', C_H);
  const kfAMargin = marginKeyframes('pants-a-h', '--pants-a-h', 'a', C_H);

  const anim = name => `${name} ${CYCLE_SECONDS}s steps(1) infinite`;

  const generatedOn = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, as of build time
  const AUTHORED_ON = 'August 2026'; // tracks the Version line in README.md — bump both together

  return [
    `/**`,
    ` * Pants The Cat. Kitty-URLoaf CSS.`,
    ` * Sky Vercauteren. All Rights Reserved.`,
    ` * Authored ${AUTHORED_ON}`,
    ` * Generated ${generatedOn}`,
    ` */`,
    ``,
    `/* Kitty URLoaf ~ userChrome.css */`,
    `/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */`,
    ``,
    `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`,
    `@namespace html url("http://www.w3.org/1999/xhtml");`,
    ``,
    `/* one Pants, D → C → A, each stop: ${HOLD_SECONDS}s awake → ${TRANS_SECONDS}s fall asleep → ${HOLD_SECONDS}s asleep → ${TRANS_SECONDS}s wake up → ${HOLD_SECONDS}s awake */`,
    kfD,
    ``,
    kfC,
    ``,
    kfA,
    ``,
    `/* room-making margins — ${RAMP_SECONDS}s eased staircase open/close around each stop */`,
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
    `  animation: ${anim('pants-d-w')};`,
    `  min-width: var(--pants-sidebar-w, 0px) !important;`,
    `  max-width: ${px(SIDE_W)} !important;`,
    `}`,
    ``,
    `/* ── C: nav-bar · between back/refresh and home button ─────── */`,
    `#nav-bar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${SIZE};`,
    `  background-repeat:   ${RPT};`,
    `  animation: ${anim('pants-at-c')}, ${anim('pants-c-h')};`,
    `  min-height: var(--pants-c-h, 0px) !important;`,
    `}`,
    ``,
    `/* ── A: TabsToolbar · top-right near minimize button ──────── */`,
    `#TabsToolbar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${SIZE};`,
    `  background-repeat:   ${RPT};`,
    `  animation: ${anim('pants-at-a')}, ${anim('pants-a-h')};`,
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
