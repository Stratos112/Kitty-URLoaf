const PATH = {
  windows: '%APPDATA%\\Mozilla\\Firefox\\Profiles\\',
  macos:   '~/Library/Application Support/Firefox/Profiles/',
  linux:   '~/.mozilla/firefox/'
};

let selectedOS = null;

const track = document.getElementById('track');
const dots  = [0,1,2,3].map(i => document.getElementById(`d${i}`));
const next1 = document.getElementById('next1');
const dlBtn = document.getElementById('dlBtn');

function goTo(n, save = true) {
  track.style.transform = `translateX(-${n * 300}px)`;
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
  if (save) chrome.storage.local.set({ wizardPage: n });
}

document.querySelectorAll('.os-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.os-btn').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    selectedOS = btn.dataset.os;
    next1.disabled = false;
    chrome.storage.local.set({ selectedOS });
  });
});

next1.addEventListener('click', () => goTo(1));

document.getElementById('back2').addEventListener('click', () => goTo(0));

dlBtn.addEventListener('click', () => {
  if (dlBtn.dataset.ready) {
    renderSteps();
    goTo(2);
    return;
  }
  downloadCSS();
  dlBtn.textContent = 'next →';
  dlBtn.dataset.ready = '1';
  chrome.storage.local.set({ downloaded: true });
});

document.getElementById('back3').addEventListener('click', () => goTo(1));
document.getElementById('next3').addEventListener('click', () => goTo(3));

document.getElementById('startOverBtn').addEventListener('click', () => {
  document.querySelectorAll('.os-btn').forEach(b => b.classList.remove('on'));
  dlBtn.textContent = 'download ↓';
  delete dlBtn.dataset.ready;
  next1.disabled = true;
  selectedOS = null;
  chrome.storage.local.set({ wizardPage: 0, selectedOS: null, downloaded: false });
  track.style.transition = 'none';
  goTo(0, false);
  requestAnimationFrame(() => { track.style.transition = ''; });
});

chrome.storage.local.get(
  { wizardPage: 0, downloaded: false, selectedOS: null },
  (data) => {
    selectedOS = data.selectedOS;

    if (selectedOS) {
      document.querySelector(`[data-os="${selectedOS}"]`)?.classList.add('on');
      next1.disabled = false;
    }

    if (data.downloaded) {
      dlBtn.textContent = 'next →';
      dlBtn.dataset.ready = '1';
    }

    if (data.wizardPage >= 2 && selectedOS) renderSteps();

    track.style.transition = 'none';
    goTo(data.wizardPage, false);
    requestAnimationFrame(() => { track.style.transition = ''; });
  }
);

function renderSteps() {
  const steps = [
    `open <button class="lnk" id="profLink">about:profiles</button> in the address bar`,
    `your profiles live in <code>${PATH[selectedOS]}</code>`,
    `click <b>Open Directory</b> next to Root Directory`,
    `create a folder named <code>chrome</code> inside it if one doesn't exist`,
    `place <code>userChrome.css</code> into that <code>chrome</code> folder`,
    `open <button class="lnk" id="cfgLink">about:config</button>, then type <code>LegacyUserProfile</code> in the search bar at the top — double-click the result to set it to <b>true</b>`,
  ];
  document.getElementById('steps').innerHTML = steps
    .map((t, i) => `<div class="step"><div class="sn">${i + 1}</div><div>${t}</div></div>`)
    .join('');
  document.getElementById('profLink')?.addEventListener('click', () => chrome.tabs.create({ url: 'about:profiles' }));
  document.getElementById('cfgLink')?.addEventListener('click',  () => chrome.tabs.create({ url: 'about:config' }));
}

function svgUri(c) {
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E` +
    `%3Crect x='8' y='2' width='4' height='16' rx='1' fill='%23${c}'/%3E` +
    `%3Crect x='2' y='8' width='16' height='4' rx='1' fill='%23${c}'/%3E%3C/svg%3E")`;
}

function generateCSS() {
  const COLORS = ['ff44bb','ff3355','00ccff','aa44ff','ff7722','33dd77','ffcc00','3399ff'];
  const imgs  = COLORS.map(svgUri).join(',\n    ');
  const sizes = COLORS.map(() => '20px 20px').join(', ');
  const pos   = ['0px 0px','20px 0px','10px 20px','30px 20px',
                  '5px 10px','25px 10px','15px 30px','35px 30px'].join(', ');
  const block = sel =>
    `${sel} {\n  background-image:\n    ${imgs};\n  background-size: ${sizes};\n  background-repeat: repeat;\n  background-position: ${pos};\n}`;
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
