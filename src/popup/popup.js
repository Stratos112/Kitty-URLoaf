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
  const PATHS = [
    /* top → bottom z-order: first listed = topmost */
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

  const uris  = await Promise.all(PATHS.map(toDataUri));
  const N     = PATHS.length;
  const W     = '182px';
  const H     = '133px';
  const imgs  = uris.map(u => `url("${u}")`).join(', ');
  const sizes = Array(N).fill(`${W} ${H}`).join(', ');
  const rpts  = Array(N).fill('no-repeat').join(', ');

  /* Pants cycles D → C → A → D, one cat, one spot at a time.
     STOP_SECONDS controls how long she lingers at each stop.
     steps(1) makes every keyframe boundary a hard cut — she's either
     fully "there" or fully gone, never mid-fade/mid-slide.          */
  const STOP_SECONDS  = 30;
  const CYCLE_SECONDS = STOP_SECONDS * 3;
  const THIRD    = (100 / 3).toFixed(4);
  const TWOTHIRD = (200 / 3).toFixed(4);
  const TALL     = '143px';

  const POS = {
    d: 'left bottom',
    c: 'left 142px center',
    a: 'right 170px center',
  };

  /* CSS vars don't propagate to XUL — inline the data URIs directly per rule */
  const cycle = (name, activeAt, activeDecl, inactiveDecl) => [
    `@keyframes ${name} {`,
    `  0%           { ${activeAt === 'd' ? activeDecl : inactiveDecl} }`,
    `  ${THIRD}%    { ${activeAt === 'c' ? activeDecl : inactiveDecl} }`,
    `  ${TWOTHIRD}% { ${activeAt === 'a' ? activeDecl : inactiveDecl} }`,
    `  100%         { ${activeAt === 'd' ? activeDecl : inactiveDecl} }`,
    `}`,
  ].join('\n');

  /* height/width overrides are animated as custom properties, not the
     real properties directly — !important is stripped inside @keyframes,
     and animated values can never beat an !important rule elsewhere in
     the cascade (e.g. Firefox's own chrome CSS). Consuming these via
     var() in a static !important rule outside the keyframes sidesteps
     both problems.                                                    */
  const kfD = cycle('pants-at-d', 'd',
    `background-image: ${imgs}; background-position: ${POS.d};`,
    `background-image: none;`);
  const kfC = cycle('pants-at-c', 'c',
    `background-image: ${imgs}; background-position: ${POS.c}; --pants-c-h: ${TALL};`,
    `background-image: none; --pants-c-h: unset;`);
  const kfA = cycle('pants-at-a', 'a',
    `background-image: ${imgs}; background-position: ${POS.a}; --pants-a-h: ${TALL};`,
    `background-image: none; --pants-a-h: unset;`);
  const kfSidebar = cycle('pants-sidebar-width', 'd',
    `--pants-sidebar-w: 128px;`,
    `--pants-sidebar-w: unset;`);

  const anim = name => `${name} ${CYCLE_SECONDS}s steps(1) infinite`;

  return [
    `/* Kitty URLoaf ~ userChrome.css */`,
    `/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */`,
    ``,
    `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`,
    `@namespace html url("http://www.w3.org/1999/xhtml");`,
    ``,
    `/* one Pants, cycling D → C → A → D, ${STOP_SECONDS}s per stop */`,
    kfD,
    ``,
    kfC,
    ``,
    kfA,
    ``,
    kfSidebar,
    ``,
    `/* ── D: sidebar icon strip ───────────────────────────────── */`,
    `#browser { overflow: visible !important; }`,
    `#sidebar-container {`,
    `  overflow: visible !important;`,
    `  background-size:     ${sizes};`,
    `  background-repeat:   ${rpts};`,
    `  animation: ${anim('pants-at-d')};`,
    `}`,
    `/* squeeze the icon launcher strip back to normal when she's not here */`,
    `html|sidebar-main {`,
    `  animation: ${anim('pants-sidebar-width')};`,
    `  min-width: var(--pants-sidebar-w, unset) !important;`,
    `  max-width: var(--pants-sidebar-w, unset) !important;`,
    `}`,
    ``,
    `/* ── C: nav-bar · between back/refresh and home button ─────── */`,
    `#nav-bar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${sizes};`,
    `  background-repeat:   ${rpts};`,
    `  animation: ${anim('pants-at-c')};`,
    `  height: var(--pants-c-h, unset) !important;`,
    `  min-height: var(--pants-c-h, unset) !important;`,
    `}`,
    ``,
    `/* ── A: TabsToolbar · top-right near minimize button ──────── */`,
    `#TabsToolbar {`,
    `  overflow: visible !important;`,
    `  background-size:     ${sizes};`,
    `  background-repeat:   ${rpts};`,
    `  animation: ${anim('pants-at-a')};`,
    `  height: var(--pants-a-h, unset) !important;`,
    `  min-height: var(--pants-a-h, unset) !important;`,
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
