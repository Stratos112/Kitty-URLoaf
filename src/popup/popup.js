const track = document.getElementById('track');
const dots  = [0,1,2,3,4,5].map(i => document.getElementById(`d${i}`));
const dlBtn = document.getElementById('dlBtn');

// ── edition selection ────────────────────────────────────────────────────────

let selectedEdition = 'simple';
const cards  = { simple: document.getElementById('cardSimple'), deluxe: document.getElementById('cardDeluxe') };
const next0  = document.getElementById('next0');

function selectEdition(ed) {
  selectedEdition = ed;
  Object.entries(cards).forEach(([k, el]) => el.classList.toggle('on', k === ed));
  next0.disabled    = ed === 'deluxe';
  next0.textContent = ed === 'deluxe' ? 'coming soon' : 'next →';
  chrome.storage.local.set({ edition: ed });
}

cards.simple.addEventListener('click', () => selectEdition('simple'));
cards.deluxe.addEventListener('click', () => selectEdition('deluxe'));

// ? overlay open/close
[['qSimple','cardSimple'],['qDeluxe','cardDeluxe']].forEach(([qId, cardId]) => {
  document.getElementById(qId).addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById(cardId).classList.add('tip-open');
  });
  document.getElementById(cardId).querySelector('.card-tip').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById(cardId).classList.remove('tip-open');
  });
});

// ── location toggle ──────────────────────────────────────────────────────────

let cssLocation = 'sidebar';
const togs = { sidebar: document.getElementById('togSidebar'), nav: document.getElementById('togNav') };
Object.entries(togs).forEach(([loc, btn]) => btn.addEventListener('click', e => {
  e.stopPropagation();
  cssLocation = loc;
  Object.values(togs).forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  chrome.storage.local.set({ cssLocation: loc });
  delete dlBtn.dataset.ready;
  dlBtn.textContent = 'generate ↓';
}));

// ── navigation ───────────────────────────────────────────────────────────────

function goTo(n, save = true) {
  track.style.transform = `translateX(-${n * 400}px)`;
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
  if (save) chrome.storage.local.set({ wizardPage: n });
}

next0.addEventListener('click', () => goTo(1));

async function triggerDownload() {
  dlBtn.textContent = 'generating…';
  dlBtn.disabled = true;
  await downloadCSS();
  dlBtn.disabled = false;
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
  chrome.storage.local.set({ downloaded: true });
}

dlBtn.addEventListener('click', async () => {
  if (dlBtn.dataset.ready) { renderSteps(); goTo(2); return; }
  triggerDownload();
});

document.getElementById('skipDl').addEventListener('click', () => { renderSteps(); goTo(2); });
document.querySelector('.pants-dl-icon').addEventListener('click', () => triggerDownload());

document.getElementById('back3').addEventListener('click', () => goTo(1));
document.getElementById('next3').addEventListener('click', () => goTo(3));

document.getElementById('back4').addEventListener('click', () => goTo(2));
document.getElementById('next4').addEventListener('click', () => goTo(4));

document.getElementById('back5').addEventListener('click', () => goTo(3));
document.getElementById('next5').addEventListener('click', () => goTo(5));

document.getElementById('startOverBtn').addEventListener('click', () => {
  dlBtn.textContent = 'generate ↓';
  delete dlBtn.dataset.ready;
  chrome.storage.local.set({ wizardPage: 0, downloaded: false });
  track.style.transition = 'none';
  goTo(0, false);
  requestAnimationFrame(() => { track.style.transition = ''; });
});

// ── restore state ────────────────────────────────────────────────────────────

chrome.storage.local.get({ wizardPage: 0, downloaded: false, version: '', cssLocation: 'sidebar', edition: 'simple' }, (data) => {
  cssLocation = data.cssLocation;
  Object.values(togs).forEach(t => t.classList.remove('on'));
  (togs[cssLocation] ?? togs.sidebar).classList.add('on');

  selectEdition(data.edition ?? 'simple');

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
  if (data.wizardPage >= 2) renderSteps();
  track.style.transition = 'none';
  goTo(data.wizardPage, false);
  requestAnimationFrame(() => { track.style.transition = ''; });
});

// ── steps content ────────────────────────────────────────────────────────────

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

// ── generate ─────────────────────────────────────────────────────────────────

function toHex(color) {
  if (Array.isArray(color)) {
    return '#' + color.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  const m = String(color).match(/\d+(\.\d+)?/g);
  if (m?.length >= 3) {
    return '#' + m.slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
  }
  return String(color);
}

async function getThemeBackground() {
  if (typeof browser !== 'undefined' && browser.theme?.getCurrent) {
    try {
      const theme = await browser.theme.getCurrent();
      const c = theme.colors ?? {};
      const color = cssLocation === 'sidebar'
        ? (c.sidebar ?? c.toolbar ?? c.frame)
        : (c.frame  ?? c.toolbar);
      if (color) return toHex(color);
    } catch (e) {}
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? '#2b2a33' : '#f0f0f4';
}

async function generate(css, bgColor) {
  const tokens = [...new Set([...css.matchAll(/PANTS_URI:([^"]+)/g)].map(m => m[1]))];
  const uris   = {};
  await Promise.all(tokens.map(async token => {
    const mime = token.endsWith('.apng') ? 'image/apng' : 'image/png';
    const buf  = await fetch(chrome.runtime.getURL(`static/Pants/${token}`)).then(r => r.arrayBuffer());
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    uris[token] = `data:${mime};base64,${btoa(binary)}`;
  }));
  return css.replace(/PANTS_URI:([^"]+)/g, (_, t) => uris[t]);
}

async function downloadCSS() {
  const file    = cssLocation === 'nav' ? 'userChrome-navbar.css' : 'userChrome-sidebar.css';
  const raw     = await fetch(`../../static/${file}`).then(r => r.text());
  const bgColor = await getThemeBackground();
  const blob    = new Blob([await generate(raw, bgColor)], { type: 'text/css' });
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: 'userChrome.css',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}
