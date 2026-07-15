const COLORS = ['ff44bb','ff3355','00ccff','aa44ff','ff7722','33dd77','ffcc00','3399ff'];

const PATH = {
  windows: '%APPDATA%\\Mozilla\\Firefox\\Profiles\\',
  macos:   '~/Library/Application Support/Firefox/Profiles/',
  linux:   '~/.mozilla/firefox/'
};

let selectedOS = null;

const track    = document.getElementById('track');
const dots     = [0,1,2,3].map(i => document.getElementById(`d${i}`));
const next1    = document.getElementById('next1');
const dlBtn    = document.getElementById('dlBtn');
const wizard   = document.getElementById('wizard');
const main     = document.getElementById('main');
const tog      = document.getElementById('tog');

function goTo(n) {
  track.style.transform = `translateX(-${n * 300}px)`;
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
}

function showMain()   { wizard.style.display = 'none';  main.style.display = 'block'; }
function showWizard() { wizard.style.display = 'block'; main.style.display = 'none';  }

document.querySelectorAll('.os-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.os-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    selectedOS = btn.dataset.os;
    next1.disabled = false;
  });
});

document.getElementById('next1').addEventListener('click', () => goTo(1));

document.getElementById('back2').addEventListener('click', () => {
  dlBtn.textContent = 'download ↓';
  delete dlBtn.dataset.ready;
  goTo(0);
});

dlBtn.addEventListener('click', () => {
  if (dlBtn.dataset.ready) { renderSteps(); goTo(2); return; }
  downloadCSS();
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
});

document.getElementById('back3').addEventListener('click', () => goTo(1));
document.getElementById('next3').addEventListener('click', () => goTo(3));

document.getElementById('finishBtn').addEventListener('click', () => {
  chrome.storage.local.set({ seenSetup: true });
  showMain();
});

document.getElementById('revisitBtn').addEventListener('click', () => {
  document.querySelectorAll('.os-btn').forEach(b => b.classList.remove('on'));
  dlBtn.textContent = 'download ↓';
  delete dlBtn.dataset.ready;
  next1.disabled = true;
  selectedOS = null;
  goTo(0);
  showWizard();
});

chrome.storage.local.get({ enabled: true }, ({ enabled }) => { tog.checked = enabled; });
tog.addEventListener('change', () => chrome.storage.local.set({ enabled: tog.checked }));

chrome.storage.local.get({ seenSetup: false }, ({ seenSetup }) => {
  seenSetup ? showMain() : showWizard();
});

function renderSteps() {
  const path = PATH[selectedOS];
  const steps = [
    `open <code>about:profiles</code> in the address bar`,
    `your profiles live in <code>${path}</code>`,
    `click <b>Open Directory</b> next to Root Directory`,
    `create a folder named <code>chrome</code> inside it if it doesn't exist`,
    `place <code>userChrome.css</code> inside that <code>chrome</code> folder`,
    `go to <code>about:config</code>, search <code>legacyUserProfileCustomizations</code>, double-click to set it to <b>true</b>`,
  ];
  document.getElementById('steps').innerHTML = steps
    .map((t, i) => `<div class="step"><div class="sn">${i + 1}</div><div>${t}</div></div>`)
    .join('');
}

function svgUri(c) {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E` +
    `%3Crect x='8' y='2' width='4' height='16' rx='1' fill='%23${c}'/%3E` +
    `%3Crect x='2' y='8' width='16' height='4' rx='1' fill='%23${c}'/%3E%3C/svg%3E")`;
}

function generateCSS() {
  const imgs  = COLORS.map(svgUri).join(',\n    ');
  const sizes = COLORS.map(() => '20px 20px').join(', ');
  const pos   = ['0px 0px','20px 0px','10px 20px','30px 20px',
                  '5px 10px','25px 10px','15px 30px','35px 30px'].join(', ');
  const block = (sel) => `${sel} {\n  background-image:\n    ${imgs};\n  background-size: ${sizes};\n  background-repeat: repeat;\n  background-position: ${pos};\n}`;

  return [
    `/* Kitty URLoaf ~ userChrome.css */`,
    `/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */`,
    ``,
    `@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");`,
    ``,
    block(`#navigator-toolbox`),
    ``,
    block(`#sidebar-main,\n.sidebar-launcher,\n#sidebar-box`),
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
