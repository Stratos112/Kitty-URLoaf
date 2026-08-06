const track = document.getElementById('track');
const dots  = [0,1,2,3,4].map(i => document.getElementById(`d${i}`));
const dlBtn = document.getElementById('dlBtn');

function goTo(n, save = true) {
  track.style.transform = `translateX(-${n * 300}px)`;
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
  if (save) chrome.storage.local.set({ wizardPage: n });
}

dlBtn.addEventListener('click', () => {
  if (dlBtn.dataset.ready) {
    renderSteps();
    goTo(1);
    return;
  }
  downloadCSS();
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
  chrome.storage.local.set({ downloaded: true });
});

document.getElementById('skipDl').addEventListener('click', () => { renderSteps(); goTo(1); });

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

chrome.storage.local.get({ wizardPage: 0, downloaded: false }, (data) => {
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

function generateCSS() {
  const EXT  = 'moz-extension://urloaf@kitty';
  const IMGS = [
    /* top → bottom z-order: first listed = topmost */
    `${EXT}/static/Pants/Head/Eyes/eyes_open.png`,
    `${EXT}/static/Pants/Head/head_bas8c.png`,
    `${EXT}/static/Pants/Limbs/tail_base.png`,
    `${EXT}/static/Pants/Limbs/right_front_paw.png`,
    `${EXT}/static/Pants/Limbs/right_back_paw.png`,
    `${EXT}/static/Pants/Body/body_basic.png`,
    `${EXT}/static/Pants/Limbs/left_front_paw.png`,
    `${EXT}/static/Pants/Limbs/left_back_paw.png`,
  ];
  const SIZE = '100px';

  return [
    `/* Kitty URLoaf ~ userChrome.css */`,
    `/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */`,
    ``,
    `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`,
    ``,
    `/* Pants lives here — all layers share a 4400×4400 canvas so`,
    `   stacking them at the same size + position makes them overlap. */`,
    `#navigator-toolbox {`,
    `  overflow: visible;`,
    `  position: relative;`,
    `}`,
    ``,
    `#navigator-toolbox::after {`,
    `  content: '';`,
    `  position: absolute;`,
    `  top:  4px;`,
    `  left: 90px;`,
    `  width:  ${SIZE};`,
    `  height: ${SIZE};`,
    `  background-image: ${IMGS.map(u => `url("${u}")`).join(',\n    ')};`,
    `  background-size:     ${IMGS.map(() => `${SIZE} ${SIZE}`).join(', ')};`,
    `  background-repeat:   ${IMGS.map(() => 'no-repeat').join(', ')};`,
    `  background-position: ${IMGS.map(() => '0 0').join(', ')};`,
    `  pointer-events: none;`,
    `  z-index: 9999;`,
    `}`,
  ].join('\n');
}

function downloadCSS() {
  const blob = new Blob([generateCSS()], { type: 'text/css' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'userChrome.css'
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
